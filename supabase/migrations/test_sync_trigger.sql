-- ============================================================================
-- TEST COMPLETO: Verificar que el trigger sincroniza progreso existente
-- Fecha: 2026-01-21
-- ============================================================================

-- IDs conocidos de la microcredencial:
-- micro_id: 6aa33fc5-6753-48e8-9de4-87f4dc9a9e11
-- course_level_1_id: 43caf9e0-40dd-4519-82ae-4b34ad724b87
-- course_level_2_id: b25fcb01-a2b4-49b4-bd2b-2031bf017d8f

-- =========================
-- PASO 1: Obtener student_id de Pedro Martínez
-- =========================

SELECT s.id as student_id, u.name, u.email 
FROM students s 
JOIN users u ON u.id = s.user_id 
WHERE u.name ILIKE '%Pedro%' OR u.name ILIKE '%Martinez%'
LIMIT 1;

-- =========================
-- PASO 2: Con el student_id, simular cursos completados al 100%
-- REEMPLAZA [STUDENT_ID] con el valor del paso 1
-- =========================

-- Primero, insertar o actualizar progreso de cursos a 100%
INSERT INTO student_enrollments (student_id, course_id, progress, completed_lessons)
VALUES 
  ('[STUDENT_ID]', '43caf9e0-40dd-4519-82ae-4b34ad724b87', 100, '{}'),
  ('[STUDENT_ID]', 'b25fcb01-a2b4-49b4-bd2b-2031bf017d8f', 100, '{}')
ON CONFLICT (student_id, course_id) 
DO UPDATE SET progress = 100, updated_at = NOW();

-- =========================
-- PASO 3: Eliminar inscripción actual a microcredencial
-- (para probar el trigger desde cero)
-- =========================

DELETE FROM microcredential_enrollments 
WHERE student_id = '[STUDENT_ID]' 
  AND microcredential_id = '6aa33fc5-6753-48e8-9de4-87f4dc9a9e11';

-- =========================
-- PASO 4: Re-inscribir (esto dispara el trigger sync_existing_course_progress)
-- =========================

INSERT INTO microcredential_enrollments (student_id, microcredential_id, acquisition_type)
VALUES ('[STUDENT_ID]', '6aa33fc5-6753-48e8-9de4-87f4dc9a9e11', 'free');

-- =========================
-- PASO 5: Verificar que el trigger sincronizó correctamente
-- ESPERADO: level_1_completed=true, level_2_completed=true, badge_unlocked=true
-- =========================

SELECT 
    me.id,
    u.name as estudiante,
    mc.title as microcredencial,
    me.level_1_completed as "L1 Completado",
    me.level_2_unlocked as "L2 Desbloqueado",
    me.level_2_completed as "L2 Completado",
    me.badge_unlocked as "Badge Desbloqueado",
    me.status
FROM microcredential_enrollments me
JOIN microcredentials mc ON mc.id = me.microcredential_id
JOIN students s ON s.id = me.student_id
JOIN users u ON u.id = s.user_id
WHERE me.microcredential_id = '6aa33fc5-6753-48e8-9de4-87f4dc9a9e11'
ORDER BY me.enrolled_at DESC;
