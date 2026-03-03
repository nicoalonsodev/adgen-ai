// src/app/api/user/tokens/route.ts
import { auth } from '@/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('user_tokens')
    .select('*')
    .eq('user_id', session.user.id)
    .gte('billing_period_end', today)
    .order('billing_period_start', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({
    user_id: data.user_id,
    total_tokens_monthly: data.total_tokens_monthly,
    tokens_used: data.tokens_used,
    tokens_remaining: data.tokens_remaining,
    billing_period_end: data.billing_period_end,
  })
}