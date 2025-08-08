import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import logger from '@/lib/logger'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Log all requests for debugging
  logger.debug('[MIDDLEWARE] Request to:', pathname)
  
  // Allow static files and Next.js internal routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico' ||
    pathname === '/auth/login'
  ) {
    logger.debug('[MIDDLEWARE] Allowing public route:', pathname)
    return NextResponse.next()
  }

  // Check authentication for all other routes
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    logger.debug('[MIDDLEWARE] Token check for', pathname, !!token)

    if (!token) {
      logger.info('[MIDDLEWARE] BLOCKING unauthenticated access to:', pathname)
      
      // Redirect to login
      const loginUrl = new URL('/auth/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    logger.debug('[MIDDLEWARE] ALLOWING authenticated access to:', pathname)
    return NextResponse.next()
    
  } catch (error) {
    logger.error('[MIDDLEWARE] Error checking authentication:', error)
    
    // On error, redirect to login for security
    const loginUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
}

// Apply middleware to all routes except the explicitly excluded ones
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
} 