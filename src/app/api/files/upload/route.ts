import { NextRequest, NextResponse } from "next/server";
import { fileService } from "@/lib/services/fileService";
import { handleError } from "@/utils/handleError";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const path = formData.get("path") as string;

    if (!file || !path) {
      return NextResponse.json(
        { error: "Archivo y ruta son requeridos" },
        { status: 400 }
      );
    }

    const result = await fileService.uploadFile({
      file,
      path,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}
