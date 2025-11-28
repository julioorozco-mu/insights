import { NextRequest, NextResponse } from "next/server";
import { fileService } from "@/lib/services/fileService";
import { handleError } from "@/utils/handleError";

export async function DELETE(request: NextRequest) {
  try {
    const { path } = await request.json();

    if (!path) {
      return NextResponse.json(
        { error: "La ruta del archivo es requerida" },
        { status: 400 }
      );
    }

    await fileService.deleteFile({ path });

    return NextResponse.json({ success: true });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}
