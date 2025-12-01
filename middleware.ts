import { NextResponse, NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const pathname = url.pathname

  // Allow everything in dev mode
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  // Allow the waitlist page and static assets
  if (pathname.startsWith('/waitlist') || pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  // Redirect everything else to the waitlist
  return NextResponse.redirect(new URL('/waitlist', req.url))
}

export const config = {
  matcher: '/:path*'
}
