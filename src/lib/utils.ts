import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitiza HTML y trunca el texto a una longitud máxima.
 * - Elimina patrones de logs de desarrollo ([Tag] mensaje...).
 * - Reemplaza tags de bloque por espacios para evitar concatenación de palabras.
 * - Elimina todos los tags HTML restantes.
 * - Decodifica entidades HTML básicas.
 * - Limpia espacios múltiples.
 * - Trunca y añade "..." si excede maxLength.
 */
export function stripHtmlAndTruncate(html: string | null | undefined, maxLength: number): string {
  if (!html) return "";

  let text = html
    // Eliminar patrones de logs de desarrollo (ej: [NewCourse] mensaje... {json...})
    .replace(/\[[\w\s-]+\]\s*[\w\s.,:áéíóúüñ]*\.{3}\s*\{.*$/gi, "")
    // Reemplazar tags de bloque por espacios para evitar concatenación
    .replace(/<\/p>/gi, " ")
    .replace(/<\/div>/gi, " ")
    .replace(/<\/li>/gi, " ")
    .replace(/<\/h[1-6]>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    // Eliminar todos los tags HTML restantes
    .replace(/<[^>]*>/g, "")
    // Decodificar entidades HTML básicas
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    // Limpiar espacios múltiples
    .replace(/\s+/g, " ")
    .trim();

  // Si después de sanitizar queda vacío o muy corto, devolver mensaje por defecto
  if (text.length < 5) {
    return "Sin descripción disponible";
  }

  // Truncar si excede maxLength
  if (text.length > maxLength) {
    text = text.substring(0, maxLength).trim() + "...";
  }

  return text;
}

/**
 * Capitaliza el texto de forma inteligente para títulos y descripciones.
 * - Primera letra de cada palabra en mayúscula
 * - Mantiene palabras cortas (artículos, preposiciones) en minúsculas excepto si son la primera palabra
 * - Respeta acentos y caracteres especiales
 */
export function capitalizeText(text: string | null | undefined): string {
  if (!text) return "";

  // Lista de palabras que deben mantenerse en minúsculas (excepto si son la primera palabra)
  const lowercaseWords = new Set([
    "de", "del", "la", "las", "los", "el", "un", "una", "unos", "unas",
    "y", "o", "e", "u", "a", "en", "por", "para", "con", "sin", "sobre",
    "entre", "hasta", "desde", "durante", "mediante", "según", "contra"
  ]);

  // Dividir en palabras
  const words = text.trim().split(/\s+/);
  
  // Capitalizar cada palabra
  const capitalized = words.map((word, index) => {
    // Si es la primera palabra o no está en la lista de minúsculas, capitalizar
    if (index === 0 || !lowercaseWords.has(word.toLowerCase())) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    // Mantener en minúsculas si está en la lista
    return word.toLowerCase();
  });

  return capitalized.join(" ");
}