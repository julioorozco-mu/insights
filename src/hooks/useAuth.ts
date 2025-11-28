"use client";

import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { userRepository } from "@/lib/repositories/userRepository";
import { User, CreateUserData } from "@/types/user";
import { getFirebaseAuthErrorMessage } from "@/utils/handleError";
import { sendWelcomeEmail } from "@/lib/email/sendWelcomeEmail";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);
        // Load user data from Firestore
        const userData = await userRepository.findById(firebaseUser.uid);
        setUser(userData);
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const error = err as { code?: string };
      const message = error.code
        ? getFirebaseAuthErrorMessage(error.code)
        : "Error al iniciar sesión";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (data: CreateUserData) => {
    try {
      setError(null);
      setLoading(true);
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // Create user document in Firestore
      try {
        await userRepository.create(userCredential.user.uid, data);
        
        // Send welcome email (non-blocking)
        sendWelcomeEmail({
          to: data.email,
          name: data.name,
        }).catch((emailError) => {
          console.error("Error al enviar correo de bienvenida:", emailError);
          // No interrumpimos el flujo de registro si falla el correo
        });
      } catch (firestoreError) {
        console.error("Error creating Firestore documents:", firestoreError);
        // If Firestore creation fails, we should still keep the auth user
        // but log the error for debugging
        throw new Error("Error al crear el perfil de usuario. Por favor, contacta al administrador.");
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      let message: string;
      
      if (error.code) {
        // Firebase Auth error
        message = getFirebaseAuthErrorMessage(error.code);
      } else if (error.message) {
        // Custom error message
        message = error.message;
      } else {
        message = "Error al crear la cuenta";
      }
      
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
    } catch (err) {
      const message = "Error al cerrar sesión";
      setError(message);
      throw new Error(message);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err: unknown) {
      const error = err as { code?: string };
      const message = error.code
        ? getFirebaseAuthErrorMessage(error.code)
        : "Error al enviar el correo";
      setError(message);
      throw new Error(message);
    }
  };

  return {
    user,
    firebaseUser,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };
}
