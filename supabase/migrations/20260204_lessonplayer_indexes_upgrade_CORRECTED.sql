-- ============================================================================
-- LessonPlayer Q&A + Notes - MIGRACIÓN SEGURA (Actualización de Índices)
-- Version: 3.0 - CORREGIDA con fixes de seguridad y sintaxis
-- ============================================================================
--
-- CAMBIOS EN ESTA VERSIÓN:
-- 1. RAISE NOTICE movidos dentro de bloques DO $$ (fix sintaxis)
-- 2. SECURITY INVOKER en lugar de SECURITY DEFINER (fix seguridad)
-- 3. Agregado índice para course_id (dashboards instructor)
-- 4. Agregado search_path en funciones
-- 5. Race condition fix con COUNT real en lugar de incremento
-- 6. Función de sincronización para mantenimiento
--
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- PASO 0: VERIFICACIÓN PREVIA
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Iniciando migración de índices LessonPlayer v3.0';
  RAISE NOTICE 'Fecha: %', NOW();
  RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- PASO 1: ELIMINAR ÍNDICES SIMPLES ANTERIORES (Solo si existen)
-- ----------------------------------------------------------------------------

DROP INDEX IF EXISTS public.idx_lesson_questions_lesson_created_at_desc;
DROP INDEX IF EXISTS public.idx_lesson_questions_lesson_upvotes_desc;
DROP INDEX IF EXISTS public.idx_lesson_notes_student_lesson_video_timestamp;
DROP INDEX IF EXISTS public.idx_lesson_question_answers_question_created_at;

DO $$ BEGIN
  RAISE NOTICE 'Índices antiguos eliminados (si existían)';
END $$;

-- ----------------------------------------------------------------------------
-- PASO 2: CREAR ÍNDICES MEJORADOS PARA LESSON_QUESTIONS
-- ----------------------------------------------------------------------------

-- Listar preguntas por lección + fecha (con covering index)
CREATE INDEX IF NOT EXISTS idx_lesson_questions_lesson_created_desc_v2
  ON public.lesson_questions (lesson_id, created_at DESC)
  INCLUDE (question_text, student_id, upvotes);

-- Listar preguntas por popularidad
CREATE INDEX IF NOT EXISTS idx_lesson_questions_lesson_upvotes_desc_v2
  ON public.lesson_questions (lesson_id, upvotes DESC, created_at DESC)
  INCLUDE (question_text, student_id);

-- Preguntas de un alumno específico (para perfil/historial)
CREATE INDEX IF NOT EXISTS idx_lesson_questions_student_lesson_v2
  ON public.lesson_questions (student_id, lesson_id, created_at DESC)
  INCLUDE (question_text, upvotes, is_resolved);

-- Filtro por preguntas sin resolver
CREATE INDEX IF NOT EXISTS idx_lesson_questions_lesson_unresolved
  ON public.lesson_questions (lesson_id, is_resolved, created_at DESC)
  WHERE is_resolved = false;

-- NUEVO: Índice para dashboards de instructor (por curso)
CREATE INDEX IF NOT EXISTS idx_lesson_questions_course_created
  ON public.lesson_questions (course_id, created_at DESC)
  INCLUDE (lesson_id, question_text, student_id, is_resolved);

DO $$ BEGIN
  RAISE NOTICE 'Índices de lesson_questions creados';
END $$;

-- ----------------------------------------------------------------------------
-- PASO 3: CREAR ÍNDICES MEJORADOS PARA LESSON_QUESTION_ANSWERS
-- ----------------------------------------------------------------------------

-- Respuestas ordenadas: instructor primero, luego upvotes, luego fecha
CREATE INDEX IF NOT EXISTS idx_lesson_question_answers_question_full
  ON public.lesson_question_answers (
    question_id,
    is_instructor_answer DESC,
    upvotes DESC,
    created_at DESC
  )
  INCLUDE (answer_text, user_id, is_accepted);

-- Índice para conteo rápido de respuestas
CREATE INDEX IF NOT EXISTS idx_lesson_question_answers_question_count
  ON public.lesson_question_answers (question_id)
  INCLUDE (id);

