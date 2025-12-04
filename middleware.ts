/**
 * Next.js Middleware - Protección de Rutas
 * MicroCert by Marca UNACH
 * 
 * Este middleware intercepta todas las solicitudes antes de llegar a las páginas
 * para validar autenticación y autorización.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Rutas que requieren autenticación
const PROTECTED_ROUTES = ['/dashboard', '/profile', '/courses/my', '/settings'];

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/auth/login', '/auth/sign-up', '/auth/recover-password', '/auth/reset-password'];

// Rutas que solo pueden acceder usuarios NO autenticados
const AUTH_ROUTES = ['/auth/login', '/auth/sign-up'];

// Roles permitidos por ruta (configuración básica)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard/admin': ['admin', 'superadmin'],
  '/dashboard/support': ['support', 'admin', 'superadmin'],
  '/dashboard/my-courses': ['teacher', 'speaker', 'admin', 'superadmin'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
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

  // Obtener sesión actual
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  // Log para debugging (remover en producción)
  if (sessionError) {
    console.warn('[Middleware] Error obteniendo sesión:', sessionError.message);
  }

  const isAuthenticated = !!session?.user;
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

  // 1. Usuario NO autenticado intentando acceder a ruta protegida
  if (!isAuthenticated && isProtectedRoute) {
    const redirectUrl = new URL('/auth/login', request.url);
    // Guardar la URL original para redirigir después del login
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Usuario autenticado intentando acceder a páginas de auth (login/signup)
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. Verificar permisos basados en rol (si aplica)
  if (isAuthenticated && session?.user) {
    // Obtener rol del usuario desde metadata o base de datos
    const userRole = session.user.user_metadata?.role || 'student';
    
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

  // 4. Agregar headers de seguridad
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
