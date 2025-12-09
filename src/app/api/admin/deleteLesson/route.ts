import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// DELETE - Eliminar lección y sus datos relacionados
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lessonId");

    if (!lessonId) {
      return NextResponse.json(
        { error: "lessonId es requerido" },
        { status: 400 }
      );
    }

    // Verificar que la lección existe
    const { data: lesson, error: fetchError } = await supabase
      .from("lessons")
      .select("id, course_id, title")
      .eq("id", lessonId)
      .single();

    if (fetchError || !lesson) {
      return NextResponse.json(
        { error: "Lección no encontrada" },
        { status: 404 }
      );
    }

    // Eliminar datos relacionados en orden
    // 1. Eliminar notas de lección
    await supabase
      .from("lesson_notes")
      .delete()
      .eq("lesson_id", lessonId);

    // 2. Eliminar respuestas a preguntas de lección
    const { data: questions } = await supabase
      .from("lesson_questions")
      .select("id")
      .eq("lesson_id", lessonId);

    if (questions && questions.length > 0) {
      const questionIds = questions.map(q => q.id);
      
      await supabase
        .from("lesson_question_answers")
        .delete()
        .in("question_id", questionIds);
      
      await supabase
        .from("lesson_question_upvotes")
        .delete()
        .in("question_id", questionIds);
    }

    // 3. Eliminar preguntas de lección
    await supabase
      .from("lesson_questions")
      .delete()
      .eq("lesson_id", lessonId);

    // 4. Eliminar asistencia a lección
    await supabase
      .from("lesson_attendance")
      .delete()
      .eq("lesson_id", lessonId);

    // 5. Eliminar archivos adjuntos de lección
    await supabase
      .from("file_attachments_lesson")
      .delete()
      .eq("lesson_id", lessonId);

    // 6. Eliminar sesiones de live stream
    await supabase
      .from("live_stream_sessions")
      .delete()
      .eq("lesson_id", lessonId);

    // 7. Eliminar chats en vivo y sus mensajes
    const { data: liveChats } = await supabase
      .from("live_chats")
      .select("id")
      .eq("lesson_id", lessonId);

    if (liveChats && liveChats.length > 0) {
      const chatIds = liveChats.map(c => c.id);
      
      await supabase
        .from("live_chat_messages")
        .delete()
        .in("live_chat_id", chatIds);
    }

    await supabase
      .from("live_chats")
      .delete()
      .eq("lesson_id", lessonId);

    // 8. Eliminar encuestas en vivo y sus votos
    const { data: livePolls } = await supabase
      .from("live_polls")
      .select("id")
      .eq("lesson_id", lessonId);

    if (livePolls && livePolls.length > 0) {
      const pollIds = livePolls.map(p => p.id);
      
      await supabase
        .from("live_poll_votes")
        .delete()
        .in("poll_id", pollIds);
    }

    await supabase
      .from("live_polls")
      .delete()
      .eq("lesson_id", lessonId);

    // 9. Eliminar correos programados de la lección
    await supabase
      .from("scheduled_emails")
      .delete()
      .eq("lesson_id", lessonId);

    // 10. Finalmente, eliminar la lección
    const { error: deleteError } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId);

    if (deleteError) {
      console.error("Error deleting lesson:", deleteError);
      return NextResponse.json(
        { error: "Error al eliminar la lección" },
        { status: 500 }
      );
    }

    // 11. Reordenar las lecciones restantes del curso
    const { data: remainingLessons } = await supabase
      .from("lessons")
      .select("id, order")
      .eq("course_id", lesson.course_id)
      .order("order", { ascending: true });

    if (remainingLessons && remainingLessons.length > 0) {
      for (let i = 0; i < remainingLessons.length; i++) {
        if (remainingLessons[i].order !== i) {
          await supabase
            .from("lessons")
            .update({ order: i })
            .eq("id", remainingLessons[i].id);
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Lección "${lesson.title}" eliminada correctamente`
    });
  } catch (error) {
    console.error("Error in DELETE lesson:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
