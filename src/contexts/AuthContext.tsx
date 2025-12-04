"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabase";
import { userRepository } from "@/lib/repositories/userRepository";
import { User, CreateUserData } from "@/types/user";
import { getSupabaseAuthErrorMessage } from "@/utils/handleError";
import { sendWelcomeEmail } from "@/lib/email/sendWelcomeEmail";
import { 
  checkRateLimit, 
  recordFailedAttempt, 
  recordSuccessfulAttempt,
  clearRateLimit 
} from "@/lib/auth/rateLimiter";

interface RateLimitStatus {
  allowed: boolean;
  remainingAttempts: number;
  waitTimeFormatted: string;
}

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
  /** Estado del rate limiter para mostrar en UI */
  rateLimitStatus: RateLimitStatus;
  /** Fuerza una actualización del estado del rate limiter */
  refreshRateLimitStatus: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus>({
    allowed: true,
    remainingAttempts: 5,
    waitTimeFormatted: '',
  });

  // Actualizar estado del rate limiter
  const refreshRateLimitStatus = useCallback(() => {
    const status = checkRateLimit();
    setRateLimitStatus({
      allowed: status.allowed,
      remainingAttempts: status.remainingAttempts,
      waitTimeFormatted: status.waitTimeFormatted,
    });
  }, []);

  // Verificar rate limit al montar
  useEffect(() => {
    refreshRateLimitStatus();
  }, [refreshRateLimitStatus]);

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
    
    // 1. Verificar rate limit ANTES de intentar
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      const blockedError = `Demasiados intentos fallidos. Intenta de nuevo en ${rateLimitCheck.waitTimeFormatted}.`;
      setError(blockedError);
      refreshRateLimitStatus();
      throw new Error(blockedError);
    }
    
    setLoading(true);
    
    try {
      // 2. Sanitizar email
      const trimmedEmail = email.toLowerCase().trim();
      if (!trimmedEmail || !password) {
        throw new Error("Correo y contraseña son requeridos");
      }
      
      // 3. Validación adicional de formato (defensa en profundidad)
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(trimmedEmail)) {
        throw new Error("Formato de correo inválido");
      }
      
      // 4. Intentar autenticación con Supabase
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (authError) {
        // Registrar intento fallido en rate limiter
        const newStatus = recordFailedAttempt();
        refreshRateLimitStatus();
        
        const message = getSupabaseAuthErrorMessage(authError.message);
        
        // Agregar información de intentos restantes si quedan pocos
        let fullMessage = message;
        if (newStatus.remainingAttempts <= 2 && newStatus.remainingAttempts > 0) {
          fullMessage = `${message} (${newStatus.remainingAttempts} intento${newStatus.remainingAttempts === 1 ? '' : 's'} restante${newStatus.remainingAttempts === 1 ? '' : 's'})`;
        } else if (!newStatus.allowed) {
          fullMessage = `Demasiados intentos fallidos. Intenta de nuevo en ${newStatus.waitTimeFormatted}.`;
        }
        
        setError(fullMessage);
        throw new Error(fullMessage);
      }

      if (!authData.user || !authData.session) {
        throw new Error("Error inesperado: no se recibió sesión");
      }

      // 5. Login exitoso - limpiar rate limiter
      recordSuccessfulAttempt();
      refreshRateLimitStatus();
      
      setSession(authData.session);
      setSupabaseUser(authData.user);

      // 6. Obtener datos completos del usuario
      const userData = await userRepository.findById(authData.user.id);
      
      if (!userData) {
        // Usuario existe en Auth pero no en la tabla users
        // Crear objeto mínimo para no bloquear el flujo
        const minimalUser: User = {
          id: authData.user.id,
          email: authData.user.email || trimmedEmail,
          name: authData.user.user_metadata?.name || "Usuario",
          role: "student",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUser(minimalUser);
        
        // Log para debugging - esto no debería pasar en producción normal
        console.warn(`[Auth] Usuario ${authData.user.id} existe en Auth pero no en tabla users`);
        return minimalUser;
      }

      setUser(userData);
      return userData;
      
    } catch (err) {
      // Manejo específico de errores de red
      if (err instanceof TypeError && err.message.includes('fetch')) {
        const networkError = "Error de conexión. Verifica tu internet.";
        setError(networkError);
        throw new Error(networkError);
      }
      
      // Re-lanzar errores ya formateados
      if (err instanceof Error) {
        if (!error) setError(err.message); // Solo setear si no está ya seteado
        throw err;
      }
      
      // Error genérico como fallback
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

  /**
   * Cierra la sesión del usuario.
   * 
   * ESPEJO DE signIn - Limpia todos los recursos en orden inverso:
   * 1. loading = true (indica proceso en curso)
   * 2. Cerrar sesión en Supabase (equivalente inverso de signInWithPassword)
   * 3. Limpiar TODOS los tokens de localStorage (incluyendo sb-*)
   * 4. Limpiar cookies de autenticación
   * 5. Limpiar sessionStorage
   * 6. Limpiar rate limiter
   * 7. Resetear estado de React a valores iniciales
   * 8. loading = false
   */
  const signOut = async (options?: { global?: boolean; redirect?: string }) => {
    const { global: globalScope = false, redirect } = options || {};
    
    // 1. Indicar que el proceso está en curso (SIMÉTRICO con signIn)
    setLoading(true);
    setError(null);
    
    try {
      // 2. Cerrar sesión en Supabase PRIMERO (antes de limpiar localStorage)
      // Esto es importante porque signOut de Supabase limpia sus propios tokens
      try {
        const { error: signOutError } = await supabaseClient.auth.signOut({
          scope: globalScope ? 'global' : 'local'
        });
        
        if (signOutError) {
          // Loguear pero continuar con la limpieza local
          console.warn('[SignOut] Error en Supabase (continuando limpieza local):', signOutError.message);
        }
      } catch (networkError) {
        // Error de red - continuar con limpieza local de todos modos
        console.warn('[SignOut] Error de red en Supabase (continuando limpieza local):', networkError);
      }
      
      // 3. Limpiar localStorage COMPLETAMENTE (incluyendo tokens sb-*)
      // FIX: Antes se excluían las keys sb-*, ahora se incluyen para limpieza total
      if (typeof window !== 'undefined') {
        try {
          // Recolectar TODAS las keys relacionadas con auth
          const keysToRemove: string[] = [];
          const totalKeys = localStorage.length;
          
          for (let i = 0; i < totalKeys; i++) {
            const key = localStorage.key(i);
            if (key) {
              // Incluir TODOS los tokens de Supabase (sb-*) y otras keys de auth
              if (
                key.startsWith('sb-') ||                    // Tokens de Supabase
                key.includes('supabase') ||                 // Otras keys de Supabase
                key.includes('auth') ||                     // Keys de autenticación
                key.includes('user') ||                     // Datos de usuario
                key.includes('session') ||                  // Datos de sesión
                key.includes('token') ||                    // Tokens genéricos
                key === 'auth_rate_limit'                   // Rate limiter
              ) {
                keysToRemove.push(key);
              }
            }
          }
          
          // Eliminar en batch después de la iteración
          keysToRemove.forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch {
              // Ignorar errores individuales
            }
          });
        } catch (e) {
          console.warn('[SignOut] Error limpiando localStorage:', e);
        }
        
        // 4. Limpiar cookies de autenticación
        try {
          const cookies = document.cookie.split(';');
          cookies.forEach(cookie => {
            const [name] = cookie.split('=');
            const trimmedName = name?.trim();
            if (trimmedName && (
              trimmedName.startsWith('sb-') || 
              trimmedName.includes('auth') ||
              trimmedName.includes('session') ||
              trimmedName.includes('token')
            )) {
              // Eliminar cookie para todos los paths y dominios posibles
              const domain = window.location.hostname;
              const paths = ['/', '/auth', '/dashboard'];
              
              paths.forEach(path => {
                document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
                document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain};`;
              });
            }
          });
        } catch (e) {
          console.warn('[SignOut] Error limpiando cookies:', e);
        }
        
        // 5. Limpiar sessionStorage completamente
        try {
          sessionStorage.clear();
        } catch (e) {
          console.warn('[SignOut] Error limpiando sessionStorage:', e);
        }
      }
      
      // 6. Limpiar rate limiter (llamar explícitamente aunque ya se borró de localStorage)
      clearRateLimit();
      
      // 7. Resetear TODOS los estados de React a valores iniciales
      // (SIMÉTRICO con los setters en signIn)
      setUser(null);
      setSession(null);
      setSupabaseUser(null);
      setRateLimitStatus({
        allowed: true,
        remainingAttempts: 5,
        waitTimeFormatted: '',
      });
      
    } finally {
      // 8. Indicar que el proceso terminó (SIMÉTRICO con signIn)
      setLoading(false);
    }
    
    // 9. Redirigir si se especificó (después de limpiar todo)
    if (redirect && typeof window !== 'undefined') {
      // Usar replace para evitar que el usuario vuelva atrás con el botón back
      window.location.replace(redirect);
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
        rateLimitStatus,
        refreshRateLimitStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

