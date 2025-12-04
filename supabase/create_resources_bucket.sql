-- ============================================================================
-- CREAR BUCKET 'resources' PARA RECURSOS DE PROFESORES
-- Si el bucket attachments no acepta todos los tipos, crear resources
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================================

-- Crear bucket 'resources' si no existe (para materiales educativos de profesores)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resources',
  'resources',
  false, -- Privado
  52428800, -- 50 MB
  ARRAY[
    -- Todos los tipos de documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'text/markdown',
    -- Imágenes
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    -- Archivos comprimidos
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    -- Otros
    'application/json',
    'application/xml'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas RLS para el bucket 'resources'

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "resources_auth_read" ON storage.objects;
DROP POLICY IF EXISTS "resources_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "resources_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "resources_auth_delete" ON storage.objects;

-- Lectura: Usuarios autenticados pueden leer recursos
CREATE POLICY "resources_auth_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resources');

-- Upload: Usuarios autenticados pueden subir
CREATE POLICY "resources_auth_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resources'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update: Usuarios autenticados pueden actualizar sus propios archivos
CREATE POLICY "resources_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resources'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'resources'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete: Usuarios autenticados pueden eliminar sus propios archivos
CREATE POLICY "resources_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resources'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Verificar que el bucket se creó correctamente
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'resources';

