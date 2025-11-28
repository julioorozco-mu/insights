import { NextRequest, NextResponse } from "next/server";
import { agoraService } from "@/lib/services/agoraService";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Obtener la lección
    const lessonDoc = await getDoc(doc(db, 'lessons', id));
    if (!lessonDoc.exists()) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    const lesson = lessonDoc.data();
    const agoraChannel = lesson.agoraChannel;

    if (!agoraChannel) {
      return NextResponse.json(
        { error: 'No active live stream found' },
        { status: 400 }
      );
    }

    // Limpiar canal de Agora
    await agoraService.deleteLiveStream(agoraChannel);

    // Actualizar la lección
    const updateData: any = {
      isLive: false,
      liveStatus: 'ended',
      actualEndTime: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Nota: Para grabaciones, necesitarías implementar Agora Cloud Recording
    // Ver: https://docs.agora.io/en/cloud-recording/overview/product-overview

    await updateDoc(doc(db, 'lessons', id), updateData);

    return NextResponse.json({
      success: true,
      message: 'Live stream ended successfully',
    });
  } catch (error) {
    console.error('Error ending live stream:', error);
    return NextResponse.json(
      { error: 'Failed to end live stream' },
      { status: 500 }
    );
  }
}