-- Respuestas de un usuario (para perfil/historial)
CREATE INDEX IF NOT EXISTS idx_lesson_question_answers_user_created
  ON public.lesson_question_answers (user_id, created_at DESC)
  INCLUDE (question_id, answer_text, upvotes);

DO $$ BEGIN
  RAISE NOTICE 'Índices de lesson_question_answers creados';
END $$;

-- ----------------------------------------------------------------------------
-- PASO 4: CREAR ÍNDICES MEJORADOS PARA LESSON_NOTES
-- ----------------------------------------------------------------------------

-- Notas de un alumno en una lección (con paginación cursor-based)
CREATE INDEX IF NOT EXISTS idx_lesson_notes_student_lesson_timestamp_id
  ON public.lesson_notes (student_id, lesson_id, video_timestamp, id)
  INCLUDE (content, created_at);

-- Notas por lección (para instructores/admin - vista general)
CREATE INDEX IF NOT EXISTS idx_lesson_notes_lesson_created_at
  ON public.lesson_notes (lesson_id, created_at DESC)
  INCLUDE (student_id, content, video_timestamp);

-- Búsqueda de notas por timestamp específico (para salto en video)
CREATE INDEX IF NOT EXISTS idx_lesson_notes_lesson_timestamp
  ON public.lesson_notes (lesson_id, video_timestamp)
  INCLUDE (student_id, content);

-- NUEVO: Índice para notas por curso (dashboards)
CREATE INDEX IF NOT EXISTS idx_lesson_notes_course_student
  ON public.lesson_notes (course_id, student_id, created_at DESC)
  INCLUDE (lesson_id, content);

DO $$ BEGIN
  RAISE NOTICE 'Índices de lesson_notes creados';
END $$;

-- ----------------------------------------------------------------------------
-- PASO 5: ÍNDICES PARA LESSON_QUESTION_UPVOTES
-- ----------------------------------------------------------------------------

-- Verificar upvotes de un usuario en preguntas específicas
CREATE INDEX IF NOT EXISTS idx_lesson_question_upvotes_user_question
  ON public.lesson_question_upvotes (user_id, question_id);

-- Historial de upvotes de un usuario
CREATE INDEX IF NOT EXISTS idx_lesson_question_upvotes_user_created
  ON public.lesson_question_upvotes (user_id, created_at DESC)
  INCLUDE (question_id);

DO $$ BEGIN
  RAISE NOTICE 'Índices de lesson_question_upvotes creados';
END $$;

-- ----------------------------------------------------------------------------
-- PASO 6: COLUMNA MATERIALIZADA answer_count EN lesson_questions
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Agregar columna si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lesson_questions'
      AND column_name = 'answer_count'
  ) THEN

    RAISE NOTICE 'Agregando columna answer_count...';

    ALTER TABLE public.lesson_questions
      ADD COLUMN answer_count INTEGER DEFAULT 0 NOT NULL;

    -- Poblar valores iniciales
    RAISE NOTICE 'Poblando answer_count inicial (esto puede tomar unos segundos)...';

    UPDATE public.lesson_questions q
    SET answer_count = (
      SELECT COUNT(*)
      FROM public.lesson_question_answers a
      WHERE a.question_id = q.id
    );

    RAISE NOTICE 'Columna answer_count poblada correctamente';

  ELSE
    RAISE NOTICE 'Columna answer_count ya existe, saltando...';
  END IF;
END $$;

-- Índice para ordenar por answer_count
CREATE INDEX IF NOT EXISTS idx_lesson_questions_lesson_answers_desc
  ON public.lesson_questions (lesson_id, answer_count DESC, created_at DESC);

-- ----------------------------------------------------------------------------
-- PASO 7: TRIGGER PARA MANTENER answer_count ACTUALIZADO (SEGURO)
-- ----------------------------------------------------------------------------

