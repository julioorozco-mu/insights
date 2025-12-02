-- ============================================================================
-- SUPABASE STORAGE SETUP - MicroCert by Marca UNACH
-- ============================================================================
-- Este script configura todos los buckets de almacenamiento y sus políticas RLS.
-- Ejecutar en el SQL Editor de Supabase Dashboard.
--
-- BUCKETS:
--   1. avatars      - Fotos de perfil (público)
--   2. covers       - Portadas de cursos y perfiles (público)
--   3. certificates - Fondos y certificados generados (público)
--   4. resources    - Materiales educativos de profesores (privado)
--   5. attachments  - Adjuntos de lecciones/cursos (privado)
--   6. submissions  - Entregas de estudiantes (privado)
--   7. videos       - Videos de lecciones (privado)
-- ============================================================================

-- Limpiar políticas existentes si es necesario (comentar si no aplica)
-- DELETE FROM storage.policies WHERE bucket_id IN ('avatars', 'covers', 'certificates', 'resources', 'attachments', 'submissions', 'videos');

-- ============================================================================
-- 1. BUCKET: avatars (Público)
-- Fotos de perfil de usuarios
-- Ruta esperada: avatars/{user_id}/{filename}
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas para avatars
-- Lectura: Cualquiera puede ver (bucket público)
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Upload: Solo usuarios autenticados pueden subir a su propia carpeta
CREATE POLICY "avatars_auth_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update: Solo el dueño puede actualizar sus archivos
CREATE POLICY "avatars_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete: Solo el dueño puede eliminar sus archivos
CREATE POLICY "avatars_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- 2. BUCKET: covers (Público)
-- Portadas de cursos, perfiles de profesores
-- Rutas esperadas: 
--   covers/courses/{course_id}/{filename}
--   covers/teachers/{user_id}/{filename}
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas para covers
-- Lectura: Cualquiera puede ver
CREATE POLICY "covers_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'covers');

-- Upload: Usuarios autenticados (teachers/admin) pueden subir
-- La lógica de negocio se valida en la app
CREATE POLICY "covers_auth_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'covers');

-- Update: Usuarios autenticados pueden actualizar
CREATE POLICY "covers_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'covers')
WITH CHECK (bucket_id = 'covers');

-- Delete: Usuarios autenticados pueden eliminar
CREATE POLICY "covers_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'covers');

-- ============================================================================
-- 3. BUCKET: certificates (Público)
-- Fondos de plantillas y certificados PDF/imagen generados
-- Rutas esperadas:
--   certificates/backgrounds/{filename}
--   certificates/signatures/{user_id}/{filename}
--   certificates/issued/{certificate_id}.pdf
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas para certificates
-- Lectura: Cualquiera puede ver (para validación de certificados)
CREATE POLICY "certificates_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificates');

-- Upload: Solo usuarios autenticados
CREATE POLICY "certificates_auth_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'certificates');

-- Update: Solo usuarios autenticados
CREATE POLICY "certificates_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'certificates')
WITH CHECK (bucket_id = 'certificates');

-- Delete: Solo usuarios autenticados
CREATE POLICY "certificates_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'certificates');

-- ============================================================================
-- 4. BUCKET: resources (Privado)
-- Materiales educativos de profesores (PDFs, docs, presentaciones, etc.)
-- Ruta esperada: resources/{user_id}/{filename}
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resources',
  'resources',
  false,
  15728640, -- 15 MB
  ARRAY[
    -- Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    -- Imágenes
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    -- Archivos comprimidos
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    -- Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas para resources
-- Lectura: Usuarios autenticados pueden leer (inscripción se valida en app)
CREATE POLICY "resources_auth_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resources');

-- Upload: Solo el dueño puede subir a su carpeta
CREATE POLICY "resources_owner_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resources'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update: Solo el dueño puede actualizar
CREATE POLICY "resources_owner_update"
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

-- Delete: Solo el dueño puede eliminar
CREATE POLICY "resources_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resources'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- 5. BUCKET: attachments (Privado)
-- Adjuntos de lecciones y cursos
-- Rutas esperadas:
--   attachments/lessons/{lesson_id}/{filename}
--   attachments/courses/{course_id}/{filename}
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,
  10485760, -- 10 MB
  ARRAY[
    -- Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    -- Imágenes
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    -- Archivos comprimidos
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas para attachments
-- Lectura: Usuarios autenticados
CREATE POLICY "attachments_auth_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'attachments');

-- Upload: Usuarios autenticados (validación de permisos en app)
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

-- ============================================================================
-- 6. BUCKET: submissions (Privado)
-- Entregas de estudiantes (respuestas a quizzes con archivos)
-- Ruta esperada: submissions/{student_id}/{form_template_id}/{filename}
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  false,
  5242880, -- 5 MB
  ARRAY[
    -- Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    -- Imágenes
    'image/jpeg',
    'image/png',
    'image/gif',
    -- Video (respuestas en video)
    'video/mp4',
    'video/webm',
    -- Audio
    'audio/mpeg',
    'audio/wav',
    'audio/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas para submissions
-- Lectura: El dueño puede leer sus propios archivos, teachers pueden leer todos
CREATE POLICY "submissions_owner_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submissions'
  AND (
    -- El estudiante puede ver sus propios archivos
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Teachers y admins pueden ver todos (verificar rol en JWT)
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('teacher', 'admin', 'superadmin')
    )
  )
);

-- Upload: Solo el estudiante puede subir a su propia carpeta
CREATE POLICY "submissions_student_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update: Solo el dueño puede actualizar
CREATE POLICY "submissions_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete: El dueño o admins pueden eliminar
CREATE POLICY "submissions_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'submissions'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'superadmin')
    )
  )
);

