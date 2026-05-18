import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Routes publiques (pas besoin d'authentification)
  const publicRoutes = [
    '/login',
    '/api/auth/login',
    '/api/auth/logout'
  ];

  // Routes d'assets statiques à ignorer pour l'authentification
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') && !pathname.startsWith('/api/auth/login') && !pathname.startsWith('/api/auth/logout') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|woff|woff2|ttf|css|js|map)$/)
  ) {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // Si la route est publique, laisser passer
  if (publicRoutes.includes(pathname)) {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // Vérifier si l'utilisateur est authentifié
  const sessionCookie = request.cookies.get('auth-session');
  
  if (!sessionCookie?.value) {
    // Pas de session - rediriger vers login
    console.log(`🔐 Accès non autorisé à ${pathname} - redirection vers login`);
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Session présente - autoriser l'accès avec headers de sécurité
  const response = NextResponse.next();
  addSecurityHeaders(response);
  return response;
}

function addSecurityHeaders(response: NextResponse) {
  // Headers pour éviter les problèmes d'hydratation et sécurité
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Headers de performance
  response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};