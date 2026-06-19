import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = [
  '/console',
  '/wallet',
  '/demo',
  '/vaults',
  '/agents',
  '/intent',
  '/policies',
  '/logs',
  '/alerts',
  '/control',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get('frx_token')?.value;
  if (!token) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/console/:path*',
    '/wallet/:path*',
    '/demo/:path*',
    '/vaults/:path*',
    '/intent/:path*',
    '/agents/:path*',
    '/policies/:path*',
    '/logs/:path*',
    '/alerts/:path*',
    '/control/:path*',
  ],
};
