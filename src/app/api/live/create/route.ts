import { NextRequest, NextResponse } from "next/server";
import { liveService } from "@/lib/services/liveService";
import { createLiveStreamSchema } from "@/lib/validators/liveSchema";
import { handleError } from "@/utils/handleError";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createLiveStreamSchema.parse(body);

    const liveStream = await liveService.createLiveStream(validatedData);

    return NextResponse.json(liveStream, { status: 201 });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}
