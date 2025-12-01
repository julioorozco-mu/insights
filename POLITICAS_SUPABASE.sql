-- ============================================
-- POLÍTICAS RLS SIN RECURSIÓN - VERSIÓN FINAL
-- Copiar y pegar TODO este archivo en el SQL Editor de Supabase
-- ============================================

-- ============================================
-- PASO 1: LIMPIAR TODAS LAS POLÍTICAS EXISTENTES
-- ============================================

-- Limpiar políticas de users
DROP POLICY IF EXISTS "Permitir lectura pública de usuarios verificados" ON users;
DROP POLICY IF EXISTS "Usuarios pueden leer su propio perfil" ON users;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON users;
DROP POLICY IF EXISTS "Admins pueden leer todos los usuarios" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "users_public_read_verified" ON users;
DROP POLICY IF EXISTS "users_read_own_profile" ON users;
DROP POLICY IF EXISTS "users_update_own_profile" ON users;
DROP POLICY IF EXISTS "users_admin_read_all" ON users;
DROP POLICY IF EXISTS "users_admin_update_all" ON users;
DROP POLICY IF EXISTS "users_superadmin_insert" ON users;

-- Limpiar políticas de teachers
DROP POLICY IF EXISTS "Permitir lectura pública de teachers" ON teachers;
DROP POLICY IF EXISTS "Teachers pueden actualizar su propio perfil" ON teachers;
DROP POLICY IF EXISTS "Admins pueden gestionar teachers" ON teachers;
DROP POLICY IF EXISTS "teachers_public_read" ON teachers;
DROP POLICY IF EXISTS "teachers_update_own_profile" ON teachers;
DROP POLICY IF EXISTS "teachers_admin_read_all" ON teachers;
DROP POLICY IF EXISTS "teachers_admin_manage" ON teachers;

-- Limpiar políticas de site_config
DROP POLICY IF EXISTS "Anyone can read site config" ON site_config;
DROP POLICY IF EXISTS "Superadmins can manage site config" ON site_config;
DROP POLICY IF EXISTS "Permitir lectura pública de site_config" ON site_config;
DROP POLICY IF EXISTS "Superadmins pueden gestionar site_config" ON site_config;
DROP POLICY IF EXISTS "site_config_public_read" ON site_config;
DROP POLICY IF EXISTS "site_config_superadmin_manage" ON site_config;

-- ============================================
-- PASO 2: CREAR FUNCIÓN HELPER EN SCHEMA PUBLIC
-- ============================================

-- Eliminar función si existe
DROP FUNCTION IF EXISTS public.get_user_role();

-- Crear función que obtiene el rol del usuario desde JWT
-- IMPORTANTE: Esta función va en el schema PUBLIC, no auth
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'user_role'),
    'authenticated'
  )::text;
$$;

-- ============================================
-- PASO 3: FUNCIÓN Y TRIGGER PARA ACTUALIZAR JWT
-- ============================================

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS on_user_role_change ON public.users;
DROP FUNCTION IF EXISTS public.handle_user_role_jwt();

-- Crear función que actualiza el JWT con el rol del usuario
CREATE OR REPLACE FUNCTION public.handle_user_role_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Actualizar los claims del JWT con el rol del usuario
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('user_role', NEW.role)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Crear trigger que actualiza el JWT cuando cambia el rol
CREATE TRIGGER on_user_role_change
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_role_jwt();

-- ============================================
-- PASO 4: ACTUALIZAR JWT PARA USUARIOS EXISTENTES
-- ============================================

-- Actualizar el JWT de todos los usuarios existentes
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id, role FROM public.users
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) ||
      jsonb_build_object('user_role', user_record.role)
    WHERE id = user_record.id;
  END LOOP;
END $$;

-- ============================================
-- PASO 5: TABLA site_config
-- ============================================

-- Lectura pública (sin autenticación requerida)
CREATE POLICY "site_config_public_read"
ON site_config FOR SELECT
TO public
USING (true);

-- Solo superadmins pueden modificar
CREATE POLICY "site_config_superadmin_manage"
ON site_config FOR ALL
TO authenticated
USING (public.get_user_role() = 'superadmin')
WITH CHECK (public.get_user_role() = 'superadmin');

-- ============================================
-- PASO 6: TABLA users - POLÍTICAS SIMPLIFICADAS
-- ============================================

-- 1. Lectura pública de usuarios verificados (para mostrar info de teachers)
CREATE POLICY "users_public_read_verified"
ON users FOR SELECT
TO public
USING (is_verified = true);

-- 2. Usuarios autenticados pueden leer su propio perfil
CREATE POLICY "users_read_own_profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 3. Usuarios pueden actualizar su propio perfil
CREATE POLICY "users_update_own_profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Admins y superadmins pueden leer todos los usuarios
CREATE POLICY "users_admin_read_all"
ON users FOR SELECT
TO authenticated
USING (public.get_user_role() IN ('admin', 'superadmin'));

-- 5. Admins y superadmins pueden actualizar usuarios
CREATE POLICY "users_admin_update_all"
ON users FOR UPDATE
TO authenticated
USING (public.get_user_role() IN ('admin', 'superadmin'))
WITH CHECK (public.get_user_role() IN ('admin', 'superadmin'));

-- 6. Superadmins pueden insertar nuevos usuarios
CREATE POLICY "users_superadmin_insert"
ON users FOR INSERT
TO authenticated
WITH CHECK (public.get_user_role() = 'superadmin');

-- 7. Admins y superadmins pueden eliminar usuarios
CREATE POLICY "users_admin_delete"
ON users FOR DELETE
TO authenticated
USING (public.get_user_role() IN ('admin', 'superadmin'));

-- ============================================
-- PASO 7: TABLA teachers
-- ============================================

-- 1. Lectura pública de todos los teachers (para /dashboard/teachers)
CREATE POLICY "teachers_public_read"
ON teachers FOR SELECT
TO public
USING (true);

-- 2. Teachers pueden actualizar su propio perfil
CREATE POLICY "teachers_update_own_profile"
ON teachers FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Admins pueden gestionar todos los teachers (INSERT, UPDATE, DELETE)
CREATE POLICY "teachers_admin_manage"
ON teachers FOR ALL
TO authenticated
USING (public.get_user_role() IN ('admin', 'superadmin'))
WITH CHECK (public.get_user_role() IN ('admin', 'superadmin'));

-- ============================================
-- PASO 8: VERIFICACIÓN
-- ============================================

-- Verificar que las políticas se crearon correctamente
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('users', 'teachers', 'site_config')
ORDER BY tablename, policyname;

-- Verificar que la función existe
SELECT proname, pronamespace::regnamespace, prosrc
FROM pg_proc
WHERE proname = 'get_user_role';

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
DESPUÉS DE EJECUTAR ESTE SCRIPT:

1. Los usuarios deberán CERRAR SESIÓN y VOLVER A INICIAR SESIÓN
   para que el JWT se actualice con el rol (user_role)

2. Si ves errores 500, verifica los logs en Supabase:
   Dashboard → Logs → Postgres Logs

3. Para probar la función manualmente:
   SELECT public.get_user_role();

4. Para ver el JWT actual:
   SELECT current_setting('request.jwt.claims', true)::jsonb;

5. Para verificar los roles en auth.users:
   SELECT id, email, raw_app_meta_data
   FROM auth.users
   LIMIT 5;
*/
