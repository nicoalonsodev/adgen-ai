import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { uploadCreativeImages } from '@/services/images/imageStorageService'

// POST — guardar un creativo (sube original + thumbnail a Storage + inserta en DB)
export async function POST(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id ?? null
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      imageDataUrl,  // legacy: data URL completa  (data:image/png;base64,...)
      imageBase64,   // nuevo: solo el base64 sin prefijo
      templateId,
      angleName,
      copyData,      // { product, offer, audience, problem, tone, creationMode, copy, slideRole, slideNumber }
      name,
    } = body

    if ((!imageDataUrl && !imageBase64) || !templateId) {
      return NextResponse.json(
        { success: false, error: 'imageBase64 y templateId son requeridos' },
        { status: 400 }
      )
    }

    // 1. Obtener el base64 puro (compatible con ambos formatos)
    const base64 = imageBase64 ?? imageDataUrl?.split(',')[1]
    if (!base64) {
      return NextResponse.json({ success: false, error: 'Imagen inválida' }, { status: 400 })
    }
    const buffer = Buffer.from(base64, 'base64')

    // 2. Generar UUID antes de subir para usar como carpeta en Storage
    const creativeId = randomUUID()

    const creativeName =
      name ??
      [copyData?.product, angleName ?? templateId]
        .filter(Boolean)
        .join(' — ')

    // 3. Subir original + thumbnail usando el creativeId como carpeta
    const { originalUrl, originalPath, thumbnailUrl, thumbnailPath, width, height } =
      await uploadCreativeImages(userId, creativeId, buffer)

    // 4. Insertar registro completo en un solo INSERT
    const { data: insertedRow, error: insertError } = await supabaseAdmin
      .from('creatives')
      .insert({
        id: creativeId,
        user_id: userId,
        name: creativeName,
        template_id: templateId,
        angle: angleName ?? null,
        image_url: originalUrl,
        image_storage_path: originalPath,
        thumbnail_url: thumbnailUrl,
        thumbnail_path: thumbnailPath,
        image_width: width,
        image_height: height,
        copy_data: copyData ?? null,
        status: 'completed',
      })
      .select('id')
      .single()

    if (insertError) throw new Error(`DB error (insert): ${insertError.message}`)

    return NextResponse.json({ success: true, data: { id: insertedRow.id, imageUrl: originalUrl, thumbnailUrl } })
  } catch (err) {
    console.error('[POST /api/user/creatives]', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error guardando creativo' },
      { status: 500 }
    )
  }
}

// GET — listar creativos del usuario (para futura galería)
export async function GET(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id ?? null
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const { data, error } = await supabaseAdmin
    .from('creatives')
    .select('id, name, template_id, angle, image_url, thumbnail_url, copy_data, is_favorite, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
