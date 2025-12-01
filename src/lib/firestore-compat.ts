/**
 * Firebase Firestore Compatibility Stubs
 * 
 * Stubs vacíos para permitir que el código compile
 * mientras se migra a Supabase.
 */

// Funciones stub
export const collection = (..._args: unknown[]) => ({});
export const doc = (..._args: unknown[]) => ({});
export const getDoc = async () => ({ exists: () => false, data: () => ({}) });
export const getDocs = async () => ({ docs: [], empty: true, forEach: () => {} });
export const setDoc = async () => {};
export const addDoc = async () => ({ id: "" });
export const updateDoc = async () => {};
export const deleteDoc = async () => {};
export const query = (..._args: unknown[]) => ({});
export const where = (..._args: unknown[]) => ({});
export const orderBy = (..._args: unknown[]) => ({});
export const limit = (..._args: unknown[]) => ({});
export const onSnapshot = () => () => {};
export const arrayUnion = (..._args: unknown[]) => [];
export const arrayRemove = (..._args: unknown[]) => [];
export const serverTimestamp = () => new Date().toISOString();

// Timestamp class stub
export class Timestamp {
  seconds: number;
  nanoseconds: number;
  
  constructor(seconds: number = 0, nanoseconds: number = 0) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }
  
  static fromDate(date: Date): Timestamp {
    return new Timestamp(Math.floor(date.getTime() / 1000), 0);
  }
  
  static now(): Timestamp {
    return Timestamp.fromDate(new Date());
  }
  
  toDate(): Date {
    return new Date(this.seconds * 1000);
  }
  
  toMillis(): number {
    return this.seconds * 1000;
  }
}

// Tipos
export type DocumentData = Record<string, unknown>;
export type DocumentReference = { id: string };
export type CollectionReference = object;
export type Query = object;
export type QuerySnapshot = { docs: unknown[]; empty: boolean };
export type DocumentSnapshot = { exists: () => boolean; data: () => DocumentData; id: string };
