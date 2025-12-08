import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId es requerido" },
        { status: 400 }
      );
    }

    // Primero eliminar las lecciones asociadas al curso
    const { error: lessonsError } = await supabaseAdmin
      .from("lessons")
      .delete()
      .eq("course_id", courseId);

    if (lessonsError) {
      console.error("Error eliminando lecciones:", lessonsError);
      // Continuar aunque falle, el curso puede no tener lecciones
    }

    // Eliminar secciones del curso
    const { error: sectionsError } = await supabaseAdmin
      .from("course_sections")
      .delete()
      .eq("course_id", courseId);

    if (sectionsError) {
      console.error("Error eliminando secciones:", sectionsError);
      // Continuar aunque falle
    }

    // Eliminar inscripciones al curso
    const { error: enrollmentsError } = await supabaseAdmin
      .from("enrollments")
      .delete()
      .eq("course_id", courseId);

    if (enrollmentsError) {
      console.error("Error eliminando inscripciones:", enrollmentsError);
      // Continuar aunque falle
    }

    // Finalmente eliminar el curso
    const { error: courseError } = await supabaseAdmin
      .from("courses")
      .delete()
      .eq("id", courseId);

    if (courseError) {
      console.error("Error eliminando curso:", courseError);
      return NextResponse.json(
        { error: "Error al eliminar el curso: " + courseError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Curso eliminado correctamente" });
  } catch (error: any) {
    console.error("Error en DELETE /api/admin/deleteCourse:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
