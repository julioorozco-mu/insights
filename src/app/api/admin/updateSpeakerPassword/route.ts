import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

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
    const { uid, password } = await req.json();
    
    if (!uid || !password) {
      return NextResponse.json({ error: 'UID and password are required' }, { status: 400 });
    }

    if (!admin.apps.length) {
      return NextResponse.json({ 
        error: 'Firebase Admin no está configurado. Configura FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY' 
      }, { status: 500 });
    }

    const auth = getAuth();
    await auth.updateUser(uid, { password });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('updateSpeakerPassword error:', error);
    return NextResponse.json({ 
      error: error.message || 'Error updating password' 
    }, { status: 500 });
  }
}
