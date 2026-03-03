'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase/client'

interface UserTokens {
  id: string
  user_id: string
  email: string
  plan: string
  total_tokens_monthly: number
  tokens_used: number
  tokens_remaining: number
  usage_percentage: number
  days_remaining: number
}

export function useUserTokens() {
  const { data: session } = useSession()
  const [tokens, setTokens] = useState<UserTokens | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user?.id) return

    const fetchTokens = async () => {
      try {
        setLoading(true)
        const { data, error: supabaseError } = await supabase
          .from('user_tokens_current')
          .select('*')
          .eq('user_id', session.user.id)
          .single()

        if (supabaseError) throw supabaseError
        setTokens(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTokens()
  }, [session?.user?.id])

  return { tokens, loading, error }
}