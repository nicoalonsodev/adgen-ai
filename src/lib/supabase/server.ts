// src/lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function getUserWithTokens(userId: string) {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('user_tokens')
    .select('*')
    .eq('user_id', userId)
    .gte('billing_period_end', today)
    .order('billing_period_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function consumeTokens(
  userId: string,
  amount: number,
  operation: string = 'UNKNOWN'
) {
  // 1. Obtener tokens actuales
  const userTokens = await getUserWithTokens(userId)

  // 2. Verificar saldo
  if (userTokens.tokens_remaining < amount) {
    throw new Error('Insufficient tokens')
  }

  // 3. Actualizar tokens_used
  const { error } = await supabaseAdmin
    .from('user_tokens')
    .update({
      tokens_used: userTokens.tokens_used + amount,
      updated_at: new Date().toISOString()
    })
    .eq('id', userTokens.id)

  if (error) throw new Error(error.message)

  // 4. Loggear consumo
  await logTokenConsumption(userId, amount, operation, {
    tokens_before: userTokens.tokens_remaining,
    tokens_after: userTokens.tokens_remaining - amount,
  })
}

export async function logTokenConsumption(
  userId: string,
  amount: number,
  operation: string = 'UNKNOWN',
  meta?: { tokens_before?: number; tokens_after?: number; batch_id?: string; template_id?: string }
) {
  const { error } = await supabaseAdmin
    .from('token_logs')
    .insert({
      user_id: userId,
      operation,
      tokens_consumed: amount,
      tokens_before: meta?.tokens_before,
      tokens_after: meta?.tokens_after,
      batch_id: meta?.batch_id,
      template_id: meta?.template_id,
      status: 'success',
    })

  if (error) console.error('Log error:', error.message)
}