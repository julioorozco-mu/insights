import { NextRequest, NextResponse } from "next/server";
import { liveService } from "@/lib/services/liveService";
import { handleError } from "@/utils/handleError";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stream = await liveService.getLiveStream(id);
    
    if (!stream) {
      return NextResponse.json(
        { error: "Transmisión no encontrada" },
        { status: 404 }
      );
    }

    const status = await liveService.getStreamStatus(stream.agoraChannel);

    return NextResponse.json(status);
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}
