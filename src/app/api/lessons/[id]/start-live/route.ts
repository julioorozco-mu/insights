import { NextRequest, NextResponse } from "next/server";
import { agoraService } from "@/lib/services/agoraService";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Crear canal de Agora
    const stream = await agoraService.createLiveStream({
      channelName: `lesson-${id}-${Date.now()}`,
    });

    // Actualizar la lección en Firestore
    await updateDoc(doc(db, 'lessons', id), {
      isLive: true,
      agoraChannel: stream.channelName,
      agoraAppId: stream.appId,
      liveStatus: 'active',
      actualStartTime: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      channelName: stream.channelName,
      appId: stream.appId,
    });
  } catch (error: any) {
    console.error('Error starting live stream:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start live stream',
        details: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
