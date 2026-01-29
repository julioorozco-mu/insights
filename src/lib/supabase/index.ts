/**
 * Supabase Client Exports
 * MicroCert by Marca UNACH
 * 
 * Barrel file para exportar los clientes de Supabase.
 * Importa desde aquí para mayor claridad:
 * 
 * ```ts
 * // En Server Components / Server Actions
 * import { createClient, getAuthUser, getUserRole } from '@/lib/supabase/server';
 * 
 * // En el Middleware
 * import { createMiddlewareClient } from '@/lib/supabase/middleware';
 * 
 * // En Client Components (usa el cliente existente)
 * import { supabaseClient } from '@/lib/supabase';
 * ```
 */

export { createClient, getAuthUser, isAuthenticated, getUserRole } from './server';
export { createMiddlewareClient } from './middleware';
