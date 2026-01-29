/**
 * Supabase Server Client
 * MicroCert by Marca UNACH
 * 
 * Cliente de Supabase para uso en Server Components, Server Actions y Route Handlers.
 * Usa @supabase/ssr para manejo correcto de cookies en el servidor.
 * 
 * IMPORTANTE: Este cliente debe crearse por cada request (no es singleton)
 * para garantizar el manejo correcto de cookies por usuario.
 * 
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Crea un cliente de Supabase para uso en el servidor.
 * 
 * Uso en Server Components:
 * ```ts
 * const supabase = await createClient();
 * const { data: { user } } = await supabase.auth.getUser();
 * ```
 * 
 * Uso en Server Actions:
 * ```ts
 * "use server"
 * const supabase = await createClient();
 * await supabase.auth.signInWithPassword({ email, password });
 * ```
 */
export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // El método `setAll` puede fallar en Server Components porque
                        // las cookies solo pueden modificarse en Server Actions o Route Handlers.
                        // Esto es esperado y seguro de ignorar si solo estamos leyendo la sesión.
                    }
                },
            },
        }
    );
}

/**
 * Obtiene el usuario actual de forma segura.
 * Usa getUser() en lugar de getSession() para máxima seguridad.
 * 
 * @returns El usuario autenticado o null si no hay sesión.
 */
export async function getAuthUser() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return null;
    }

    return user;
}

/**
 * Verifica si el usuario está autenticado.
 * Útil para guards en Server Components.
 * 
 * @returns true si hay un usuario autenticado, false en caso contrario.
 */
export async function isAuthenticated(): Promise<boolean> {
    const user = await getAuthUser();
    return !!user;
}

/**
 * Obtiene el rol del usuario desde la metadata del JWT.
 * NO hace consultas a la base de datos.
 * 
 * @returns El rol del usuario o 'student' por defecto.
 */
export async function getUserRole(): Promise<string> {
    const user = await getAuthUser();

    if (!user) {
        return 'student';
    }

    // Priorizar app_metadata (más seguro, setteado por el servidor)
    // luego user_metadata (puede ser modificado por el usuario)
    return user.app_metadata?.role || user.user_metadata?.role || 'student';
}
