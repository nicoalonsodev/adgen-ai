// src/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { createClient } from '@supabase/supabase-js'

// ✅ Cliente con SERVICE_ROLE_KEY → para consultar public.users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40))
        console.log('ANON_KEY existe:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

        // Usar fetch directo a la API REST de Supabase (bypass del cliente JS)
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          }
        )

        const authData = await response.json() as { user?: { id: string }; [key: string]: unknown }
        console.log('Auth response status:', response.status)
        console.log('Auth response:', JSON.stringify(authData).substring(0, 200))

        if (!response.ok || !authData.user) return null

        // Consultar public.users con admin
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, email, full_name, plan, avatar_url')
          .eq('id', authData.user.id)
          .single()

        console.log('public.users error:', userError)
        console.log('public.users data:', userData)

        if (!userData) return null

        return {
          id: userData.id,
          email: userData.email,
          name: userData.full_name,
          plan: userData.plan,
          image: userData.avatar_url,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.plan = (user as any).plan
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        ;(session.user as any).plan = token.plan
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
})