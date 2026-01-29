-- ============================================
-- MicroCert - Índices Adicionales de Optimización para Dashboard
-- Fecha: 2026-01-29
-- ============================================
-- Este script crea índices adicionales para mejorar el rendimiento
-- del dashboard y otras operaciones frecuentes.
--
-- Complementa 20260128_performance_indexes.sql
-- ============================================

-- ====================
-- 1. TABLA: student_enrollments
-- ====================
-- Índice principal para buscar inscripciones por estudiante
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id 
ON public.student_enrollments (student_id);

-- Índice para buscar inscripciones por curso (usado en counts)
CREATE INDEX IF NOT EXISTS idx_student_enrollments_course_id 
ON public.student_enrollments (course_id);

-- ====================
-- 2. TABLA: lessons
-- ====================
-- Índice para buscar lecciones por curso (muy frecuente)
CREATE INDEX IF NOT EXISTS idx_lessons_course_id 
ON public.lessons (course_id);

-- Índice para lecciones con fecha programada
CREATE INDEX IF NOT EXISTS idx_lessons_scheduled 
ON public.lessons (start_date) 
WHERE start_date IS NOT NULL;

-- Índice para sección de lecciones
CREATE INDEX IF NOT EXISTS idx_lessons_section 
ON public.lessons (section_id) 
WHERE section_id IS NOT NULL;

-- ====================
-- 3. TABLA: courses
-- ====================
-- Índice para búsqueda por teacher_ids (GIN para arrays)
CREATE INDEX IF NOT EXISTS idx_courses_teacher_ids 
ON public.courses USING GIN (teacher_ids);

-- Índice para ordenamiento por rating (recomendaciones)
CREATE INDEX IF NOT EXISTS idx_courses_rating 
ON public.courses (average_rating DESC NULLS LAST);

-- ====================
-- 4. TABLA: students
-- ====================
-- Índice para buscar estudiante por user_id (1:1 con users)
CREATE INDEX IF NOT EXISTS idx_students_user_id 
ON public.students (user_id);

-- ====================
-- 5. TABLA: users
-- ====================
-- Índice para búsqueda por email (login, verificaciones)
CREATE INDEX IF NOT EXISTS idx_users_email 
ON public.users (email);

-- Índice para filtrar por rol
CREATE INDEX IF NOT EXISTS idx_users_role 
ON public.users (role);

-- ====================
-- 6. TABLA: course_favorites
-- ====================
-- Índice compuesto para verificar si un curso está en favoritos
CREATE INDEX IF NOT EXISTS idx_course_favorites_user_course 
ON public.course_favorites (user_id, course_id);

-- ====================
-- 7. TABLA: course_reviews
-- ====================
-- Índice para verificar si un estudiante ya dejó review
CREATE INDEX IF NOT EXISTS idx_course_reviews_student_course 
ON public.course_reviews (student_id, course_id);

-- ====================
-- 8. TABLA: microcredential_enrollments
-- ====================
-- Índice para buscar inscripciones de microcredencial por estudiante
CREATE INDEX IF NOT EXISTS idx_microcredential_enrollments_student 
ON public.microcredential_enrollments (student_id);

-- Índice para filtrar por estado
CREATE INDEX IF NOT EXISTS idx_microcredential_enrollments_status 
ON public.microcredential_enrollments (status);

-- ====================
-- 9. TABLA: microcredentials
-- ====================
-- Índice para buscar microcredenciales publicadas
CREATE INDEX IF NOT EXISTS idx_microcredentials_published 
ON public.microcredentials (is_published, is_active) 
WHERE is_published = true AND is_active = true;

-- Índice por slug (URL amigable)
CREATE INDEX IF NOT EXISTS idx_microcredentials_slug 
ON public.microcredentials (slug);

-- ====================
-- 10. TABLA: course_sections
-- ====================
-- Índice para buscar secciones por curso
CREATE INDEX IF NOT EXISTS idx_course_sections_course_id 
ON public.course_sections (course_id);

-- ====================
-- 11. TABLA: lesson_attendance
-- ====================
-- Índice para buscar asistencia por estudiante
CREATE INDEX IF NOT EXISTS idx_lesson_attendance_student 
ON public.lesson_attendance (student_id);

-- Índice para buscar asistencia por lección
CREATE INDEX IF NOT EXISTS idx_lesson_attendance_lesson 
ON public.lesson_attendance (lesson_id);

-- ====================
-- Verificación
-- ====================
DO $$
BEGIN
  RAISE NOTICE '✅ Índices adicionales de optimización creados correctamente';
END $$;
