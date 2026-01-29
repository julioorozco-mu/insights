/**
 * Next.js Middleware - Optimizado
 * MicroCert by Marca UNACH
 * 
 * Middleware ligero que solo:
 * 1. Refresca la sesión de Supabase (sincroniza cookies)
 * 2. Protege rutas básicas
 * 3. Lee roles desde el JWT (NO hace consultas a DB)
 * 
 * Skill: nextjs-supabase-auth
 * - Maneja tokens en middleware para rutas protegidas
 * - Usa el flujo de sesiones basado en cookies
 * 
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createMiddlewareClient } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

// ============================================
// CONFIGURACIÓN DE RUTAS
// ============================================

// Rutas que requieren autenticación
const PROTECTED_ROUTES = ['/dashboard', '/profile', '/student'];

// Rutas de autenticación (solo accesibles si NO estás logueado)
const AUTH_ONLY_ROUTES = ['/auth/login', '/auth/sign-up', '/auth/recover-password'];

// Rutas completamente públicas
const PUBLIC_ROUTES = ['/course', '/api'];

// Permisos por rol (sin consultas a DB)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard/admin': ['admin', 'superadmin'],
  '/dashboard/support': ['support', 'admin', 'superadmin'],
  '/dashboard/my-courses': ['teacher', 'speaker', 'admin', 'superadmin'],
};

// ============================================
// HELPERS
// ============================================

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => pathname === route || pathname.startsWith(route + '/'));
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

// ============================================
// MIDDLEWARE PRINCIPAL
// ============================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorar rutas de API (se manejan con su propia autenticación)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Crear cliente de Supabase para middleware
  const { supabase, response } = createMiddlewareClient(request);

  // IMPORTANTE: Refrescar la sesión usando getUser() 
  // Esto sincroniza las cookies y verifica el JWT con Supabase
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.warn('[Middleware] Error verificando usuario:', error.message);
  }

  const isAuthenticated = !!user;

  // Obtener rol SOLO desde el JWT (NO consultar DB)
  // Priorizar app_metadata (más seguro) sobre user_metadata
  const userRole = user?.app_metadata?.role || user?.user_metadata?.role || 'student';

  // Clasificar la ruta
  const isProtectedRoute = matchesRoute(pathname, PROTECTED_ROUTES);
  const isAuthOnlyRoute = matchesRoute(pathname, AUTH_ONLY_ROUTES);
  const isPublicRoute = matchesRoute(pathname, PUBLIC_ROUTES);
  const isRootRoute = pathname === '/';

  // ============================================
  // USUARIO AUTENTICADO
  // ============================================
  if (isAuthenticated) {
    // Redirigir de rutas de auth a dashboard
    if (isAuthOnlyRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Redirigir de raíz a dashboard
    if (isRootRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Verificar permisos de rol para rutas restringidas
    for (const [route, allowedRoles] of Object.entries(ROLE_PERMISSIONS)) {
      if (pathname.startsWith(route)) {
        if (!allowedRoles.includes(userRole)) {
          console.log(`[Middleware] Acceso denegado a ${pathname} para rol ${userRole}`);
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        break;
      }
    }

    // Permitir acceso a rutas protegidas y públicas
    if (isProtectedRoute || isPublicRoute) {
      return addSecurityHeaders(response());
    }

    // Ruta desconocida para usuario autenticado → Dashboard
    if (!isProtectedRoute && !isPublicRoute && !isRootRoute) {
      if (!pathname.startsWith('/_next') && !pathname.includes('.')) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  // ============================================
  // USUARIO NO AUTENTICADO
  // ============================================
  else {
    // Redirigir de rutas protegidas a la página principal (contiene login)
    if (isProtectedRoute) {
      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Permitir acceso a rutas de auth
    if (isAuthOnlyRoute) {
      return addSecurityHeaders(response());
    }

    // Permitir acceso a raíz (landing page con login)
    if (isRootRoute) {
      return addSecurityHeaders(response());
    }

    // Permitir acceso a rutas públicas
    if (isPublicRoute) {
      return addSecurityHeaders(response());
    }

    // Ruta desconocida para usuario no autenticado → Página principal
    if (!pathname.startsWith('/_next') && !pathname.includes('.')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return addSecurityHeaders(response());
}

// ============================================
// CONFIGURACIÓN DEL MATCHER
// ============================================

export const config = {
  matcher: [
    /*
     * Excluir archivos estáticos y rutas internas de Next.js:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (favicon)
     * - archivos con extensión (js, css, png, jpg, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
