-- ============================================================================
-- FIX: Políticas RLS para que teachers puedan gestionar recursos
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================================

-- ===== POLÍTICAS PARA teacher_resources =====

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Teachers can create resources" ON "public"."teacher_resources";
DROP POLICY IF EXISTS "Teachers can view own resources" ON "public"."teacher_resources";
DROP POLICY IF EXISTS "Teachers can update own resources" ON "public"."teacher_resources";
DROP POLICY IF EXISTS "Teachers can delete own resources" ON "public"."teacher_resources";

-- 1. Política para que teachers puedan CREAR recursos
CREATE POLICY "Teachers can create resources"
ON "public"."teacher_resources"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('teacher', 'admin', 'superadmin')
  )
  AND owner_id = auth.uid()
);

-- 2. Política para que teachers puedan VER sus propios recursos
CREATE POLICY "Teachers can view own resources"
ON "public"."teacher_resources"
FOR SELECT
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
  )
);

-- 3. Política para que teachers puedan ACTUALIZAR sus propios recursos
CREATE POLICY "Teachers can update own resources"
ON "public"."teacher_resources"
FOR UPDATE
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
  )
)
WITH CHECK (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
  )
);

-- 4. Política para que teachers puedan ELIMINAR sus propios recursos
CREATE POLICY "Teachers can delete own resources"
ON "public"."teacher_resources"
FOR DELETE
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
  )
);

-- ===== POLÍTICAS PARA file_attachments =====

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can create attachments" ON "public"."file_attachments";
DROP POLICY IF EXISTS "Users can view own attachments" ON "public"."file_attachments";
DROP POLICY IF EXISTS "Users can update own attachments" ON "public"."file_attachments";
DROP POLICY IF EXISTS "Users can delete own attachments" ON "public"."file_attachments";

-- 1. Política para que usuarios autenticados puedan CREAR adjuntos
CREATE POLICY "Users can create attachments"
ON "public"."file_attachments"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
  )
  AND owner_id = auth.uid()
);

-- 2. Política para que usuarios puedan VER sus propios adjuntos
CREATE POLICY "Users can view own attachments"
ON "public"."file_attachments"
FOR SELECT
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin', 'teacher')
  )
);

-- 3. Política para que usuarios puedan ACTUALIZAR sus propios adjuntos
CREATE POLICY "Users can update own attachments"
ON "public"."file_attachments"
FOR UPDATE
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
  )
)
WITH CHECK (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
  )
);

-- 4. Política para que usuarios puedan ELIMINAR sus propios adjuntos
CREATE POLICY "Users can delete own attachments"
ON "public"."file_attachments"
FOR DELETE
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
  )
);

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('teacher_resources', 'file_attachments')
ORDER BY tablename, policyname;

