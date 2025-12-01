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
    
    // Crear canal de Agora
    const stream = await agoraService.createLiveStream({
      channelName: `lesson-${id}-${Date.now()}`,
    });

    // Actualizar la lección en Supabase
    const { error: updateError } = await supabaseClient
      .from(TABLES.LESSONS)
      .update({
        is_live: true,
        agora_channel: stream.channelName,
        agora_app_id: stream.appId,
        live_status: 'active',
        actual_start_time: new Date().toISOString(),
      })
      .eq('id', id);
    
    if (updateError) throw updateError;

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
