/**
 * Utilities compartidas para LessonPlayer (page.tsx, tabs, hooks)
 * Evita duplicación de código entre componentes
 */

/**
 * Formatea segundos a formato MM:SS
 * @param seconds - Duración en segundos
 * @returns String en formato MM:SS (ej: "2:45")
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Extrae el video ID de una URL de YouTube
 * @param url - URL de YouTube (corta o completa)
 * @returns Video ID o null si no es válida
 */
export function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * Extrae la ruta del archivo del storage URL de Supabase
 * @param storageUrl - URL completa del storage (ej: https://projectid.supabase.co/storage/v1/object/public/...)
 * @returns Ruta del archivo (ej: lessons/file.pdf) o null
 */
export function extractStoragePath(storageUrl: string): string | null {
  try {
    const url = new URL(storageUrl);
    const pathParts = url.pathname.split('/');
    // /storage/v1/object/public/bucket/path/to/file
    const bucketIndex = pathParts.indexOf('public');
    if (bucketIndex === -1) return null;
    return pathParts.slice(bucketIndex + 2).join('/');
  } catch {
    return null;
  }
}

/**
 * Constantes de validación (deben coincidir con backend)
 */
export const VALIDATION_LIMITS = {
  QUESTION: {
    MIN: 10,
    MAX: 2000,
  },
  ANSWER: {
    MIN: 5,
    MAX: 5000,
  },
  NOTE: {
    MIN: 1,
    MAX: 10000,
  },
  VIDEO_TIMESTAMP: {
    MIN: 0,
    MAX: 86400, // 24 horas en segundos
  },
} as const;
