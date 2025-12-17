import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { TABLES } from "@/utils/constants";
import { requireApiRoles } from "@/lib/auth/apiRouteAuth";

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireApiRoles(["admin", "superadmin", "support"]);
    if (auth instanceof NextResponse) return auth;

    const supabaseAdmin = getSupabaseAdmin();

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
      .from(TABLES.LESSONS)
      .delete()
      .eq("course_id", courseId);

    if (lessonsError) {
      console.error("Error eliminando lecciones:", lessonsError);
      // Continuar aunque falle, el curso puede no tener lecciones
    }

    // Eliminar secciones del curso
    const { error: sectionsError } = await supabaseAdmin
      .from(TABLES.COURSE_SECTIONS)
      .delete()
      .eq("course_id", courseId);

    if (sectionsError) {
      console.error("Error eliminando secciones:", sectionsError);
      // Continuar aunque falle
    }

    // Eliminar inscripciones al curso
    const { error: enrollmentsError } = await supabaseAdmin
      .from(TABLES.STUDENT_ENROLLMENTS)
      .delete()
      .eq("course_id", courseId);

    if (enrollmentsError) {
      console.error("Error eliminando inscripciones:", enrollmentsError);
      // Continuar aunque falle
    }

    // Finalmente eliminar el curso
    const { error: courseError } = await supabaseAdmin
      .from(TABLES.COURSES)
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
