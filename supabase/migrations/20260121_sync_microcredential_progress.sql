-- ============================================================================
-- MIGRACIÓN: Sincronización de Progreso de Microcredenciales
-- Fecha: 2026-01-21
-- Descripción: Implementa función y trigger para sincronizar progreso existente
--              de cursos cuando un estudiante se inscribe a una microcredencial
-- ============================================================================

-- ============================================================================
-- PASO 1: Crear Función de Sincronización
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_existing_course_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_level1_progress INTEGER;
    v_level2_progress INTEGER;
    v_course_level_1_id UUID;
    v_course_level_2_id UUID;
BEGIN
    -- Obtener IDs de cursos de la microcredencial
    SELECT course_level_1_id, course_level_2_id 
    INTO v_course_level_1_id, v_course_level_2_id
    FROM public.microcredentials 
    WHERE id = NEW.microcredential_id;
    
    -- Verificar progreso existente del Nivel 1
    SELECT COALESCE(progress, 0) INTO v_level1_progress
    FROM public.student_enrollments
    WHERE student_id = NEW.student_id 
    AND course_id = v_course_level_1_id;
    
    -- Verificar progreso existente del Nivel 2
    SELECT COALESCE(progress, 0) INTO v_level2_progress
    FROM public.student_enrollments
    WHERE student_id = NEW.student_id 
    AND course_id = v_course_level_2_id;
    
    -- Si no hay inscripción previa, tratar como 0
    v_level1_progress := COALESCE(v_level1_progress, 0);
    v_level2_progress := COALESCE(v_level2_progress, 0);
    
    -- Sincronizar Nivel 1 si ya está completado
    IF v_level1_progress = 100 THEN
        NEW.level_1_completed := true;
        NEW.level_1_completed_at := NOW();
        NEW.level_2_unlocked := true;
        NEW.level_2_unlocked_at := NOW();
    END IF;
    
    -- Sincronizar Nivel 2 si ya está completado
    IF v_level2_progress = 100 THEN
        NEW.level_2_completed := true;
        NEW.level_2_completed_at := NOW();
    END IF;
    
    -- Si ambos están completos, desbloquear badge
    IF v_level1_progress = 100 AND v_level2_progress = 100 THEN
        NEW.status := 'completed';
        NEW.completed_at := NOW();
        NEW.badge_unlocked := true;
        NEW.badge_unlocked_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$;

-- Comentario descriptivo
COMMENT ON FUNCTION public.sync_existing_course_progress() IS 
'Sincroniza el progreso de cursos existentes al crear inscripción a microcredencial. 
Se ejecuta BEFORE INSERT para modificar los valores antes de guardar.';

-- ============================================================================
-- PASO 2: Crear Trigger
-- ============================================================================

-- Primero eliminar si existe (para poder recrear)
DROP TRIGGER IF EXISTS before_microcredential_enrollment_insert 
ON public.microcredential_enrollments;

-- Crear el trigger
CREATE TRIGGER before_microcredential_enrollment_insert
    BEFORE INSERT ON public.microcredential_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_existing_course_progress();

-- ============================================================================
-- PASO 3: Migrar Datos Históricos (si existen)
-- ============================================================================

-- Actualizar Nivel 1 completado
UPDATE public.microcredential_enrollments me
SET 
    level_1_completed = true,
    level_1_completed_at = COALESCE(me.level_1_completed_at, NOW()),
    level_2_unlocked = true,
    level_2_unlocked_at = COALESCE(me.level_2_unlocked_at, NOW()),
    updated_at = NOW()
FROM public.microcredentials mc
JOIN public.student_enrollments se ON se.course_id = mc.course_level_1_id
WHERE me.microcredential_id = mc.id
  AND me.student_id = se.student_id
  AND se.progress = 100
  AND me.level_1_completed = false;

-- Actualizar Nivel 2 completado
UPDATE public.microcredential_enrollments me
SET 
    level_2_completed = true,
    level_2_completed_at = COALESCE(me.level_2_completed_at, NOW()),
    updated_at = NOW()
FROM public.microcredentials mc
JOIN public.student_enrollments se ON se.course_id = mc.course_level_2_id
WHERE me.microcredential_id = mc.id
  AND me.student_id = se.student_id
  AND se.progress = 100
  AND me.level_2_completed = false;

-- Desbloquear Badge si ambos niveles completados
UPDATE public.microcredential_enrollments
SET 
    status = 'completed',
    completed_at = COALESCE(completed_at, NOW()),
    badge_unlocked = true,
    badge_unlocked_at = COALESCE(badge_unlocked_at, NOW()),
    updated_at = NOW()
WHERE level_1_completed = true
  AND level_2_completed = true
  AND badge_unlocked = false;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que la función existe
SELECT 
    'Función creada' as paso_1,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'sync_existing_course_progress') as ok;

-- Verificar que el trigger existe
SELECT 
    'Trigger creado' as paso_2,
    EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'before_microcredential_enrollment_insert') as ok;

-- Verificar estado de inscripciones
SELECT 
    '✅ Migración completada' as paso_3,
    COUNT(*) as total_enrollments,
    COUNT(*) FILTER (WHERE level_1_completed) as nivel_1_completados,
    COUNT(*) FILTER (WHERE level_2_completed) as nivel_2_completados,
    COUNT(*) FILTER (WHERE badge_unlocked) as badges_desbloqueados
FROM public.microcredential_enrollments;
