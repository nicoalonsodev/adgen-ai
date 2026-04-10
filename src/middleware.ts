// src/middleware.ts
import { auth } from '@/auth'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname

  const isProtected =
    pathname.startsWith('/dashboard') || pathname.startsWith('/api/compose')

  if (!isLoggedIn && isProtected) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return Response.redirect(loginUrl)
  }

  // Rutas de admin: solo plan === 'admin'
  const isAdminRoute =
    pathname.startsWith('/dashboard/admin') || pathname.startsWith('/api/admin')

  if (isAdminRoute) {
    const plan = (req.auth?.user as { plan?: string } | undefined)?.plan
    if (plan !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return Response.redirect(new URL('/dashboard', req.url))
    }
  }
})

export const config = {
  matcher: ['/dashboard/:path*', '/api/compose/:path*', '/api/admin/:path*'],
}