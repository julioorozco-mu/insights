import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { TABLES } from "@/utils/constants";

interface UpdateProfileRequest {
  userId: string;
  name: string;
  lastName: string;
  email: string;
  phone?: string;
  username?: string;
  dateOfBirth?: string;
  gender?: string;
  state?: string;
  municipality?: string;
  curp?: string;
}

export async function POST(req: Request) {
  try {
    const data = await req.json() as UpdateProfileRequest;

    if (!data.userId) {
      return NextResponse.json(
        { error: "userId es requerido" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Validar que el email no esté duplicado (si se está cambiando)
    if (data.email) {
      const { data: existingEmailUser, error: emailCheckError } = await supabaseAdmin
        .from(TABLES.USERS)
        .select("id, email")
        .eq("email", data.email.toLowerCase().trim())
        .neq("id", data.userId) // Excluir el usuario actual
        .maybeSingle();

      if (emailCheckError) {
        console.error("[update-user-profile] Error verificando email:", emailCheckError);
        return NextResponse.json(
          { error: "Error al verificar email", details: emailCheckError.message },
          { status: 500 }
        );
      }

      if (existingEmailUser) {
        return NextResponse.json(
          { error: "Este correo electrónico ya está registrado" },
          { status: 400 }
        );
      }
    }

    // Validar que el CURP no esté duplicado (si se está proporcionando)
    if (data.curp) {
      const normalizedCURP = data.curp.toUpperCase().trim();
      const { data: existingCURPUser, error: curpCheckError } = await supabaseAdmin
        .from(TABLES.USERS)
        .select("id, curp")
        .eq("curp", normalizedCURP)
        .neq("id", data.userId) // Excluir el usuario actual
        .maybeSingle();

      if (curpCheckError) {
        console.error("[update-user-profile] Error verificando CURP:", curpCheckError);
        return NextResponse.json(
          { error: "Error al verificar CURP", details: curpCheckError.message },
          { status: 500 }
        );
      }

      if (existingCURPUser) {
        return NextResponse.json(
          { error: "Este CURP ya está registrado" },
          { status: 400 }
        );
      }
    }

    // Preparar datos para actualizar
    const updateData: Record<string, unknown> = {
      name: data.name,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone || null,
      username: data.username || null,
      date_of_birth: data.dateOfBirth || null,
      gender: data.gender || null,
      state: data.state || null,
      municipality: data.municipality || null,
      curp: data.curp ? data.curp.toUpperCase().trim() : null,
    };

    console.log("[update-user-profile] Actualizando usuario:", data.userId, updateData);

    // Actualizar el usuario usando admin client (bypasa RLS)
    const { data: updatedUser, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .update(updateData)
      .eq("id", data.userId)
      .select()
      .single();

    if (error) {
      console.error("[update-user-profile] Error actualizando usuario:", error);
      return NextResponse.json(
        { error: "Error al actualizar perfil", details: error.message },
        { status: 500 }
      );
    }

    console.log("[update-user-profile] Usuario actualizado:", updatedUser);

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("[update-user-profile] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

