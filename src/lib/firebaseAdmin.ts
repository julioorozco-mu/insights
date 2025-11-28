// This is a placeholder. We avoid importing 'firebase-admin' here to prevent type errors
// if the dependency is not yet installed. API routes dynamically import firebase-admin.

export async function ensureFirebaseAdmin() {
  throw new Error('firebase-admin is not installed. Please install it: npm i firebase-admin');
}
