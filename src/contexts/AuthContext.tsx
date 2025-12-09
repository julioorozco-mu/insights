"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from "react";
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
  
  // Ref para evitar cargas duplicadas de usuario
  const loadingUserRef = useRef<string | null>(null);
  // Ref para rastrear si el componente está montado
  const isMountedRef = useRef(true);

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

  // Función para cargar datos del usuario en segundo plano
  const loadUserData = useCallback(async (userId: string) => {
    // Evitar cargas duplicadas
    if (loadingUserRef.current === userId) return;
    loadingUserRef.current = userId;
    
    try {
      const userData = await userRepository.findById(userId);
      if (isMountedRef.current && loadingUserRef.current === userId) {
        setUser(userData);
      }
    } catch (err) {
      console.error("[AuthContext] Error cargando datos de usuario:", err);
      // No bloquear el flujo si falla la carga de datos
    } finally {
      if (loadingUserRef.current === userId) {
        loadingUserRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Obtener sesión inicial - CRÍTICO: poner loading = false INMEDIATAMENTE después de verificar sesión
    const getInitialSession = async () => {
      try {
        console.log("[AuthContext] Verificando sesión inicial...");
        const { data: { session: initialSession }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError) {
          console.warn("[AuthContext] Error obteniendo sesión:", sessionError.message);
        }
        
        if (!isMountedRef.current) return;
        
        // INMEDIATAMENTE actualizar session y loading
        // Esto permite que las páginas sepan si hay sesión SIN esperar datos del usuario
        setSession(initialSession);
        setSupabaseUser(initialSession?.user ?? null);
        setLoading(false); // <-- CRÍTICO: poner loading = false ANTES de cargar userData
        
        console.log("[AuthContext] Sesión inicial:", initialSession ? "AUTENTICADO" : "NO AUTENTICADO");
        
        // Cargar datos del usuario en SEGUNDO PLANO (no bloquea)
        if (initialSession?.user) {
          loadUserData(initialSession.user.id);
        }
      } catch (err) {
        console.error("[AuthContext] Error crítico en getInitialSession:", err);
        if (isMountedRef.current) {
          setLoading(false); // Asegurar que loading se ponga en false incluso si hay error
        }
      }
    };

    getInitialSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("[AuthContext] Auth state change:", event, newSession ? "con sesión" : "sin sesión");
        
        if (!isMountedRef.current) return;
        
        // INMEDIATAMENTE actualizar session
        setSession(newSession);
        setSupabaseUser(newSession?.user ?? null);
        setLoading(false);
        
        if (newSession?.user) {
          // Cargar datos del usuario en segundo plano
          loadUserData(newSession.user.id);
        } else {
          // Limpiar usuario si no hay sesión
          setUser(null);
          loadingUserRef.current = null;
        }
      }
    );

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

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
          emailRedirectTo: undefined, // No requerir confirmación de email
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

      // Si el usuario fue creado pero no hay sesión, confirmar email e iniciar sesión automáticamente
      if (authData.user && !authData.session) {
        try {
          // Confirmar email automáticamente
          const confirmResponse = await fetch('/api/auth/auto-confirm-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: authData.user.id }),
          });
          
          if (confirmResponse.ok) {
            // Después de confirmar, iniciar sesión automáticamente
            const signInResponse = await supabaseClient.auth.signInWithPassword({
              email: data.email,
              password: data.password,
            });

            if (signInResponse.error) {
              console.error("[SignUp] Error iniciando sesión después del registro:", signInResponse.error);
              throw signInResponse.error;
            } else if (signInResponse.data.session) {
              // La sesión se establece automáticamente a través de onAuthStateChange
              console.log("[SignUp] Sesión iniciada automáticamente después del registro");
              // Actualizar estado inmediatamente
              setSession(signInResponse.data.session);
              setSupabaseUser(signInResponse.data.user);
            }
          } else {
            // Si falla la confirmación, intentar iniciar sesión de todas formas
            console.warn("[SignUp] No se pudo confirmar email, intentando iniciar sesión directamente");
            const signInResponse = await supabaseClient.auth.signInWithPassword({
              email: data.email,
              password: data.password,
            });
            if (signInResponse.data?.session) {
              console.log("[SignUp] Sesión iniciada automáticamente (sin confirmar email)");
              setSession(signInResponse.data.session);
              setSupabaseUser(signInResponse.data.user);
            }
          }
        } catch (confirmError) {
          console.warn("[SignUp] Error en proceso de auto-confirmación:", confirmError);
          // Intentar iniciar sesión de todas formas
          try {
            const signInResponse = await supabaseClient.auth.signInWithPassword({
              email: data.email,
              password: data.password,
            });
            if (signInResponse.data?.session) {
              console.log("[SignUp] Sesión iniciada automáticamente (fallback)");
              setSession(signInResponse.data.session);
              setSupabaseUser(signInResponse.data.user);
            }
          } catch (signInError) {
            console.error("[SignUp] No se pudo iniciar sesión automáticamente:", signInError);
            // No lanzamos error aquí para no interrumpir el registro
          }
        }
      } else if (authData.session) {
        // Si ya hay sesión después del signUp, actualizar estado inmediatamente
        console.log("[SignUp] Sesión obtenida directamente del signUp");
        setSession(authData.session);
        setSupabaseUser(authData.user);
      }

      // El perfil básico del usuario se crea automáticamente en la base de datos
      // mediante el trigger public.handle_new_user() sobre auth.users.
      // Sin embargo, necesitamos actualizar con todos los campos adicionales usando API admin
      if (authData.user) {
        const userId = authData.user.id;
        
        // Actualizar el registro del usuario con todos los campos adicionales
        // Usamos API admin porque el cliente no tiene sesión activa aún (RLS lo bloquea)
        try {
          const updateResponse = await fetch('/api/auth/update-user-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              name: data.name,
              lastName: data.lastName,
              email: data.email,
              phone: data.phone,
              username: data.username,
              dateOfBirth: data.dateOfBirth,
              gender: data.gender,
              state: data.state,
              municipality: data.municipality,
            }),
          });

          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error("Error actualizando perfil del usuario:", errorData);
          } else {
            console.log("[SignUp] Perfil del usuario actualizado correctamente");
          }
        } catch (userError) {
          console.error("Error actualizando datos del usuario:", userError);
          // No lanzamos error para no interrumpir el registro
          // Los datos básicos ya fueron creados por el trigger
        }

        // Intentamos enviar correo de bienvenida de forma opcional (no bloquea el registro)
        sendWelcomeEmail({
          to: data.email,
          name: data.name,
        }).catch((emailError) => {
          console.warn("No se pudo enviar correo de bienvenida (continuando sin correo):", emailError);
          // No interrumpe el flujo - el usuario se registra exitosamente
        });
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cierra la sesión del usuario.
   */
  const signOut = async (options?: { global?: boolean; redirect?: string }) => {
    const { global: globalScope = false, redirect } = options || {};
    
    setLoading(true);
    setError(null);
    
    try {
      // Cerrar sesión en Supabase
      try {
        const { error: signOutError } = await supabaseClient.auth.signOut({
          scope: globalScope ? 'global' : 'local'
        });
        
        if (signOutError) {
          console.warn('[SignOut] Error en Supabase (continuando limpieza local):', signOutError.message);
        }
      } catch (networkError) {
        console.warn('[SignOut] Error de red en Supabase (continuando limpieza local):', networkError);
      }
      
      // Limpiar localStorage
      if (typeof window !== 'undefined') {
        try {
          const keysToRemove: string[] = [];
          const totalKeys = localStorage.length;
          
          for (let i = 0; i < totalKeys; i++) {
            const key = localStorage.key(i);
            if (key) {
              if (
                key.startsWith('sb-') ||
                key.includes('supabase') ||
                key.includes('auth') ||
                key.includes('user') ||
                key.includes('session') ||
                key.includes('token') ||
                key === 'auth_rate_limit'
              ) {
                keysToRemove.push(key);
              }
            }
          }
          
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
        
        // Limpiar cookies
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
        
        // Limpiar sessionStorage
        try {
          sessionStorage.clear();
        } catch (e) {
          console.warn('[SignOut] Error limpiando sessionStorage:', e);
        }
      }
      
      // Limpiar rate limiter
      clearRateLimit();
      
      // Resetear estados
      setUser(null);
      setSession(null);
      setSupabaseUser(null);
      loadingUserRef.current = null;
      setRateLimitStatus({
        allowed: true,
        remainingAttempts: 5,
        waitTimeFormatted: '',
      });
      
    } finally {
      setLoading(false);
    }
    
    // Redirigir si se especificó
    if (redirect && typeof window !== 'undefined') {
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
