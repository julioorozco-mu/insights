-- ============================================================================
-- FIX: Políticas RLS para que teachers puedan gestionar cursos
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Política para que teachers puedan CREAR cursos
-- El teacher debe estar incluido en teacher_ids del curso
CREATE POLICY "Teachers can create courses"
ON "public"."courses"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('teacher', 'admin', 'superadmin')
  )
  AND auth.uid() = ANY(teacher_ids)
);

-- 2. Política para que teachers puedan ACTUALIZAR sus propios cursos
CREATE POLICY "Teachers can update own courses"
ON "public"."courses"
FOR UPDATE
USING (
  auth.uid() = ANY(teacher_ids)
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
  )
);

-- 3. Política para que teachers puedan VER sus propios cursos (incluso inactivos)
CREATE POLICY "Teachers can view own courses"
ON "public"."courses"
FOR SELECT
USING (
  auth.uid() = ANY(teacher_ids)
  OR auth.uid() = ANY(co_host_ids)
);

-- 4. Política para que teachers puedan ELIMINAR sus propios cursos
CREATE POLICY "Teachers can delete own courses"
ON "public"."courses"
FOR DELETE
USING (
  auth.uid() = ANY(teacher_ids)
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
  )
);

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'courses';
