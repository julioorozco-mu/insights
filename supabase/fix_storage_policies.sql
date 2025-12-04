-- ============================================================================
-- FIX: Políticas RLS de Storage para buckets de recursos
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================================

-- ===== POLÍTICAS PARA BUCKET 'attachments' =====

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "attachments_auth_read" ON storage.objects;
DROP POLICY IF EXISTS "attachments_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "attachments_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "attachments_auth_delete" ON storage.objects;

-- Lectura: Usuarios autenticados
CREATE POLICY "attachments_auth_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'attachments');

-- Upload: Usuarios autenticados pueden subir
CREATE POLICY "attachments_auth_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Update: Usuarios autenticados
CREATE POLICY "attachments_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'attachments')
WITH CHECK (bucket_id = 'attachments');

-- Delete: Usuarios autenticados
CREATE POLICY "attachments_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments');

-- ===== POLÍTICAS PARA BUCKET 'resources' =====

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "resources_auth_read" ON storage.objects;
DROP POLICY IF EXISTS "resources_owner_upload" ON storage.objects;
DROP POLICY IF EXISTS "resources_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "resources_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "resources_auth_delete" ON storage.objects;

-- Lectura: Usuarios autenticados
CREATE POLICY "resources_auth_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resources');

-- Upload: Usuarios autenticados pueden subir (relajado para recursos)
CREATE POLICY "resources_auth_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resources');

-- Update: Usuarios autenticados
CREATE POLICY "resources_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'resources')
WITH CHECK (bucket_id = 'resources');

-- Delete: Usuarios autenticados
CREATE POLICY "resources_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resources');

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%attachments%' OR policyname LIKE '%resources%'
ORDER BY policyname;

