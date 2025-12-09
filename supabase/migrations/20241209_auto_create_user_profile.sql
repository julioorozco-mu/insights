-- Migration: Auto-create user profile on auth signup
-- Purpose: Fix error 401/42501 during sign-up by automatically creating user profile
-- Date: 2024-12-09
-- 
-- This trigger creates a minimal user profile when a new user signs up via Supabase Auth.
-- The full profile data is then updated by the application after signup completes.

-- 1. Create a function that handles new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, name, last_name, role, is_verified)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        'student',
        false
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- 2. Create a trigger that fires when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 3. Also update the RLS policy to allow users to update their own profile
-- (The insert is now handled by the trigger with SECURITY DEFINER)
DROP POLICY IF EXISTS "allow_users_insert_own_profile" ON public.users;

-- 4. Create policy for users to update their own profile (already exists but ensure it's correct)
DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;
CREATE POLICY "users_update_own_profile" ON public.users 
    FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

-- 5. Grant necessary permissions to supabase_auth_admin for the trigger
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON public.users TO supabase_auth_admin;

