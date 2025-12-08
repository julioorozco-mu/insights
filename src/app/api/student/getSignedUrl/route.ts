import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * API para obtener URLs firmadas de archivos en buckets privados
 * Solo usuarios autenticados pueden obtener URLs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get("bucket");
    const path = searchParams.get("path");
    const expiresIn = parseInt(searchParams.get("expiresIn") || "3600"); // 1 hora por defecto

    if (!bucket || !path) {
      return NextResponse.json(
        { error: "Se requieren los parámetros 'bucket' y 'path'" },
        { status: 400 }
      );
    }

    // Validar que el bucket sea uno permitido (seguridad)
    const allowedBuckets = ["attachments", "resources", "submissions", "videos"];
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json(
        { error: "Bucket no permitido" },
        { status: 403 }
      );
    }

    // Generar URL firmada
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error("[getSignedUrl] Error:", error);
      return NextResponse.json(
        { error: "Error al generar URL firmada", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      signedUrl: data.signedUrl,
      expiresIn 
    });

  } catch (error) {
    console.error("[getSignedUrl] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
