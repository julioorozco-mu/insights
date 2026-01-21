-- ============================================================================
-- RESET: Limpieza de Datos de Prueba
-- ⚠️ SOLO EJECUTAR EN AMBIENTE DE PRUEBAS
-- ============================================================================
-- Paso 1: Eliminar inscripciones a microcredenciales
DELETE FROM public.microcredential_enrollments;
-- Paso 2: Eliminar inscripciones a cursos (opcional - descomenta si lo necesitas)
DELETE FROM public.student_enrollments;
-- Paso 3: Resetear progreso de cursos (alternativa a eliminar)
UPDATE public.student_enrollments
SET 
    progress = 0,
    completed_lessons = '{}',
    subsection_progress = '{}',
    updated_at = NOW();
-- Verificación
SELECT 
    'Reset completado' as status,
    (SELECT COUNT(*) FROM microcredential_enrollments) as mc_enrollments_count,
    (SELECT COUNT(*) FROM student_enrollments WHERE progress > 0) as se_with_progress
;