/**
 * Firebase Compatibility Layer (DEPRECATED)
 * 
 * Este archivo existe solo para compatibilidad durante la migración.
 * Todas las funcionalidades ahora usan Supabase.
 * 
 * TODO: Eliminar este archivo después de migrar todos los componentes.
 */

import { supabaseClient } from "./supabase";

// Re-exportar el cliente de Supabase como 'db' para compatibilidad
export const db = supabaseClient;
export const auth = supabaseClient.auth;
export const storage = supabaseClient.storage;

// Funciones stub para Firestore (no-op durante migración)
export const collection = () => ({});
export const doc = () => ({});
export const getDoc = async () => ({ exists: () => false, data: () => ({}) });
export const getDocs = async () => ({ docs: [], empty: true });
export const setDoc = async () => {};
export const addDoc = async () => ({ id: "" });
export const updateDoc = async () => {};
export const deleteDoc = async () => {};
export const query = () => ({});
export const where = () => ({});
export const orderBy = () => ({});
export const limit = () => ({});
export const onSnapshot = () => () => {};
export const arrayUnion = () => ({});
export const arrayRemove = () => ({});

// Timestamp stub
export const Timestamp = {
  fromDate: (date: Date) => date.toISOString(),
  now: () => new Date().toISOString(),
};

// Firebase Auth stubs
export const updatePassword = async () => {};
export const EmailAuthProvider = {
  credential: () => ({}),
};
export const reauthenticateWithCredential = async () => ({});
export const signInWithEmailAndPassword = async () => ({ user: null });
export const createUserWithEmailAndPassword = async () => ({ user: null });
export const signOut = async () => {};
export const sendPasswordResetEmail = async () => {};
export const onAuthStateChanged = () => () => {};

// Firebase Storage stubs
export const ref = () => ({});
export const uploadBytes = async () => ({ ref: {} });
export const getDownloadURL = async () => "";
export const uploadBytesResumable = () => ({
  on: () => {},
  snapshot: { ref: {} },
});
export const deleteObject = async () => {};
