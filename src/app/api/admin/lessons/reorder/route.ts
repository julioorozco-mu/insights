import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { TABLES } from "@/utils/constants";
import { getApiAuthUser } from "@/lib/auth/apiRouteAuth";
import { teacherHasAccessToCourse } from '@/lib/auth/coursePermissions';

// POST - Reordenar lecciones y/o moverlas entre secciones
export async function POST(request: NextRequest) {
  try {
    const authUser = await getApiAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const body = await request.json();
    const { lessons } = body;

    if (!lessons || !Array.isArray(lessons)) {
      return NextResponse.json(
        { error: "lessons array es requerido" },
        { status: 400 }
      );
    }

    const isAdmin =
      authUser.role === "admin" || authUser.role === "superadmin" || authUser.role === "support";

    if (!isAdmin) {
      if (authUser.role !== "teacher") {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }

      const lessonIds = lessons
        .map((l: { id: string }) => l?.id)
        .filter((id: string) => !!id);

      const uniqueLessonIds = Array.from(new Set(lessonIds));

      if (uniqueLessonIds.length === 0) {
        return NextResponse.json({ error: "lessons array es requerido" }, { status: 400 });
      }

      const { data: lessonsData, error: lessonsError } = await supabase
        .from(TABLES.LESSONS)
        .select("id, course_id")
        .in("id", uniqueLessonIds);

      if (lessonsError) {
        console.error("[reorder lessons] Error fetching lessons:", lessonsError);
        return NextResponse.json({ error: "Error validando lecciones" }, { status: 500 });
      }

      const courseIds = Array.from(
        new Set((lessonsData || []).map((l: any) => l.course_id).filter((id: string) => !!id))
      );

      if (courseIds.length !== 1) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }

      const courseId = courseIds[0];

      try {
        const allowed = await teacherHasAccessToCourse(authUser.id, courseId);
        if (!allowed) {
          return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }
      } catch (e) {
        console.error("[reorder lessons] Error validando curso asignado:", e);
        return NextResponse.json({ error: "Error validando permisos" }, { status: 500 });
      }
    }

    // Actualizar el orden y sección de cada lección
    const updates = lessons.map((lesson: { id: string; order: number; sectionId?: string | null }) =>
      supabase
        .from(TABLES.LESSONS)
        .update({ 
          order: lesson.order,
          section_id: lesson.sectionId || null
        })
        .eq("id", lesson.id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in reorder lessons:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
