"use client";

import { useEffect, useState } from "react";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabase";
import { userRepository } from "@/lib/repositories/userRepository";
import { User, CreateUserData } from "@/types/user";
import { getSupabaseAuthErrorMessage } from "@/utils/handleError";
import { sendWelcomeEmail } from "@/lib/email/sendWelcomeEmail";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      
      if (session?.user) {
        const userData = await userRepository.findById(session.user.id);
        setUser(userData);
      }
      setLoading(false);
    };

    getInitialSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        
        if (session?.user) {
          const userData = await userRepository.findById(session.user.id);
          setUser(userData);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Inicia sesión del usuario con validación y carga de perfil.
   * 
   * @returns El usuario autenticado con su rol para redirección condicional
   * @throws Error con mensaje amigable si falla
   */
  const signIn = async (email: string, password: string): Promise<User> => {
    // Limpiar estado previo
    setError(null);
    setLoading(true);
    
    try {
      // 1. Validación básica antes de enviar (defensa en profundidad)
      const trimmedEmail = email.toLowerCase().trim();
      if (!trimmedEmail || !password) {
        throw new Error("Correo y contraseña son requeridos");
      }
      
      // 2. Autenticar con Supabase
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (authError) {
        const message = getSupabaseAuthErrorMessage(authError.message);
        setError(message);
        throw new Error(message);
      }

      if (!authData.user || !authData.session) {
        throw new Error("Error inesperado: no se recibió sesión");
      }

      // 3. Actualizar estado de sesión inmediatamente
      setSession(authData.session);
      setSupabaseUser(authData.user);

      // 4. Cargar perfil del usuario desde la tabla users
      const userData = await userRepository.findById(authData.user.id);
      
      if (!userData) {
        // Usuario existe en auth pero no en public.users - posible inconsistencia
        console.warn("Usuario autenticado pero sin perfil en public.users");
        // Crear perfil mínimo para no bloquear el login
        const minimalUser: User = {
          id: authData.user.id,
          email: authData.user.email || trimmedEmail,
          name: authData.user.user_metadata?.name || "Usuario",
          role: "student", // Default seguro
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUser(minimalUser);
        return minimalUser;
      }

      // 5. Actualizar estado global con el usuario completo
      setUser(userData);
      
      return userData;
      
    } catch (err) {
      // Manejar errores de red específicamente
      if (err instanceof TypeError && err.message.includes('fetch')) {
        const networkError = "Error de conexión. Verifica tu internet.";
        setError(networkError);
        throw new Error(networkError);
      }
      
      // Re-throw otros errores
      if (err instanceof Error) {
        setError(err.message);
        throw err;
      }
      
      const genericError = "Error al iniciar sesión";
      setError(genericError);
      throw new Error(genericError);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (data: CreateUserData) => {
    try {
      setError(null);
      setLoading(true);
      
      // Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            last_name: data.lastName,
          },
        },
      });

      if (authError) {
        const message = getSupabaseAuthErrorMessage(authError.message);
        setError(message);
        throw new Error(message);
      }

      if (authData.user) {
        // Crear perfil de usuario en la tabla users
        try {
          await userRepository.create(authData.user.id, data);
          
          // Enviar correo de bienvenida (non-blocking)
          sendWelcomeEmail({
            to: data.email,
            name: data.name,
          }).catch((emailError) => {
            console.error("Error al enviar correo de bienvenida:", emailError);
          });
        } catch (dbError) {
          console.error("Error creando perfil de usuario:", dbError);
          throw new Error("Error al crear el perfil de usuario. Por favor, contacta al administrador.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cierra la sesión del usuario con limpieza completa de estado.
   * 
   * @param options.global - Si es true, invalida todas las sesiones del usuario (default: false)
   * @param options.redirect - URL a la que redirigir después del signOut (default: undefined)
   */
  const signOut = async (options?: { global?: boolean; redirect?: string }) => {
    const { global: globalScope = false, redirect } = options || {};
    
    // 1. Limpiar estado local inmediatamente para UX responsiva
    setUser(null);
    setSession(null);
    setSupabaseUser(null);
    setError(null);
    
    // 2. Limpiar localStorage (datos de la app, no los de Supabase que se limpian con signOut)
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('sb-')) {
          // Preservar claves de Supabase, limpiar el resto relacionado con la app
          if (key.includes('user') || key.includes('cache') || key.includes('token') || key.includes('session')) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.warn('Error limpiando localStorage:', e);
    }
    
    // 3. Limpiar sessionStorage
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn('Error limpiando sessionStorage:', e);
    }
    
    // 4. Intentar signOut en Supabase con manejo de errores de red
    try {
      const { error } = await supabaseClient.auth.signOut({
        scope: globalScope ? 'global' : 'local'
      });
      
      if (error) {
        // Log del error pero no lanzar - el estado local ya está limpio
        console.error('Error en Supabase signOut:', error.message);
      }
    } catch (networkError) {
      // Error de red - el estado local ya está limpio, continuar
      console.warn('Error de red al cerrar sesión (estado local limpiado):', networkError);
    }
    
    // 5. Limpiar cookies de autenticación manualmente (fallback)
    try {
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.split('=');
        if (name && (name.trim().startsWith('sb-') || name.trim().includes('auth'))) {
          document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    } catch (e) {
      console.warn('Error limpiando cookies:', e);
    }
    
    // 6. Redirigir si se especificó
    if (redirect && typeof window !== 'undefined') {
      window.location.href = redirect;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) {
        const message = getSupabaseAuthErrorMessage(error.message);
        setError(message);
        throw new Error(message);
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      const message = error.message || "Error al enviar el correo";
      setError(message);
      throw new Error(message);
    }
  };

  return {
    user,
    session,
    supabaseUser,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isAuthenticated: !!session,
  };
}
