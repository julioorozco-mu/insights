import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID as string;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL as string;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  
  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase Admin environment variables');
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    if (!admin.apps.length) {
      return NextResponse.json({ 
        error: 'Firebase Admin no está configurado. Configura FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY' 
      }, { status: 500 });
    }

    const auth = getAuth();
    const db = getFirestore();

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
      disabled: false,
    });

    await db.collection('users').doc(userRecord.uid).set({
      name,
      email,
      role: 'speaker',
      createdAt: new Date(),
    });

    return NextResponse.json({ uid: userRecord.uid }, { status: 200 });
  } catch (e: any) {
    console.error('createSpeakerUser error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