-- ============================================================================
-- 7. BUCKET: videos (Privado)
-- Videos de lecciones y grabaciones de sesiones
-- Rutas esperadas:
--   videos/lessons/{lesson_id}/{filename}
--   videos/recordings/{lesson_id}/{filename}
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  false,
  524288000, -- 500 MB
  ARRAY[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas para videos
-- Lectura: Usuarios autenticados (validación de inscripción en app)
CREATE POLICY "videos_auth_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'videos');

-- Upload: Solo teachers y admins pueden subir
CREATE POLICY "videos_teacher_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos'
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('teacher', 'admin', 'superadmin')
  )
);

-- Update: Solo teachers y admins
CREATE POLICY "videos_teacher_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos'
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('teacher', 'admin', 'superadmin')
  )
)
WITH CHECK (
  bucket_id = 'videos'
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('teacher', 'admin', 'superadmin')
  )
);

-- Delete: Solo admins pueden eliminar videos
CREATE POLICY "videos_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos'
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'superadmin')
  )
);

-- ============================================================================
-- BUCKET LEGACY: files (Migración)
-- Este bucket existía antes. Lo mantenemos temporalmente para compatibilidad.
-- NOTA: Migrar archivos existentes a los nuevos buckets y luego eliminar.
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'files',
  'files',
  true,
  3145728, -- 3 MB
  NULL -- Permitir cualquier tipo por ahora
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- Políticas permisivas para el bucket legacy
CREATE POLICY "files_legacy_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'files');

CREATE POLICY "files_legacy_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'files');

CREATE POLICY "files_legacy_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'files')
WITH CHECK (bucket_id = 'files');

CREATE POLICY "files_legacy_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'files');

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

-- Función para obtener URL firmada (para archivos privados)
-- Usar desde el backend con service_role key
CREATE OR REPLACE FUNCTION public.get_signed_url(
  bucket_name TEXT,
  file_path TEXT,
  expires_in_seconds INTEGER DEFAULT 3600
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result TEXT;
BEGIN
  -- Esta función debe ser llamada desde el backend con service_role
  -- para generar URLs firmadas de archivos privados
  SELECT storage.get_public_url(bucket_name, file_path) INTO result;
  RETURN result;
END;
$$;

-- ============================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================================================
-- 
-- 1. MIGRACIÓN DE ARCHIVOS EXISTENTES:
--    Los archivos actualmente en el bucket 'files' deben migrarse:
--    - files/avatars/* → avatars/{user_id}/*
--    - files/covers/* → covers/{type}/{id}/*
--    - files/resources/* → resources/{user_id}/*
--    - files/certificates/* → certificates/*
--
-- 2. ACTUALIZAR REFERENCIAS EN LA APP:
--    Modificar los servicios para usar los nuevos buckets:
--    - src/lib/services/fileService.ts
--    - src/components/resources/ResourceUploadModal.tsx
--    - src/app/dashboard/settings/page.tsx (avatar/cover upload)
--    - src/app/dashboard/certificates/*/page.tsx
--
-- 3. URLs FIRMADAS PARA ARCHIVOS PRIVADOS:
--    Para los buckets privados (resources, attachments, submissions, videos),
--    usar createSignedUrl() en lugar de getPublicUrl():
--
--    const { data, error } = await supabaseClient.storage
--      .from('resources')
--      .createSignedUrl('path/to/file.pdf', 3600); // 1 hora
--
-- 4. VERIFICACIÓN DE INSCRIPCIÓN:
--    Para recursos de cursos, validar en la app que el usuario esté inscrito
--    antes de generar la URL firmada.
--
-- ============================================================================

-- Verificar que los buckets se crearon correctamente
SELECT id, name, public, file_size_limit, 
       array_length(allowed_mime_types, 1) as mime_types_count
FROM storage.buckets
WHERE id IN ('avatars', 'covers', 'certificates', 'resources', 'attachments', 'submissions', 'videos', 'files')
ORDER BY id;
