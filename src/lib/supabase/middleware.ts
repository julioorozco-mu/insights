/**
 * Supabase Middleware Client
 * MicroCert by Marca UNACH
 * 
 * Cliente de Supabase específico para el middleware de Next.js.
 * Maneja la sincronización de cookies entre request y response.
 * 
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Crea un cliente de Supabase para uso en el middleware.
 * Maneja la sincronización de cookies automáticamente.
 * 
 * @param request - El objeto NextRequest del middleware
 * @returns Objeto con el cliente de Supabase y la response modificada
 */
export function createMiddlewareClient(request: NextRequest) {
    // Crear una response inicial que heredará las cookies modificadas
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                    // Primero, setear las cookies en el request (para que Supabase las lea)
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );

                    // Crear una nueva response con el request actualizado
                    response = NextResponse.next({
                        request,
                    });

                    // Setear las cookies en la response para que el navegador las reciba
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    return { supabase, response: () => response };
}
