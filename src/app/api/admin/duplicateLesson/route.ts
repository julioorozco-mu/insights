import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// POST - Duplicar una lección existente
export async function POST(request: NextRequest) {
  try {
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
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .single();

    if (fetchError || !originalLesson) {
      return NextResponse.json(
        { error: "Lección no encontrada" },
        { status: 404 }
      );
    }

    // Obtener el orden máximo actual para el curso
    const { data: existingLessons } = await supabase
      .from("lessons")
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
      .from("lessons")
      .insert({
        ...lessonData,
        title: `${originalLesson.title} (copia)`,
        order: newOrder,
        is_published: false, // La copia empieza como borrador
        live_status: "idle", // Resetear estado de live
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
      .from("file_attachments_lesson")
      .select("file_ids")
      .eq("lesson_id", lessonId)
      .single();

    if (attachments && attachments.file_ids && attachments.file_ids.length > 0) {
      await supabase
        .from("file_attachments_lesson")
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
