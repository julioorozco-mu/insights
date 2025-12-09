import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId es requerido" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Actualizar el usuario para confirmar su email automáticamente
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (error) {
      console.error("Error confirmando email:", error);
      return NextResponse.json(
        { error: "Error al confirmar email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email confirmado automáticamente",
    });
  } catch (error) {
    console.error("Error en auto-confirm-email:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

