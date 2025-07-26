import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // If we reach here, the user is authenticated
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Only allow access if user has a valid token
        // The token exists only if user is validated in database
        return !!token
      },
    },
  }
)

// Protect all routes except login and API auth routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/login (login page)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|auth/login).*)',
  ],
} 