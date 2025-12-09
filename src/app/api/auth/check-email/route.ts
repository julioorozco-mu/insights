import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Crear cliente de Supabase con service role para poder consultar usuarios
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email es requerido" },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe en la tabla users
    const { data: existingUser, error } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error("Error checking email:", error);
      return NextResponse.json(
        { error: "Error al verificar email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: !!existingUser,
      message: existingUser 
        ? "Este correo electrónico ya está registrado" 
        : "Correo electrónico disponible"
    });
  } catch (error) {
    console.error("Error en check-email:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

