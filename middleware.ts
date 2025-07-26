import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    
    // Debug logging for production
    console.log(`[MIDDLEWARE] Request to: ${pathname}`)
    console.log(`[MIDDLEWARE] User authenticated: ${!!req.nextauth.token}`)
    
    // If we reach here, the user is authenticated
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Always allow auth routes
        if (pathname.startsWith('/api/auth') || pathname === '/auth/login') {
          return true
        }
        
        // For all other routes, require authentication
        const isAuthenticated = !!token
        
        console.log(`[AUTH] Path: ${pathname}, Token exists: ${isAuthenticated}`)
        
        if (!isAuthenticated) {
          console.log(`[AUTH] DENYING access to ${pathname} - no token`)
          return false
        }
        
        console.log(`[AUTH] ALLOWING access to ${pathname}`)
        return true
      },
    },
  }
)

// Protect ALL routes - be extremely explicit
export const config = {
  matcher: [
    /*
     * Match all request paths except for static files and images.
     * This is the most restrictive matcher possible.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 