-- Función para actualizar contador (SECURITY INVOKER - más seguro)
CREATE OR REPLACE FUNCTION public.update_question_answer_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER  -- Ejecuta con permisos del usuario actual, no del owner
SET search_path = public  -- Previene ataques de search_path
AS $$
DECLARE
  v_question_id UUID;
BEGIN
  -- Determinar question_id según la operación
  IF TG_OP = 'INSERT' THEN
    v_question_id := NEW.question_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_question_id := OLD.question_id;
  END IF;

  -- Actualizar con COUNT real para evitar race conditions
  -- (en lugar de incremento/decremento que puede fallar con concurrencia)
  UPDATE public.lesson_questions
  SET
    answer_count = (
      SELECT COUNT(*)
      FROM public.lesson_question_answers
      WHERE question_id = v_question_id
    ),
    updated_at = NOW()
  WHERE id = v_question_id;

  RETURN NULL;
END;
$$;

-- Revocar permisos públicos de la función por seguridad
REVOKE ALL ON FUNCTION public.update_question_answer_count() FROM PUBLIC;

-- Otorgar solo a roles necesarios
GRANT EXECUTE ON FUNCTION public.update_question_answer_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_question_answer_count() TO service_role;

-- Eliminar trigger viejo si existe
DROP TRIGGER IF EXISTS trg_update_question_answer_count
  ON public.lesson_question_answers;

-- Crear trigger nuevo
CREATE TRIGGER trg_update_question_answer_count
AFTER INSERT OR DELETE ON public.lesson_question_answers
FOR EACH ROW EXECUTE FUNCTION public.update_question_answer_count();

DO $$ BEGIN
  RAISE NOTICE 'Trigger answer_count configurado correctamente (SECURITY INVOKER)';
END $$;

-- ----------------------------------------------------------------------------
-- PASO 8: FUNCIÓN PARA SINCRONIZAR answer_count (MANTENIMIENTO)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_all_answer_counts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE public.lesson_questions q
    SET answer_count = (
      SELECT COUNT(*)
      FROM public.lesson_question_answers a
      WHERE a.question_id = q.id
    )
    WHERE q.answer_count != (
      SELECT COUNT(*)
      FROM public.lesson_question_answers a
      WHERE a.question_id = q.id
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO updated_count FROM updated;

  RETURN updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_all_answer_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_all_answer_counts() TO service_role;

-- ----------------------------------------------------------------------------
-- PASO 9: ACTUALIZAR ESTADÍSTICAS DEL QUERY PLANNER
-- ----------------------------------------------------------------------------

ANALYZE public.lesson_questions;
ANALYZE public.lesson_question_answers;
ANALYZE public.lesson_notes;
ANALYZE public.lesson_question_upvotes;

DO $$ BEGIN
  RAISE NOTICE 'Estadísticas actualizadas';
END $$;

-- ----------------------------------------------------------------------------
-- PASO 10: VERIFICACIÓN FINAL
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  index_count INTEGER;
  questions_with_counts INTEGER;
  total_questions INTEGER;
BEGIN
  -- Contar nuevos índices creados
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('lesson_questions', 'lesson_question_answers', 'lesson_notes', 'lesson_question_upvotes')
    AND (
      indexname LIKE '%_v2'
      OR indexname LIKE '%_full'
      OR indexname LIKE '%_count'
      OR indexname LIKE '%unresolved'
      OR indexname LIKE '%_course_%'
    );

  -- Verificar answer_count
  SELECT COUNT(*) INTO total_questions FROM lesson_questions;

  SELECT COUNT(*) INTO questions_with_counts
  FROM lesson_questions
  WHERE answer_count IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRACIÓN v3.0 COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Índices nuevos creados: %', index_count;
  RAISE NOTICE 'Total de preguntas: %', total_questions;
  RAISE NOTICE 'Preguntas con answer_count: %', questions_with_counts;
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================================
-- FIN DE MIGRACIÓN v3.0
-- ============================================================================

-- NOTA: Las consultas de verificación y el script de rollback se movieron a:
-- supabase/scripts/lessonplayer_indexes_verification.sql
-- Esto evita errores de sintaxis con comentarios de bloque en Supabase.
