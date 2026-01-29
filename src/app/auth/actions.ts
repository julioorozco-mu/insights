/**
 * Auth Server Actions
 * MicroCert by Marca UNACH
 * 
 * Server Actions para autenticación usando Supabase.
 * Estas funciones se ejecutan en el servidor y manejan cookies automáticamente.
 * 
 * Skill: nextjs-supabase-auth
 * - Usa @supabase/ssr para App Router integration
 * - Nunca expone tokens al cliente innecesariamente
 * - Usa getUser() para máxima seguridad
 * 
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

"use server";

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { loginSchema, createUserSchema, type LoginInput, type CreateUserInput } from '@/lib/validators/userSchema';
import { getSupabaseAuthErrorMessage } from '@/utils/handleError';

// ============================================
// Types
// ============================================

export type AuthActionResult = {
    success: boolean;
    error: string | null;
    redirectTo?: string;
};

export type LoginActionResult = AuthActionResult & {
    userRole?: string;
};

export type SignupActionResult = AuthActionResult & {
    userId?: string;
};

// ============================================
// LOGIN ACTION
// ============================================

/**
 * Server Action para iniciar sesión.
 * Valida los datos con Zod y usa Supabase Auth.
 * 
 * @param formData - FormData del formulario de login
 * @returns Resultado con error o URL de redirección
 */
export async function loginAction(formData: FormData): Promise<LoginActionResult> {
    // 1. Extraer y validar datos
    const rawData = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    };

    const validationResult = loginSchema.safeParse(rawData);

    if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        return {
            success: false,
            error: firstError?.message || 'Datos de inicio de sesión inválidos',
        };
    }

    const { email, password } = validationResult.data;

    // 2. Intentar login con Supabase
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        const message = getSupabaseAuthErrorMessage(error.message);
        return {
            success: false,
            error: message,
        };
    }

    if (!data.user || !data.session) {
        return {
            success: false,
            error: 'Error inesperado: no se recibió sesión',
        };
    }

    // 3. Obtener rol del usuario para redirección inteligente
    const userRole = data.user.app_metadata?.role || data.user.user_metadata?.role || 'student';

    // 4. Revalidar rutas para que reflejen el nuevo estado de auth
    revalidatePath('/', 'layout');

    // 5. Determinar URL de redirección según rol
    let redirectTo = '/dashboard';
    if (userRole === 'admin' || userRole === 'superadmin') {
        redirectTo = '/dashboard';
    }

    return {
        success: true,
        error: null,
        redirectTo,
        userRole,
    };
}

// ============================================
// SIGNUP ACTION
// ============================================

/**
 * Server Action para registro de usuarios.
 * Valida datos con Zod, crea usuario en Supabase Auth y actualiza perfil.
 * 
 * @param formData - FormData del formulario de registro
 * @returns Resultado con error o éxito
 */
