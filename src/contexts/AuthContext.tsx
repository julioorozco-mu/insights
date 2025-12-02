"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabase";
import { userRepository } from "@/lib/repositories/userRepository";
import { User, CreateUserData } from "@/types/user";
import { getSupabaseAuthErrorMessage } from "@/utils/handleError";
import { sendWelcomeEmail } from "@/lib/email/sendWelcomeEmail";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (data: CreateUserData) => Promise<void>;
  signOut: (options?: { global?: boolean; redirect?: string }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!isMounted) return;
        
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        
        if (session?.user) {
          const userData = await userRepository.findById(session.user.id);
          if (isMounted) {
            setUser(userData);
          }
        }
      } catch (err) {
        console.error("Error getting initial session:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        
        if (session?.user) {
          const userData = await userRepository.findById(session.user.id);
          if (isMounted) {
            setUser(userData);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<User> => {
    setError(null);
    setLoading(true);
    
    try {
      const trimmedEmail = email.toLowerCase().trim();
      if (!trimmedEmail || !password) {
        throw new Error("Correo y contraseña son requeridos");
      }
      
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

      setSession(authData.session);
      setSupabaseUser(authData.user);

      const userData = await userRepository.findById(authData.user.id);
      
      if (!userData) {
        const minimalUser: User = {
          id: authData.user.id,
          email: authData.user.email || trimmedEmail,
          name: authData.user.user_metadata?.name || "Usuario",
          role: "student",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUser(minimalUser);
        return minimalUser;
      }

      setUser(userData);
      return userData;
      
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        const networkError = "Error de conexión. Verifica tu internet.";
        setError(networkError);
        throw new Error(networkError);
      }
      
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
        try {
          await userRepository.create(authData.user.id, data);
          
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

  const signOut = async (options?: { global?: boolean; redirect?: string }) => {
    const { global: globalScope = false, redirect } = options || {};
    
    setUser(null);
    setSession(null);
    setSupabaseUser(null);
    setError(null);
    
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('sb-')) {
          if (key.includes('user') || key.includes('cache') || key.includes('token') || key.includes('session')) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.warn('Error limpiando localStorage:', e);
    }
    
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn('Error limpiando sessionStorage:', e);
    }
    
    try {
      const { error } = await supabaseClient.auth.signOut({
        scope: globalScope ? 'global' : 'local'
      });
      
      if (error) {
        console.error('Error en Supabase signOut:', error.message);
      }
    } catch (networkError) {
      console.warn('Error de red al cerrar sesión (estado local limpiado):', networkError);
    }
    
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

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

