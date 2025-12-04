-- ============================================================================
-- FIX: Políticas RLS para que teachers puedan gestionar lecciones
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================================

-- Eliminar políticas existentes si existen (para evitar conflictos)
DROP POLICY IF EXISTS "Teachers can create lessons" ON "public"."lessons";
DROP POLICY IF EXISTS "Teachers can update own lessons" ON "public"."lessons";
DROP POLICY IF EXISTS "Teachers can view lessons from their courses" ON "public"."lessons";
DROP POLICY IF EXISTS "Teachers can delete own lessons" ON "public"."lessons";

-- 1. Política para que teachers puedan CREAR lecciones
-- El teacher debe ser teacher del curso asociado
CREATE POLICY "Teachers can create lessons"
ON "public"."lessons"
FOR INSERT
WITH CHECK (
  -- Debe ser teacher, admin o superadmin
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('teacher', 'admin', 'superadmin')
  )
  AND (
    -- El usuario es el creador de la lección
    created_by = auth.uid()
    OR
    -- O es teacher del curso asociado (en INSERT, course_id se refiere a la columna del nuevo registro)
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_id
      AND auth.uid() = ANY(courses.teacher_ids)
    )
    OR
    -- O es admin/superadmin
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  )
);

-- 2. Política para que teachers puedan ACTUALIZAR sus propias lecciones
CREATE POLICY "Teachers can update own lessons"
ON "public"."lessons"
FOR UPDATE
USING (
  -- Es el creador de la lección
  created_by = auth.uid()
  OR
  -- O es teacher del curso asociado
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = lessons.course_id
    AND auth.uid() = ANY(courses.teacher_ids)
  )
  OR
  -- O es admin/superadmin
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
  )
)
WITH CHECK (
  -- Mismas condiciones para el WITH CHECK
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = lessons.course_id
    AND auth.uid() = ANY(courses.teacher_ids)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
  )
);

-- 3. Política para que teachers puedan VER las lecciones de sus cursos
CREATE POLICY "Teachers can view lessons from their courses"
ON "public"."lessons"
FOR SELECT
USING (
  -- Es el creador de la lección
  created_by = auth.uid()
  OR
  -- O es teacher del curso asociado
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = lessons.course_id
    AND auth.uid() = ANY(courses.teacher_ids)
  )
  OR
  -- O es co-host del curso
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = lessons.course_id
    AND auth.uid() = ANY(courses.co_host_ids)
  )
  OR
  -- O la lección está publicada y el curso está publicado
  (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lessons.course_id
      AND courses.is_active = true
    )
  )
  OR
  -- O es admin/superadmin
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
  )
);

-- 4. Política para que teachers puedan ELIMINAR sus propias lecciones
CREATE POLICY "Teachers can delete own lessons"
ON "public"."lessons"
FOR DELETE
USING (
  -- Es el creador de la lección
  created_by = auth.uid()
  OR
  -- O es teacher del curso asociado
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = lessons.course_id
    AND auth.uid() = ANY(courses.teacher_ids)
  )
  OR
  -- O es admin/superadmin
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
  )
);

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'lessons'
ORDER BY policyname;
