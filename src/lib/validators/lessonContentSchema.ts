import { z } from 'zod';

// =============================================================================
// CONSTANTES DE VALIDACIÓN
// =============================================================================

// Caracteres peligrosos para prevenir XSS/injection
const XSS_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const HTML_TAGS_PATTERN = /<[^>]*>/g;
const DANGEROUS_CHARS = /[<>"'`;\\]/;

// Límites de contenido
const LIMITS = {
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

// =============================================================================
// HELPERS DE SANITIZACIÓN
// =============================================================================

/**
 * Sanitiza texto removiendo scripts y tags HTML peligrosos
 * Preserva saltos de línea y caracteres especiales seguros
 */
function sanitizeText(text: string): string {
  return text
    .replace(XSS_PATTERN, '') // Remover scripts
    .replace(HTML_TAGS_PATTERN, '') // Remover tags HTML
    .trim();
}

/**
 * Verifica si el texto contiene patrones peligrosos
 */
function hasDangerousContent(text: string): boolean {
  // Detectar scripts inline
  if (XSS_PATTERN.test(text)) return true;

  // Detectar event handlers (onclick, onerror, etc.)
  if (/on\w+\s*=/i.test(text)) return true;

  // Detectar javascript: URLs
  if (/javascript:/i.test(text)) return true;

  // Detectar data: URLs con tipos peligrosos
  if (/data:text\/html/i.test(text)) return true;

  return false;
}

// =============================================================================
// SCHEMAS DE PREGUNTAS (Q&A)
// =============================================================================

/**
 * Schema para crear una nueva pregunta
 */
export const createQuestionSchema = z.object({
  question_text: z
    .string()
    .min(LIMITS.QUESTION.MIN, `La pregunta debe tener al menos ${LIMITS.QUESTION.MIN} caracteres`)
    .max(LIMITS.QUESTION.MAX, `La pregunta no puede exceder ${LIMITS.QUESTION.MAX} caracteres`)
    .refine((val) => !hasDangerousContent(val), {
      message: 'La pregunta contiene contenido no permitido',
    })
    .transform(sanitizeText),

  video_timestamp: z
    .number()
    .int('El timestamp debe ser un número entero')
    .min(LIMITS.VIDEO_TIMESTAMP.MIN, 'El timestamp no puede ser negativo')
    .max(LIMITS.VIDEO_TIMESTAMP.MAX, 'El timestamp excede el máximo permitido')
    .optional()
    .default(0),

  course_id: z
    .string()
    .uuid('ID de curso inválido'),

  lesson_id: z
    .string()
    .uuid('ID de lección inválido')
    .optional(), // Puede venir de params
});

/**
 * Schema para crear una respuesta a una pregunta
 */
export const createAnswerSchema = z.object({
  answer_text: z
    .string()
    .min(LIMITS.ANSWER.MIN, `La respuesta debe tener al menos ${LIMITS.ANSWER.MIN} caracteres`)
    .max(LIMITS.ANSWER.MAX, `La respuesta no puede exceder ${LIMITS.ANSWER.MAX} caracteres`)
    .refine((val) => !hasDangerousContent(val), {
      message: 'La respuesta contiene contenido no permitido',
    })
    .transform(sanitizeText),

  question_id: z
    .string()
    .uuid('ID de pregunta inválido')
    .optional(), // Puede venir de params
});

/**
 * Schema para votar una pregunta/respuesta
 */
export const voteSchema = z.object({
  question_id: z
    .string()
    .uuid('ID de pregunta inválido')
    .optional(),

  answer_id: z
    .string()
    .uuid('ID de respuesta inválido')
    .optional(),
}).refine(
  (data) => data.question_id || data.answer_id,
  { message: 'Debe especificar question_id o answer_id' }
);

/**
 * Schema para marcar respuesta como aceptada
 */
export const acceptAnswerSchema = z.object({
  answer_id: z
    .string()
    .uuid('ID de respuesta inválido'),

  question_id: z
    .string()
    .uuid('ID de pregunta inválido'),
});

// =============================================================================
// SCHEMAS DE NOTAS
// =============================================================================

/**
 * Schema para crear una nueva nota
 */
export const createNoteSchema = z.object({
  content: z
    .string()
    .min(LIMITS.NOTE.MIN, 'La nota no puede estar vacía')
    .max(LIMITS.NOTE.MAX, `La nota no puede exceder ${LIMITS.NOTE.MAX} caracteres`)
    .refine((val) => !hasDangerousContent(val), {
      message: 'La nota contiene contenido no permitido',
    })
    .transform(sanitizeText),

  video_timestamp: z
    .number()
    .int('El timestamp debe ser un número entero')
    .min(LIMITS.VIDEO_TIMESTAMP.MIN, 'El timestamp no puede ser negativo')
    .max(LIMITS.VIDEO_TIMESTAMP.MAX, 'El timestamp excede el máximo permitido')
    .optional()
    .default(0),

  course_id: z
    .string()
    .uuid('ID de curso inválido'),

  lesson_id: z
    .string()
    .uuid('ID de lección inválido')
    .optional(), // Puede venir de params
});

/**
 * Schema para actualizar una nota existente
 */
export const updateNoteSchema = z.object({
  content: z
    .string()
    .min(LIMITS.NOTE.MIN, 'La nota no puede estar vacía')
    .max(LIMITS.NOTE.MAX, `La nota no puede exceder ${LIMITS.NOTE.MAX} caracteres`)
    .refine((val) => !hasDangerousContent(val), {
      message: 'La nota contiene contenido no permitido',
    })
    .transform(sanitizeText)
    .optional(),

  video_timestamp: z
    .number()
    .int()
    .min(LIMITS.VIDEO_TIMESTAMP.MIN)
    .max(LIMITS.VIDEO_TIMESTAMP.MAX)
    .optional(),
});

/**
 * Schema para eliminar una nota
 */
export const deleteNoteSchema = z.object({
  note_id: z
    .string()
    .uuid('ID de nota inválido'),
});

// =============================================================================
// SCHEMAS DE QUERY PARAMS
// =============================================================================

/**
 * Schema para parámetros de listado de preguntas
 */
export const listQuestionsQuerySchema = z.object({
  sort: z
    .enum(['recent', 'popular', 'unanswered'])
    .optional()
    .default('recent'),

  limit: z
    .coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(50),

  offset: z
    .coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(0),

  unresolved_only: z
    .coerce
    .boolean()
    .optional()
    .default(false),
});

/**
 * Schema para parámetros de listado de notas
 */
export const listNotesQuerySchema = z.object({
  limit: z
    .coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(100),

  cursor: z
    .string()
    .uuid()
    .optional(),

  from_timestamp: z
    .coerce
    .number()
    .int()
    .min(0)
    .optional(),
});

// =============================================================================
// TYPES
// =============================================================================

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type CreateAnswerInput = z.infer<typeof createAnswerSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
export type AcceptAnswerInput = z.infer<typeof acceptAnswerSchema>;

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type DeleteNoteInput = z.infer<typeof deleteNoteSchema>;

export type ListQuestionsQuery = z.infer<typeof listQuestionsQuerySchema>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;

// =============================================================================
// UTILIDADES DE VALIDACIÓN
// =============================================================================

/**
 * Valida datos y retorna resultado tipado o errores formateados
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Formatear errores para respuesta API
  const errors: Record<string, string[]> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.') || '_root';
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(err.message);
  });

  return { success: false, errors };
}

/**
 * Wrapper para usar en API routes de Next.js
 */
export async function parseRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: Response }> {
  try {
    const body = await request.json();
    const result = validateInput(schema, body);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      error: Response.json(
        { error: 'Validation failed', details: result.errors },
        { status: 400 }
      ),
    };
  } catch {
    return {
      success: false,
      error: Response.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Parser para query params de URL
 */
export function parseQueryParams<T>(
  request: Request,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
  const url = new URL(request.url);
  const params: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return validateInput(schema, params);
}
