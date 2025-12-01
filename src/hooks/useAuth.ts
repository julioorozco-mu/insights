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

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const message = getSupabaseAuthErrorMessage(error.message);
        setError(message);
        throw new Error(message);
      }
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

  const signOut = async () => {
    try {
      setError(null);
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        throw new Error("Error al cerrar sesión");
      }
    } catch (err) {
      const message = "Error al cerrar sesión";
      setError(message);
      throw new Error(message);
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
