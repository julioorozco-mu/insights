/**
 * Server-side Rate Limiter
 *
 * Implementación de rate limiting para API routes con soporte para:
 * - LRU Cache en memoria (desarrollo/single server)
 * - Upstash Redis (producción/serverless) - opcional
 *
 * @see https://vercel.com/templates/next.js/api-rate-limit
 */

// =============================================================================
// TIPOS
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  /** Máximo de requests permitidos */
  limit: number;
  /** Ventana de tiempo en segundos */
  windowSeconds: number;
  /** Identificador único para este limiter */
  identifier: string;
}

interface RateLimitResult {
  /** Si el request está permitido */
  success: boolean;
  /** Requests restantes */
  remaining: number;
  /** Timestamp de reset (ms) */
  resetAt: number;
  /** Límite total */
  limit: number;
}

// =============================================================================
// LRU CACHE PARA RATE LIMITING
// =============================================================================

class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Cache global para rate limiting (máximo 10,000 IPs)
const rateLimitCache = new LRUCache<string, RateLimitEntry>(10000);

// =============================================================================
// RATE LIMITER PRINCIPAL
// =============================================================================

/**
 * Verifica y actualiza el rate limit para un identificador
 */
export function checkRateLimit(
  identifier: string,
  config: Omit<RateLimitConfig, 'identifier'>
): RateLimitResult {
  const key = `ratelimit:${config.limit}:${config.windowSeconds}:${identifier}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = rateLimitCache.get(key);

  // Si no hay entrada o expiró, crear nueva
  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  // Incrementar contador
  entry.count++;
  rateLimitCache.set(key, entry);

  const remaining = Math.max(0, config.limit - entry.count);
  const success = entry.count <= config.limit;

  return {
    success,
    remaining,
    resetAt: entry.resetAt,
    limit: config.limit,
  };
}

// =============================================================================
// CONFIGURACIONES PREDEFINIDAS
// =============================================================================

/**
 * Rate limits predefinidos para diferentes tipos de endpoints
 */
export const RATE_LIMITS = {
  /** API general: 100 requests por minuto */
  API_GENERAL: { limit: 100, windowSeconds: 60 },

  /** Crear contenido (preguntas, notas): 30 por minuto */
  CONTENT_CREATE: { limit: 30, windowSeconds: 60 },

  /** Votar: 60 por minuto */
  VOTING: { limit: 60, windowSeconds: 60 },

  /** Lectura de datos: 200 por minuto */
  READ: { limit: 200, windowSeconds: 60 },

  /** Autenticación: 5 intentos por 15 minutos */
  AUTH: { limit: 5, windowSeconds: 900 },

  /** Búsqueda: 30 por minuto */
  SEARCH: { limit: 30, windowSeconds: 60 },
} as const;

// =============================================================================
// HELPERS PARA API ROUTES
// =============================================================================

/**
 * Obtiene el identificador del cliente (IP o user ID)
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  // Preferir user ID si está autenticado
  if (userId) {
    return `user:${userId}`;
  }

  // Obtener IP del request
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare

  const ip = forwarded?.split(',')[0]?.trim() || realIp || cfConnectingIp || 'unknown';

  return `ip:${ip}`;
}

/**
 * Middleware de rate limiting para API routes
 * Retorna Response si rate limited, undefined si OK
 */
export function rateLimitMiddleware(
  request: Request,
  config: Omit<RateLimitConfig, 'identifier'>,
  userId?: string
): Response | undefined {
  const identifier = getClientIdentifier(request, userId);
  const result = checkRateLimit(identifier, config);

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Has excedido el límite de solicitudes. Por favor espera antes de intentar de nuevo.',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toString(),
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }

  return undefined;
}

/**
 * Añade headers de rate limit a una Response
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.resetAt.toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// =============================================================================
// DECORADOR PARA ENDPOINTS
// =============================================================================

type ApiHandler = (request: Request, context?: unknown) => Promise<Response>;

/**
 * Wrapper HOF para aplicar rate limiting a un endpoint
 *
 * @example
 * ```ts
 * export const GET = withRateLimit(
 *   RATE_LIMITS.READ,
 *   async (request) => {
 *     // Tu lógica aquí
 *     return Response.json({ data: [] });
 *   }
 * );
 * ```
 */
export function withRateLimit(
  config: Omit<RateLimitConfig, 'identifier'>,
  handler: ApiHandler,
  getUserId?: (request: Request) => Promise<string | undefined>
): ApiHandler {
  return async (request: Request, context?: unknown) => {
    const userId = getUserId ? await getUserId(request) : undefined;
    const rateLimitResponse = rateLimitMiddleware(request, config, userId);

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return handler(request, context);
  };
}

// =============================================================================
// UTILIDADES DE TESTING
// =============================================================================

/**
 * Limpia el cache de rate limiting (solo para testing)
 */
export function clearRateLimitCache(): void {
  rateLimitCache.clear();
}

/**
 * Obtiene el estado actual del rate limit para un identificador (solo para debugging)
 */
export function getRateLimitState(
  identifier: string,
  config: Omit<RateLimitConfig, 'identifier'>
): RateLimitEntry | undefined {
  const key = `ratelimit:${config.limit}:${config.windowSeconds}:${identifier}`;
  return rateLimitCache.get(key);
}
