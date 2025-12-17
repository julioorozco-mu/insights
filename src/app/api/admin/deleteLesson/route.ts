import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { TABLES } from "@/utils/constants";
import { getApiAuthUser } from "@/lib/auth/apiRouteAuth";
import { teacherHasAccessToCourse } from '@/lib/auth/coursePermissions';

// DELETE - Eliminar lección y sus datos relacionados
export async function DELETE(request: NextRequest) {
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
      .from(TABLES.LESSONS)
      .select("id, course_id, title")
      .eq("id", lessonId)
      .single();

    if (fetchError || !lesson) {
      return NextResponse.json(
        { error: "Lección no encontrada" },
        { status: 404 }
      );
    }

    if (!isAdmin) {
      try {
        const allowed = await teacherHasAccessToCourse(authUser.id, lesson.course_id);
        if (!allowed) {
          return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }
      } catch (e) {
        console.error("[deleteLesson API] Error validando curso asignado:", e);
        return NextResponse.json({ error: "Error validando permisos" }, { status: 500 });
      }
    }

    // Eliminar datos relacionados en orden
    // 1. Eliminar notas de lección
    await supabase
      .from(TABLES.LESSON_NOTES)
      .delete()
      .eq("lesson_id", lessonId);

    // 2. Eliminar respuestas a preguntas de lección
    const { data: questions } = await supabase
      .from(TABLES.LESSON_QUESTIONS)
      .select("id")
      .eq("lesson_id", lessonId);

    if (questions && questions.length > 0) {
      const questionIds = questions.map(q => q.id);
      
      await supabase
        .from(TABLES.LESSON_QUESTION_ANSWERS)
        .delete()
        .in("question_id", questionIds);
      
      await supabase
        .from(TABLES.LESSON_QUESTION_UPVOTES)
        .delete()
        .in("question_id", questionIds);
    }

    // 3. Eliminar preguntas de lección
    await supabase
      .from(TABLES.LESSON_QUESTIONS)
      .delete()
      .eq("lesson_id", lessonId);

    // 4. Eliminar asistencia a lección
    await supabase
      .from(TABLES.LESSON_ATTENDANCE)
      .delete()
      .eq("lesson_id", lessonId);

    // 5. Eliminar archivos adjuntos de lección
    await supabase
      .from(TABLES.FILE_ATTACHMENTS_LESSON)
      .delete()
      .eq("lesson_id", lessonId);

    // 6. Eliminar sesiones de live stream
    await supabase
      .from(TABLES.LIVE_STREAM_SESSIONS)
      .delete()
      .eq("lesson_id", lessonId);

    // 7. Eliminar chats en vivo y sus mensajes
    const { data: liveChats } = await supabase
      .from(TABLES.LIVE_CHATS)
      .select("id")
      .eq("lesson_id", lessonId);

    if (liveChats && liveChats.length > 0) {
      const chatIds = liveChats.map(c => c.id);
      
      await supabase
        .from(TABLES.LIVE_CHAT_MESSAGES)
        .delete()
        .in("live_chat_id", chatIds);
    }

    await supabase
      .from(TABLES.LIVE_CHATS)
      .delete()
      .eq("lesson_id", lessonId);

    // 8. Eliminar encuestas en vivo y sus votos
    const { data: livePolls } = await supabase
      .from(TABLES.LIVE_POLLS)
      .select("id")
      .eq("lesson_id", lessonId);

    if (livePolls && livePolls.length > 0) {
      const pollIds = livePolls.map(p => p.id);
      
      await supabase
        .from(TABLES.LIVE_POLL_VOTES)
        .delete()
        .in("poll_id", pollIds);
    }

    await supabase
      .from(TABLES.LIVE_POLLS)
      .delete()
      .eq("lesson_id", lessonId);

    // 9. Eliminar correos programados de la lección
    await supabase
      .from(TABLES.SCHEDULED_EMAILS)
      .delete()
      .eq("lesson_id", lessonId);

    // 10. Finalmente, eliminar la lección
    const { error: deleteError } = await supabase
      .from(TABLES.LESSONS)
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
      .from(TABLES.LESSONS)
      .select("id, order")
      .eq("course_id", lesson.course_id)
      .order("order", { ascending: true });

    if (remainingLessons && remainingLessons.length > 0) {
      for (let i = 0; i < remainingLessons.length; i++) {
        if (remainingLessons[i].order !== i) {
          await supabase
            .from(TABLES.LESSONS)
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
