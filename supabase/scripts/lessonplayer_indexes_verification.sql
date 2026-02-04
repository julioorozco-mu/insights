-- ============================================================================
-- LessonPlayer Q&A + Notes - SCRIPTS DE VERIFICACIÓN Y ROLLBACK
-- ============================================================================
-- 
-- Este archivo contiene:
-- 1. Queries para verificar que la migración se aplicó correctamente
-- 2. Script de rollback en caso de necesitar revertir los cambios
--
-- IMPORTANTE: Ejecutar estos scripts MANUALMENTE desde el SQL Editor de Supabase
-- NO incluir en migraciones automáticas
--
-- ============================================================================

-- ============================================================================
-- SECCIÓN 1: QUERIES DE VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================

-- 1. Ver todos los índices nuevos con su tamaño
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('lesson_questions', 'lesson_question_answers', 'lesson_notes')
  AND (
    indexname LIKE '%_v2'
    OR indexname LIKE '%_full'
    OR indexname LIKE '%_count'
    OR indexname LIKE '%_course_%'
  )
ORDER BY tablename, indexname;

-- 2. Verificar integridad de answer_count
SELECT
  'Preguntas con answer_count correcto' as check_type,
  COUNT(*) as total
FROM lesson_questions q
WHERE q.answer_count = (
  SELECT COUNT(*)
  FROM lesson_question_answers a
  WHERE a.question_id = q.id
)
UNION ALL
SELECT
  'Preguntas con answer_count INCORRECTO' as check_type,
  COUNT(*) as total
FROM lesson_questions q
WHERE q.answer_count != (
  SELECT COUNT(*)
  FROM lesson_question_answers a
  WHERE a.question_id = q.id
);

-- 3. Verificar trigger está activo
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgname = 'trg_update_question_answer_count';

-- 4. Verificar funciones creadas
SELECT
  proname as function_name,
  prosecdef as security_definer,
  proconfig as config
FROM pg_proc
WHERE proname IN ('update_question_answer_count', 'sync_all_answer_counts');

-- 5. Verificar columna answer_count existe
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lesson_questions'
  AND column_name = 'answer_count';

-- ============================================================================
-- SECCIÓN 2: ROLLBACK SEGURO (Solo ejecutar si algo sale mal)
-- ============================================================================
-- 
-- ⚠️  PRECAUCIÓN: Este script REVIERTE todos los cambios de la migración
--     Solo ejecutar si es absolutamente necesario
--
-- Para ejecutar: Descomentar el bloque BEGIN...COMMIT y ejecutar

/*
BEGIN;

-- Eliminar trigger y funciones
DROP TRIGGER IF EXISTS trg_update_question_answer_count ON lesson_question_answers;
DROP FUNCTION IF EXISTS update_question_answer_count();
DROP FUNCTION IF EXISTS sync_all_answer_counts();

-- Eliminar columna answer_count
ALTER TABLE lesson_questions DROP COLUMN IF EXISTS answer_count;

-- Eliminar nuevos índices de lesson_questions
DROP INDEX IF EXISTS idx_lesson_questions_lesson_created_desc_v2;
DROP INDEX IF EXISTS idx_lesson_questions_lesson_upvotes_desc_v2;
DROP INDEX IF EXISTS idx_lesson_questions_student_lesson_v2;
DROP INDEX IF EXISTS idx_lesson_questions_lesson_unresolved;
DROP INDEX IF EXISTS idx_lesson_questions_course_created;
DROP INDEX IF EXISTS idx_lesson_questions_lesson_answers_desc;

-- Eliminar nuevos índices de lesson_question_answers
DROP INDEX IF EXISTS idx_lesson_question_answers_question_full;
DROP INDEX IF EXISTS idx_lesson_question_answers_question_count;
DROP INDEX IF EXISTS idx_lesson_question_answers_user_created;

-- Eliminar nuevos índices de lesson_notes
DROP INDEX IF EXISTS idx_lesson_notes_student_lesson_timestamp_id;
DROP INDEX IF EXISTS idx_lesson_notes_lesson_created_at;
DROP INDEX IF EXISTS idx_lesson_notes_lesson_timestamp;
DROP INDEX IF EXISTS idx_lesson_notes_course_student;

-- Eliminar nuevos índices de lesson_question_upvotes
DROP INDEX IF EXISTS idx_lesson_question_upvotes_user_question;
DROP INDEX IF EXISTS idx_lesson_question_upvotes_user_created;

COMMIT;

-- Verificar que el rollback fue exitoso
SELECT 'Rollback completado. Verificar que los índices fueron eliminados.' as status;
*/

-- ============================================================================
-- SECCIÓN 3: FUNCIÓN DE SINCRONIZACIÓN (Mantenimiento)
-- ============================================================================
--
-- Ejecutar periódicamente para asegurar que answer_count esté sincronizado
-- Útil si hay discrepancias por algún motivo

-- Ver cuántas preguntas necesitan sincronización:
SELECT COUNT(*) as preguntas_desincronizadas
FROM lesson_questions q
WHERE q.answer_count != (
  SELECT COUNT(*)
  FROM lesson_question_answers a
  WHERE a.question_id = q.id
);

-- Ejecutar sincronización (solo si es necesario):
-- SELECT sync_all_answer_counts();

-- ============================================================================
-- FIN DEL ARCHIVO
-- ============================================================================
