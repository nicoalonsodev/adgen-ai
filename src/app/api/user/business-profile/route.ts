import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { encryptValue, decryptValue, maskKey } from '@/lib/crypto'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('user_business_profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (!data) return Response.json({ data: null })

  const { gemini_keys_encrypted, ...rest } = data

  let geminiFields: {
    has_gemini_keys: boolean
    gemini_key1_masked?: string
    gemini_key2_masked?: string
  } = { has_gemini_keys: false }

  if (gemini_keys_encrypted) {
    try {
      const parsed = JSON.parse(decryptValue(gemini_keys_encrypted)) as { key1?: string; key2?: string }
      geminiFields = {
        has_gemini_keys: true,
        ...(parsed.key1 ? { gemini_key1_masked: maskKey(parsed.key1) } : {}),
        ...(parsed.key2 ? { gemini_key2_masked: maskKey(parsed.key2) } : {}),
      }
    } catch {
      geminiFields = { has_gemini_keys: false }
    }
  }

  return Response.json({ data: { ...rest, ...geminiFields } })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const isRealKey = (v: unknown): v is string =>
    typeof v === 'string' && v.length > 10 && !v.startsWith('...')

  const newKey1 = isRealKey(body.geminiKey1) ? body.geminiKey1 : null
  const newKey2 = isRealKey(body.geminiKey2) ? body.geminiKey2 : null
  const savingKeys = newKey1 !== null || newKey2 !== null

  let geminiKeyFields: { gemini_keys_encrypted?: string; gemini_key_index?: number } = {}

  if (savingKeys) {
    // Fetch existing encrypted keys to merge
    const { data: existing } = await supabaseAdmin
      .from('user_business_profiles')
      .select('gemini_keys_encrypted')
      .eq('user_id', session.user.id)
      .single()

    let existingKey1: string | undefined
    let existingKey2: string | undefined

    if (existing?.gemini_keys_encrypted) {
      try {
        const parsed = JSON.parse(decryptValue(existing.gemini_keys_encrypted)) as { key1?: string; key2?: string }
        existingKey1 = parsed.key1
        existingKey2 = parsed.key2
      } catch {
        // Ignore — treat as no existing keys
      }
    }

    const merged: { key1?: string; key2?: string } = {
      ...(newKey1 ?? existingKey1 ? { key1: newKey1 ?? existingKey1 } : {}),
      ...(newKey2 ?? existingKey2 ? { key2: newKey2 ?? existingKey2 } : {}),
    }

    geminiKeyFields = {
      gemini_keys_encrypted: encryptValue(JSON.stringify(merged)),
      gemini_key_index: 0,
    }
  }

  const payload = {
    user_id: session.user.id,
    business_name: body.nombre ?? '',
    product_category: body.category ?? null,
    target_audience: body.clienteIdeal ?? null,
    business_description: body.queVendes ?? null,
    tone: body.tonos?.[0] ?? 'professional',
    logo_url: body.logoBase64
      ? `data:${body.logoMimeType ?? 'image/png'};base64,${body.logoBase64}`
      : null,
    metadata: {
      rubro: body.rubro,
      sitioWeb: body.sitioWeb,
      diferenciacion: body.diferenciacion,
      propuestaUnica: body.propuestaUnica,
      dolores: body.dolores,
      motivadores: body.motivadores,
      tonos: body.tonos,
      palabrasSi: body.palabrasSi,
      palabrasNo: body.palabrasNo,
      coloresMarca: body.coloresMarca ?? undefined,
      logoDark: body.logoDarkBase64
        ? `data:${body.logoDarkMimeType ?? 'image/png'};base64,${body.logoDarkBase64}`
        : undefined,
      logoLight: body.logoLightBase64
        ? `data:${body.logoLightMimeType ?? 'image/png'};base64,${body.logoLightBase64}`
        : undefined,
    },
    updated_at: new Date().toISOString(),
    ...geminiKeyFields,
  }

  const { data, error } = await supabaseAdmin
    .from('user_business_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ data })
}
