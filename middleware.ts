import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Routes publiques (pas besoin d'authentification)
  const publicRoutes = [
    '/login',
    '/user-selection',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/select-user',
    '/api/auth/create-user',
    '/api/users',
    '/api/debug-sheets', // TEMPORAIRE POUR DEBUG
    '/api/debug-sqlite', // TEMPORAIRE POUR DEBUG SQLITE
    '/api/force-refresh' // TEMPORAIRE POUR FORCE REFRESH
  ];

  // Routes d'assets statiques à ignorer pour l'authentification
  if (
    pathname.startsWith('/_next') ||
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
    // Pas de session
    if (pathname.startsWith('/api')) {
      // Pour les APIs, retourner 401 Unauthorized
      console.log(`🔐 Accès API non autorisé à ${pathname}`);
      return new NextResponse('Unauthorized', { status: 401 });
    } else {
      // Pour les pages, rediriger vers login
      console.log(`🔐 Accès non autorisé à ${pathname} - redirection vers login`);
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Session présente - vérifier si l'utilisateur a sélectionné son profil
  const userInfoCookie = request.cookies.get('user-info');
  
  // Si pas de profil utilisateur sélectionné et pas déjà sur la page de sélection
  if (!userInfoCookie?.value && pathname !== '/user-selection') {
    console.log(`👤 Utilisateur authentifié mais sans profil - redirection vers sélection utilisateur`);
    const userSelectionUrl = new URL('/user-selection', request.url);
    return NextResponse.redirect(userSelectionUrl);
  }

  // Session et profil présents - autoriser l'accès avec headers de sécurité
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
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Include API routes for authentication
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};