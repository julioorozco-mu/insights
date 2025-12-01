import { NextRequest, NextResponse } from "next/server";
import { agoraService } from "@/lib/services/agoraService";
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Obtener la lección de Supabase
    const { data: lesson, error: fetchError } = await supabaseClient
      .from(TABLES.LESSONS)
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    const agoraChannel = lesson.agora_channel;

    if (!agoraChannel) {
      return NextResponse.json(
        { error: 'No active live stream found' },
        { status: 400 }
      );
    }

    // Limpiar canal de Agora
    await agoraService.deleteLiveStream(agoraChannel);

    // Actualizar la lección en Supabase
    const { error: updateError } = await supabaseClient
      .from(TABLES.LESSONS)
      .update({
        is_live: false,
        live_status: 'ended',
        actual_end_time: new Date().toISOString(),
      })
      .eq('id', id);
    
    if (updateError) throw updateError;

    // Nota: Para grabaciones, necesitarías implementar Agora Cloud Recording
    // Ver: https://docs.agora.io/en/cloud-recording/overview/product-overview

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
