import { NextRequest, NextResponse } from "next/server";
import { liveService } from "@/lib/services/liveService";
import { handleError } from "@/utils/handleError";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await liveService.stopLiveStream(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}
