import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { TABLES } from "@/utils/constants";
import { getApiAuthUser } from "@/lib/auth/apiRouteAuth";
import { teacherHasAccessToCourse } from '@/lib/auth/coursePermissions';

// POST - Reordenar secciones (para drag-and-drop)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getApiAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const body = await request.json();
    const { sections } = body;

    if (!sections || !Array.isArray(sections)) {
      return NextResponse.json(
        { error: "sections array es requerido" },
        { status: 400 }
      );
    }

    const isAdmin =
      authUser.role === "admin" || authUser.role === "superadmin" || authUser.role === "support";

    if (!isAdmin) {
      if (authUser.role !== "teacher") {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }

      const sectionIds = sections
        .map((s: { id: string }) => s?.id)
        .filter((id: string) => !!id);

      const uniqueSectionIds = Array.from(new Set(sectionIds));

      if (uniqueSectionIds.length === 0) {
        return NextResponse.json({ error: "sections array es requerido" }, { status: 400 });
      }

      const { data: sectionsData, error: sectionsError } = await supabase
        .from(TABLES.COURSE_SECTIONS)
        .select("id, course_id")
        .in("id", uniqueSectionIds);

      if (sectionsError) {
        console.error("[reorder sections] Error fetching sections:", sectionsError);
        return NextResponse.json({ error: "Error validando secciones" }, { status: 500 });
      }

      const courseIds = Array.from(
        new Set((sectionsData || []).map((s: any) => s.course_id).filter((id: string) => !!id))
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
        console.error("[reorder sections] Error validando curso asignado:", e);
        return NextResponse.json({ error: "Error validando permisos" }, { status: 500 });
      }
    }

    // Actualizar el orden de cada sección
    const updates = sections.map((section: { id: string; order: number }) =>
      supabase
        .from(TABLES.COURSE_SECTIONS)
        .update({ order: section.order })
        .eq("id", section.id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in reorder sections:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
