// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

export async function GET() {
  try {
    // Traer todos los auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    })
    if (authError) throw new Error(authError.message)

    // Traer datos adicionales de public.users
    const { data: publicUsers, error: pubError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, plan, avatar_url')

    if (pubError) throw new Error(pubError.message)

    const pubMap = Object.fromEntries((publicUsers ?? []).map((u) => [u.id, u]))

    const users = authData.users.map((u) => ({
      id: u.id,
      email: u.email ?? '',
      full_name: pubMap[u.id]?.full_name ?? null,
      plan: pubMap[u.id]?.plan ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed: !!u.email_confirmed_at,
      banned: u.banned_until ? new Date(u.banned_until) > new Date() : false,
    }))

    // Ordenar por created_at desc
    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ users })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── POST /api/admin/users ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) throw new Error(authError.message)

    const userId = authData.user.id

    // Insertar en public.users
    const { error: pubError } = await supabaseAdmin.from('users').insert({
      id: userId,
      email,
      full_name: full_name ?? null,
      plan: 'free',
    })

    if (pubError) {
      // Rollback: borrar el auth user creado
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw new Error(pubError.message)
    }

    return NextResponse.json({
      user: {
        id: userId,
        email,
        full_name: full_name ?? null,
        plan: 'free',
        created_at: authData.user.created_at,
        email_confirmed: true,
        banned: false,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── PATCH /api/admin/users ───────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const { userId, ban } = await req.json()

    if (!userId || typeof ban !== 'boolean') {
      return NextResponse.json({ error: 'userId y ban son requeridos' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: ban ? '87600h' : 'none',
    })

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, banned: ban })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
