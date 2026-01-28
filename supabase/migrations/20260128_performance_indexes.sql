-- ============================================================
-- Performance Indexes para Módulos de Cursos del Dashboard
-- Fecha: 2026-01-28
-- Auditoría: Vercel React + Supabase Postgres Best Practices
-- 
-- NOTA: Se usa CREATE INDEX (sin CONCURRENTLY) porque las migraciones
-- de Supabase se ejecutan dentro de transacciones.
-- Para producción con tablas grandes, ejecutar manualmente con CONCURRENTLY.
-- ============================================================

-- ===========================================
-- 1. Índice para "Cursos Completados" (student_enrollments)
-- Optimiza: /dashboard/completed-courses
-- Query pattern: WHERE student_id = $1 AND progress = 100
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_student_enrollments_completed 
ON public.student_enrollments (student_id) 
WHERE progress = 100;

COMMENT ON INDEX idx_student_enrollments_completed IS 
'Índice parcial para consultas de cursos completados. Optimiza /dashboard/completed-courses.';

-- ===========================================
-- 2. Índice compuesto para cursos activos/publicados
-- Optimiza: /dashboard/available-courses
-- Query pattern: WHERE is_active = true AND is_published = true
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_courses_active_published 
ON public.courses (is_active, is_published) 
WHERE is_active = true AND is_published = true;

COMMENT ON INDEX idx_courses_active_published IS 
'Índice parcial para cursos visibles. Optimiza catálogo y available-courses.';

-- ===========================================
-- 3. Índice para course_reviews por curso
-- Optimiza: Cálculo de ratings en listas de cursos
-- Query pattern: WHERE course_id = $1
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_course_reviews_course_id 
ON public.course_reviews (course_id);

COMMENT ON INDEX idx_course_reviews_course_id IS 
'Índice para obtener reviews por curso. Mejora cálculo de ratings.';

-- ===========================================
-- 4. Índice para course_favorites por usuario
-- Optimiza: /dashboard/favorites y toggle de favoritos
-- Query pattern: WHERE user_id = $1
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_course_favorites_user_id 
ON public.course_favorites (user_id);

COMMENT ON INDEX idx_course_favorites_user_id IS 
'Índice para favoritos del usuario. Optimiza carga de favoritos en listas.';

-- ===========================================
-- 5. Índice compuesto para lessons activas por curso
-- Optimiza: Conteo de lecciones en tarjetas de curso
-- Query pattern: WHERE course_id = $1 AND is_active = true
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_lessons_course_active 
ON public.lessons (course_id, is_active) 
WHERE is_active = true;

COMMENT ON INDEX idx_lessons_course_active IS 
'Índice parcial para lecciones activas por curso. Optimiza conteo en tarjetas.';

-- ===========================================
-- 6. Índice para microcredential_enrollments por estudiante y estado
-- Optimiza: /dashboard/credentials
-- Query pattern: WHERE student_id = $1 AND status = 'completed'
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_mc_enrollments_student_completed 
ON public.microcredential_enrollments (student_id, status) 
WHERE status = 'completed';

COMMENT ON INDEX idx_mc_enrollments_student_completed IS 
'Índice parcial para microcredenciales completadas. Optimiza /dashboard/credentials.';

-- ===========================================
-- Verificación de índices creados
-- ===========================================
DO $$
BEGIN
  RAISE NOTICE '✅ Índices de performance creados correctamente';
END $$;
