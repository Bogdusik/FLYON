import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Note: We can't access localStorage in middleware (server-side)
  // Authentication is handled client-side in each page component
  // This middleware only handles basic route protection
  
  // Allow all routes - authentication is checked client-side
  // Pages will redirect to /login if not authenticated
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
