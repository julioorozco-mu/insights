/**
 * Convierte un user ID (string) a un UID numérico válido para Agora
 * Agora requiere: número entre 0-10000 o string ASCII de máximo 255 caracteres
 */
export function getUserIdForAgora(userId: string): number {
  // Crear un hash simple del userId y limitarlo al rango 0-9999
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Asegurar que esté en el rango válido [1, 9999]
  return Math.abs(hash % 9999) + 1;
}
