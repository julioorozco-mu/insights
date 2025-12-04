/**
 * Rate Limiter del lado Cliente
 * MicroCert by Marca UNACH
 * 
 * Implementa rate limiting para prevenir ataques de fuerza bruta
 * desde el cliente. Esto es una capa adicional; el backend de Supabase
 * también tiene su propio rate limiting.
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

// Configuración del rate limiter
const CONFIG = {
  maxAttempts: 5,           // Máximo de intentos permitidos
  windowMs: 15 * 60 * 1000, // Ventana de tiempo (15 minutos)
  lockoutMs: 30 * 60 * 1000, // Tiempo de bloqueo (30 minutos)
  storageKey: 'auth_rate_limit',
};

/**
 * Obtiene el estado actual del rate limiter desde localStorage
 */
function getEntry(): RateLimitEntry | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(CONFIG.storageKey);
    if (!stored) return null;
    
    const entry = JSON.parse(stored) as RateLimitEntry;
    const now = Date.now();
    
    // Si el bloqueo expiró, resetear
    if (entry.lockedUntil && entry.lockedUntil < now) {
      clearRateLimit();
      return null;
    }
    
    // Si la ventana de tiempo expiró, resetear
    if (entry.firstAttempt + CONFIG.windowMs < now && !entry.lockedUntil) {
      clearRateLimit();
      return null;
    }
    
    return entry;
  } catch {
    return null;
  }
}

/**
 * Guarda el estado del rate limiter
 */
function setEntry(entry: RateLimitEntry): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(entry));
  } catch {
    // localStorage lleno o no disponible, ignorar
  }
}

/**
 * Limpia el rate limiter (después de login exitoso)
 */
export function clearRateLimit(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(CONFIG.storageKey);
  } catch {
    // Ignorar errores
  }
}

/**
 * Verifica si el usuario puede intentar hacer login
 * @returns {{ allowed: boolean; remainingAttempts: number; waitTimeMs: number }}
 */
export function checkRateLimit(): {
  allowed: boolean;
  remainingAttempts: number;
  waitTimeMs: number;
  waitTimeFormatted: string;
} {
  const entry = getEntry();
  const now = Date.now();
  
  if (!entry) {
    return {
      allowed: true,
      remainingAttempts: CONFIG.maxAttempts,
      waitTimeMs: 0,
      waitTimeFormatted: '',
    };
  }
  
  // Si está bloqueado
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const waitTimeMs = entry.lockedUntil - now;
    return {
      allowed: false,
      remainingAttempts: 0,
      waitTimeMs,
      waitTimeFormatted: formatWaitTime(waitTimeMs),
    };
  }
  
  const remainingAttempts = Math.max(0, CONFIG.maxAttempts - entry.attempts);
  
  return {
    allowed: remainingAttempts > 0,
    remainingAttempts,
    waitTimeMs: 0,
    waitTimeFormatted: '',
  };
}

/**
 * Registra un intento fallido de login
 * @returns El estado actual después de registrar el intento
 */
export function recordFailedAttempt(): ReturnType<typeof checkRateLimit> {
  const now = Date.now();
  let entry = getEntry();
  
  if (!entry) {
    entry = {
      attempts: 1,
      firstAttempt: now,
      lockedUntil: null,
    };
  } else {
    entry.attempts += 1;
  }
  
  // Si alcanzó el máximo de intentos, bloquear
  if (entry.attempts >= CONFIG.maxAttempts) {
    entry.lockedUntil = now + CONFIG.lockoutMs;
  }
  
  setEntry(entry);
  
  return checkRateLimit();
}

/**
 * Registra un intento exitoso de login (limpia el rate limiter)
 */
export function recordSuccessfulAttempt(): void {
  clearRateLimit();
}

/**
 * Formatea el tiempo de espera en un string legible
 */
function formatWaitTime(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours} hora${hours > 1 ? 's' : ''} y ${remainingMinutes} minuto${remainingMinutes > 1 ? 's' : ''}`
      : `${hours} hora${hours > 1 ? 's' : ''}`;
  }
  
  return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
}

/**
 * Hook para usar el rate limiter en componentes React
 */
export function useRateLimiter() {
  return {
    check: checkRateLimit,
    recordFailed: recordFailedAttempt,
    recordSuccess: recordSuccessfulAttempt,
    clear: clearRateLimit,
  };
}
