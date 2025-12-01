import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";

// GET - Obtener todos los correos programados
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    
    let query = supabaseClient
      .from(TABLES.SCHEDULED_EMAILS)
      .select('*')
      .order('scheduled_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: scheduledEmails, error } = await query;

    if (error) throw error;

    return NextResponse.json({ scheduledEmails: scheduledEmails || [] });
  } catch (error) {
    console.error("Error obteniendo correos programados:", error);
    return NextResponse.json(
      { error: "Error al obtener correos programados" },
      { status: 500 }
    );
  }
}

// PATCH - Cancelar un correo programado
export async function PATCH(req: Request) {
  try {
    const { id, cancelledBy } = await req.json();

    if (!id || !cancelledBy) {
      return NextResponse.json(
        { error: "ID y cancelledBy son requeridos" },
        { status: 400 }
      );
    }

    const { error } = await supabaseClient
      .from(TABLES.SCHEDULED_EMAILS)
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy,
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Correo programado cancelado exitosamente"
    });
  } catch (error) {
    console.error("Error cancelando correo programado:", error);
    return NextResponse.json(
      { error: "Error al cancelar correo programado" },
      { status: 500 }
    );
  }
}
