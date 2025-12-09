/**
 * Supabase Client Configuration
 * MicroCert by Marca UNACH
 * 
 * Este archivo inicializa el cliente de Supabase para:
 * - Auth (autenticación)
 * - Database (PostgreSQL)
 * - Storage (archivos)
 * - Realtime (subscripciones en tiempo real)
 * 
 * IMPORTANTE: Usa createBrowserClient de @supabase/ssr para que las cookies
 * se manejen correctamente y el middleware pueda leer la sesión.
 */

import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

// Variables de entorno requeridas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validar que las variables de entorno estén configuradas (solo en runtime)
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  console.error(
    'Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

// Cliente singleton para uso en toda la aplicación
let supabase: SupabaseClient;

/**
 * Obtiene o crea el cliente de Supabase (patrón singleton)
 * Usa createBrowserClient de @supabase/ssr para manejo correcto de cookies
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return supabase;
}

// Exportar cliente por defecto
export const supabaseClient = getSupabaseClient();

// Alias para compatibilidad
export const db = supabaseClient;
export const auth = supabaseClient.auth;
export const storage = supabaseClient.storage;

export default supabaseClient;
