import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

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

  return Response.json({ data: data ?? null })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

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
    },
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from('user_business_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ data })
}