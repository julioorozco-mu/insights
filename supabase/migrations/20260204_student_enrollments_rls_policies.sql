-- ============================================================================
-- Migración: RLS Policies para student_enrollments
-- Fecha: 2026-02-04
-- Descripción: Agrega políticas RLS faltantes para la tabla student_enrollments
-- ============================================================================

-- Verificar que RLS esté habilitado (ya debería estarlo)
ALTER TABLE "public"."student_enrollments" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS PARA ESTUDIANTES
-- ============================================================================

-- Los estudiantes pueden ver sus propias inscripciones
DROP POLICY IF EXISTS "student_enrollments_select_own" ON "public"."student_enrollments";
CREATE POLICY "student_enrollments_select_own" ON "public"."student_enrollments"
    FOR SELECT
    TO authenticated
    USING (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    );

-- Los estudiantes pueden actualizar sus propias inscripciones (progreso, etc.)
DROP POLICY IF EXISTS "student_enrollments_update_own" ON "public"."student_enrollments";
CREATE POLICY "student_enrollments_update_own" ON "public"."student_enrollments"
    FOR UPDATE
    TO authenticated
    USING (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- POLÍTICAS PARA ADMINISTRADORES
-- ============================================================================

-- Admins y superadmins pueden ver todas las inscripciones
DROP POLICY IF EXISTS "student_enrollments_admin_select" ON "public"."student_enrollments";
CREATE POLICY "student_enrollments_admin_select" ON "public"."student_enrollments"
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'superadmin', 'support')
        )
    );

-- Admins pueden insertar inscripciones
DROP POLICY IF EXISTS "student_enrollments_admin_insert" ON "public"."student_enrollments";
CREATE POLICY "student_enrollments_admin_insert" ON "public"."student_enrollments"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'superadmin')
        )
    );

-- Admins pueden actualizar inscripciones
DROP POLICY IF EXISTS "student_enrollments_admin_update" ON "public"."student_enrollments";
CREATE POLICY "student_enrollments_admin_update" ON "public"."student_enrollments"
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'superadmin')
        )
    );

-- Admins pueden eliminar inscripciones
DROP POLICY IF EXISTS "student_enrollments_admin_delete" ON "public"."student_enrollments";
CREATE POLICY "student_enrollments_admin_delete" ON "public"."student_enrollments"
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'superadmin')
        )
    );

-- ============================================================================
-- POLÍTICAS PARA INSTRUCTORES
-- ============================================================================

-- Instructores pueden ver inscripciones de sus cursos
DROP POLICY IF EXISTS "student_enrollments_teacher_select" ON "public"."student_enrollments";
CREATE POLICY "student_enrollments_teacher_select" ON "public"."student_enrollments"
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = student_enrollments.course_id
            AND auth.uid() = ANY(courses.teacher_ids)
        )
    );

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'RLS policies for student_enrollments created successfully';
END $$;
