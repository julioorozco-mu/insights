/**
 * Firebase Admin Compatibility Stubs
 * 
 * Stubs vacíos para permitir que el código compile
 * mientras se migra a Supabase.
 */

// Admin stub
const admin = {
  apps: [],
  initializeApp: () => ({}),
  credential: {
    cert: () => ({}),
  },
  auth: () => ({
    createUser: async () => ({ uid: "" }),
    deleteUser: async () => {},
    updateUser: async () => ({}),
    getUserByEmail: async () => ({ uid: "" }),
  }),
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => ({}) }),
        set: async () => {},
        update: async () => {},
        delete: async () => {},
      }),
      get: async () => ({ docs: [] }),
    }),
  }),
};

export default admin;

// Auth exports
export const getAuth = () => admin.auth();

// Firestore exports
export const getFirestore = () => admin.firestore();

// Credential exports
export const credential = admin.credential;

console.warn(
  "[MicroCert] firebase-admin está deprecado. " +
  "Usa Supabase Admin API en su lugar."
);
