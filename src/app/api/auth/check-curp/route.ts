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
    const curp = searchParams.get("curp");

    if (!curp) {
      return NextResponse.json(
        { error: "CURP es requerido" },
        { status: 400 }
      );
    }

    // Normalizar CURP (mayúsculas y sin espacios)
    const normalizedCURP = curp.trim().toUpperCase();

    // Verificar si el CURP ya existe en la tabla users
    const { data: existingUser, error } = await supabaseAdmin
      .from("users")
      .select("id, curp")
      .eq("curp", normalizedCURP)
      .maybeSingle();

    if (error) {
      console.error("Error checking CURP:", error);
      return NextResponse.json(
        { error: "Error al verificar CURP" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: !!existingUser,
      message: existingUser 
        ? "Este CURP ya está registrado" 
        : "CURP disponible"
    });
  } catch (error) {
    console.error("Error en check-curp:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
