import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { TABLES } from "@/utils/constants";
import { getApiAuthUser } from "@/lib/auth/apiRouteAuth";
import { teacherHasAccessToCourse } from '@/lib/auth/coursePermissions';

// POST - Duplicar una lección existente
export async function POST(request: NextRequest) {
  try {
    const authUser = await getApiAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const isAdmin =
      authUser.role === "admin" || authUser.role === "superadmin" || authUser.role === "support";

    if (!isAdmin && authUser.role !== "teacher") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();

    const body = await request.json();
    const { lessonId } = body;

    if (!lessonId) {
      return NextResponse.json(
        { error: "lessonId es requerido" },
        { status: 400 }
      );
    }

    // Obtener la lección original
    const { data: originalLesson, error: fetchError } = await supabase
      .from(TABLES.LESSONS)
      .select("*")
      .eq("id", lessonId)
      .single();

    if (fetchError || !originalLesson) {
      return NextResponse.json(
        { error: "Lección no encontrada" },
        { status: 404 }
      );
    }

    if (!isAdmin) {
      try {
        const allowed = await teacherHasAccessToCourse(authUser.id, originalLesson.course_id);
        if (!allowed) {
          return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }
      } catch (e) {
        console.error("[duplicateLesson API] Error validando curso asignado:", e);
        return NextResponse.json({ error: "Error validando permisos" }, { status: 500 });
      }
    }

    // Obtener el orden máximo actual para el curso
    const { data: existingLessons } = await supabase
      .from(TABLES.LESSONS)
      .select("order")
      .eq("course_id", originalLesson.course_id)
      .order("order", { ascending: false })
      .limit(1);

    const newOrder = existingLessons && existingLessons.length > 0 
      ? existingLessons[0].order + 1 
      : 0;

    // Crear la nueva lección duplicada (sin campos de sistema)
    const { 
      id, 
      created_at, 
      updated_at,
      live_stream_id,
      live_stream_key,
      live_playback_id,
      agora_channel,
      actual_start_time,
      actual_end_time,
      ...lessonData 
    } = originalLesson;

    const { data: newLesson, error: insertError } = await supabase
      .from(TABLES.LESSONS)
      .insert({
        ...lessonData,
        title: `${originalLesson.title} (copia)`,
        order: newOrder,
        is_published: false, // La copia empieza como borrador
        live_status: "idle", // Resetear estado de live
        created_by: authUser.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error duplicating lesson:", insertError);
      return NextResponse.json(
        { error: "Error al duplicar la lección" },
        { status: 500 }
      );
    }

    // Duplicar archivos adjuntos de la lección
    const { data: attachments } = await supabase
      .from(TABLES.FILE_ATTACHMENTS_LESSON)
      .select("file_ids")
      .eq("lesson_id", lessonId)
      .single();

    if (attachments && attachments.file_ids && attachments.file_ids.length > 0) {
      await supabase
        .from(TABLES.FILE_ATTACHMENTS_LESSON)
        .insert({
          lesson_id: newLesson.id,
          file_ids: attachments.file_ids
        });
    }

    return NextResponse.json({ 
      success: true,
      lesson: newLesson,
      message: `Lección duplicada como "${newLesson.title}"`
    }, { status: 201 });
  } catch (error) {
    console.error("Error in POST duplicateLesson:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