export async function signupAction(formData: FormData): Promise<SignupActionResult> {
    // 1. Extraer datos del FormData
    const rawData = {
        name: formData.get('name') as string,
        lastName: formData.get('lastName') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        username: formData.get('username') as string,
        dateOfBirth: formData.get('dateOfBirth') as string,
        gender: formData.get('gender') as string,
        state: formData.get('state') as string,
        municipality: formData.get('municipality') as string || undefined,
        curp: formData.get('curp') as string,
        password: formData.get('password') as string,
        confirmPassword: formData.get('confirmPassword') as string,
        role: 'student' as const,
    };

    // 2. Validar con Zod
    const validationResult = createUserSchema.safeParse(rawData);

    if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        return {
            success: false,
            error: firstError?.message || 'Datos de registro inválidos',
        };
    }

    const validatedData = validationResult.data as CreateUserInput;

    // 3. Verificar unicidad de email y CURP antes de crear usuario
    const supabaseAdmin = getSupabaseAdmin();

    // Verificar email
    const { data: existingEmail } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', validatedData.email)
        .single();

    if (existingEmail) {
        return {
            success: false,
            error: 'Este correo electrónico ya está registrado',
        };
    }

    // Verificar CURP
    const { data: existingCurp } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('curp', validatedData.curp)
        .single();

    if (existingCurp) {
        return {
            success: false,
            error: 'Este CURP ya está registrado. Si es tu CURP, contacta al administrador.',
        };
    }

    // 4. Crear usuario en Supabase Auth
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
            emailRedirectTo: undefined, // No requerir confirmación de email
            data: {
                name: validatedData.name,
                last_name: validatedData.lastName,
                role: 'student',
            },
        },
    });

    if (authError) {
        const message = getSupabaseAuthErrorMessage(authError.message);
        return {
            success: false,
            error: message,
        };
    }

    if (!authData.user) {
        return {
            success: false,
            error: 'Error inesperado al crear el usuario',
        };
    }

    // 5. Actualizar perfil con datos adicionales usando admin client
    // El trigger public.handle_new_user() crea el perfil básico,
    // pero necesitamos actualizar con todos los campos adicionales
    const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
            name: validatedData.name,
            last_name: validatedData.lastName,
            phone: validatedData.phone,
            username: validatedData.username,
            date_of_birth: validatedData.dateOfBirth,
            gender: validatedData.gender,
            state: validatedData.state,
            municipality: validatedData.municipality,
            curp: validatedData.curp,
            role: 'student',
        })
        .eq('id', authData.user.id);

    if (updateError) {
        console.error('[signupAction] Error actualizando perfil:', updateError);
        // No fallamos aquí porque el usuario ya fue creado
        // Los datos básicos ya están en la tabla por el trigger
    }

    // 6. Confirmar email automáticamente (si está configurado)
    try {
        await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
            email_confirm: true,
        });
    } catch (confirmError) {
        console.warn('[signupAction] No se pudo confirmar email automáticamente:', confirmError);
    }

    // 7. Iniciar sesión automáticamente después del registro
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
    });

    if (signInError) {
        console.warn('[signupAction] No se pudo iniciar sesión automáticamente:', signInError);
        // El usuario fue creado exitosamente, solo no se pudo iniciar sesión
        return {
            success: true,
            error: null,
            userId: authData.user.id,
            redirectTo: '/auth/login', // Redirigir a login si no se pudo iniciar sesión
        };
    }

    // 8. Revalidar rutas
    revalidatePath('/', 'layout');

    return {
        success: true,
        error: null,
        userId: authData.user.id,
        redirectTo: '/dashboard',
    };
}

// ============================================
// LOGOUT ACTION
// ============================================

/**
 * Server Action para cerrar sesión.
 * Limpia las cookies de sesión en el servidor.
 * 
 * NOTA: Retorna resultado en lugar de hacer redirect para evitar
 * condiciones de carrera con el AuthContext del cliente.
 */
export async function logoutAction(): Promise<AuthActionResult> {
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error('[logoutAction] Error cerrando sesión:', error);
        return {
            success: false,
            error: 'Error al cerrar sesión',
        };
    }

    // Revalidar todas las rutas para limpiar caché
    revalidatePath('/', 'layout');

    return {
        success: true,
        error: null,
        redirectTo: '/',
    };
}

// ============================================
// PASSWORD RESET ACTION
// ============================================

/**
 * Server Action para solicitar restablecimiento de contraseña.
 * 
 * @param formData - FormData con el email
 * @returns Resultado con error o éxito
 */
export async function resetPasswordAction(formData: FormData): Promise<AuthActionResult> {
    const email = formData.get('email') as string;

    if (!email || !email.includes('@')) {
        return {
            success: false,
            error: 'Correo electrónico inválido',
        };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
    });

    if (error) {
        const message = getSupabaseAuthErrorMessage(error.message);
        return {
            success: false,
            error: message,
        };
    }

    return {
        success: true,
        error: null,
    };
}

// ============================================
// HELPER: Get Current User (Server-side)
// ============================================

/**
 * Obtiene el usuario actual desde el servidor.
 * Usa getUser() para máxima seguridad (verifica el JWT con Supabase).
 * 
 * @returns El usuario autenticado o null
 */
export async function getCurrentUser() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return null;
    }

    return user;
}
