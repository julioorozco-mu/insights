/**
 * Next.js Middleware - Protección de Rutas
 * MicroCert by Marca UNACH
 * 
 * Este middleware intercepta todas las solicitudes antes de llegar a las páginas
 * para validar autenticación y autorización.
 * 
 * FLUJO DE AUTENTICACIÓN:
 * - Rutas de auth (/auth/*): Solo accesibles si NO estás logueado
 * - Rutas de dashboard (/dashboard/*): Solo accesibles si ESTÁS logueado
 * - Página principal (/): Redirige a /dashboard si está logueado
 * - Rutas no existentes: Redirige a /dashboard si está logueado, a /auth/login si no
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Rutas que requieren autenticación (rutas privadas)
const PROTECTED_ROUTES = ['/dashboard', '/profile'];

// Rutas públicas específicas de autenticación (solo accesibles si NO estás logueado)
const AUTH_ONLY_ROUTES = ['/auth/login', '/auth/sign-up', '/auth/recover-password'];

// Rutas completamente públicas (accesibles para todos)
const PUBLIC_ROUTES = ['/course', '/api'];

// Roles permitidos por ruta (configuración básica)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard/admin': ['admin', 'superadmin'],
  '/dashboard/support': ['support', 'admin', 'superadmin'],
  '/dashboard/my-courses': ['teacher', 'speaker', 'admin', 'superadmin'],
};

/**
 * Verifica si una ruta coincide con alguna de las rutas en la lista
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => pathname === route || pathname.startsWith(route + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Ignorar rutas de API (excepto las que necesiten auth check)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Crear respuesta inicial
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Crear cliente de Supabase para Server-Side
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Obtener sesión actual - usar getUser para validación más robusta
  // getSession() solo lee de la cookie local, getUser() valida con el servidor
  const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
  
  // Log para debugging (remover en producción)
  if (userError && userError.message !== 'Auth session missing!') {
    console.warn('[Middleware] Error obteniendo usuario:', userError.message);
  }

  const isAuthenticated = !!authUser;
  const isProtectedRoute = matchesRoute(pathname, PROTECTED_ROUTES);
  const isAuthOnlyRoute = matchesRoute(pathname, AUTH_ONLY_ROUTES);
  const isPublicRoute = matchesRoute(pathname, PUBLIC_ROUTES);
  const isRootRoute = pathname === '/';

  // ============================================
  // 1. Usuario AUTENTICADO
  // ============================================
  if (isAuthenticated) {
    // 1a. Si intenta acceder a rutas de auth (login, sign-up, recover-password)
    //     → Redirigir a /dashboard
    if (isAuthOnlyRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // 1b. Si accede a la página raíz → Redirigir a /dashboard
    if (isRootRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // 1c. Verificar permisos basados en rol (si aplica)
    if (authUser) {
      // Obtener rol del usuario desde metadata
      const userRole = authUser.user_metadata?.role || 'student';
      
      // Verificar si la ruta tiene restricción de roles
      for (const [route, allowedRoles] of Object.entries(ROLE_PERMISSIONS)) {
        if (pathname.startsWith(route)) {
          if (!allowedRoles.includes(userRole)) {
            // Usuario no tiene permisos para esta ruta
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }
          break;
        }
      }
    }
    
    // 1d. Para rutas protegidas o públicas, continuar normalmente
    if (isProtectedRoute || isPublicRoute) {
      // Agregar headers de seguridad y continuar
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      return response;
    }
    
    // 1e. Ruta desconocida para usuario autenticado → Redirigir a /dashboard
    // (Esto captura rutas que no existen)
    if (!isProtectedRoute && !isPublicRoute && !isRootRoute) {
      // Solo redirigir si no es una ruta de Next.js interna o archivo estático
      // Estas ya están excluidas por el matcher, pero por seguridad:
      if (!pathname.startsWith('/_next') && !pathname.includes('.')) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }
  
  // ============================================
  // 2. Usuario NO AUTENTICADO
  // ============================================
  else {
    // 2a. Si intenta acceder a rutas protegidas → Redirigir a /auth/login
    if (isProtectedRoute) {
      const redirectUrl = new URL('/auth/login', request.url);
      // Guardar la URL original para redirigir después del login
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    // 2b. Rutas de auth (login, sign-up, recover-password) → Permitir acceso
    if (isAuthOnlyRoute) {
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      return response;
    }
    
    // 2c. Página raíz → Permitir acceso (es la landing page pública)
    if (isRootRoute) {
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      return response;
    }
    
    // 2d. Rutas públicas (como /course) → Permitir acceso
    if (isPublicRoute) {
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      return response;
    }
    
    // 2e. Ruta desconocida para usuario NO autenticado → Redirigir a /auth/login
    if (!pathname.startsWith('/_next') && !pathname.includes('.')) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // Agregar headers de seguridad
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

// Configurar qué rutas procesa el middleware
export const config = {
  matcher: [
    /*
     * Excluir archivos estáticos y API routes internas de Next.js:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (favicon)
     * - archivos con extensión (js, css, png, jpg, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
