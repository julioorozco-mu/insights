import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";

// Mapear de snake_case (DB) a camelCase (Frontend)
function mapEmailToFrontend(email: Record<string, unknown>) {
  return {
    id: email.id,
    type: email.type,
    lessonTitle: email.lesson_title,
    courseTitle: email.course_title,
    scheduledDate: email.scheduled_date,
    recipients: email.recipients || [],
    status: email.status,
    sentCount: email.sent_count,
    failedCount: email.failed_count,
    createdAt: email.created_at,
    sentAt: email.sent_at,
    cancelledAt: email.cancelled_at,
  };
}

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

    const { data, error } = await query;

    // Si la tabla no existe, retornar array vacío en lugar de error
    if (error) {
      console.warn("Tabla scheduled_emails no disponible:", error.message);
      return NextResponse.json({ scheduledEmails: [] });
    }

    // Mapear a camelCase para el frontend
    const scheduledEmails = (data || []).map(mapEmailToFrontend);

    return NextResponse.json({ scheduledEmails });
  } catch (error) {
    console.error("Error obteniendo correos programados:", error);
    // Retornar array vacío para que el frontend no falle
    return NextResponse.json({ scheduledEmails: [] });
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
