import { supabaseClient, storage } from "@/lib/supabase";

// Tipos de buckets disponibles
export type StorageBucket = 
  | 'avatars'      // Fotos de perfil (público)
  | 'covers'       // Portadas de cursos/teachers (público)
  | 'certificates' // Fondos y certificados emitidos (público)
  | 'resources'    // Materiales de profesores (privado)
  | 'attachments'  // Adjuntos de lecciones (privado)
  | 'submissions'  // Entregas de estudiantes (privado)
  | 'videos'       // Videos de lecciones (privado)
  | 'files';       // Legacy - no usar para nuevos uploads

// Buckets públicos (usan getPublicUrl)
const PUBLIC_BUCKETS: StorageBucket[] = ['avatars', 'covers', 'certificates', 'files'];

/**
 * Obtiene la URL pública de un archivo en un bucket público
 */
export function getPublicFileUrl(bucket: StorageBucket, path: string): string {
  const { data } = storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Obtiene una URL firmada para un archivo en un bucket privado
 * @param bucket - Nombre del bucket
 * @param path - Ruta del archivo dentro del bucket
 * @param expiresIn - Tiempo de expiración en segundos (default: 1 hora)
 */
export async function getSignedFileUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const { data, error } = await storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error("Error getting signed file URL:", error);
    throw new Error("No se pudo obtener la URL firmada del archivo");
  }
}

/**
 * Obtiene la URL apropiada según si el bucket es público o privado
 */
export async function getFileUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  if (PUBLIC_BUCKETS.includes(bucket)) {
    return getPublicFileUrl(bucket, path);
  }
  return getSignedFileUrl(bucket, path, expiresIn);
}

// Legacy: Mantener compatibilidad con código antiguo
// @deprecated Usar getPublicFileUrl o getSignedFileUrl con bucket específico
export async function getLegacyFileUrl(path: string): Promise<string> {
  try {
    const { data } = storage.from('files').getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error("Error getting file URL:", error);
    throw new Error("No se pudo obtener la URL del archivo");
  }
}

// Agora no requiere URLs de thumbnail o playback como Mux
// El streaming se maneja directamente a través del SDK de Agora en el cliente
