import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Obtener secciones de un curso
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId es requerido" },
        { status: 400 }
      );
    }

    const { data: sections, error } = await supabase
      .from("course_sections")
      .select(`
        *,
        lessons:lessons(id, title, description, order, type, duration_minutes)
      `)
      .eq("course_id", courseId)
      .order("order", { ascending: true });

    if (error) {
      console.error("Error fetching sections:", error);
      return NextResponse.json(
        { error: "Error al obtener secciones" },
        { status: 500 }
      );
    }

    // Ordenar lecciones dentro de cada sección
    const sectionsWithOrderedLessons = sections?.map(section => ({
      ...section,
      lessons: section.lessons?.sort((a: { order: number }, b: { order: number }) => a.order - b.order) || []
    }));

    return NextResponse.json({ sections: sectionsWithOrderedLessons });
  } catch (error) {
    console.error("Error in GET sections:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST - Crear nueva sección
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, title, description, order } = body;

    if (!courseId || !title) {
      return NextResponse.json(
        { error: "courseId y title son requeridos" },
        { status: 400 }
      );
    }

    // Si no se proporciona order, obtener el máximo actual + 1
    let sectionOrder = order;
    if (sectionOrder === undefined) {
      const { data: existingSections } = await supabase
        .from("course_sections")
        .select("order")
        .eq("course_id", courseId)
        .order("order", { ascending: false })
        .limit(1);

      sectionOrder = existingSections && existingSections.length > 0 
        ? existingSections[0].order + 1 
        : 0;
    }

    const { data: section, error } = await supabase
      .from("course_sections")
      .insert({
        course_id: courseId,
        title,
        description: description || null,
        order: sectionOrder,
        is_expanded: false
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating section:", error);
      return NextResponse.json(
        { error: "Error al crear sección" },
        { status: 500 }
      );
    }

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    console.error("Error in POST section:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar sección
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, description, order, isExpanded } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id es requerido" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = order;
    if (isExpanded !== undefined) updateData.is_expanded = isExpanded;

    const { data: section, error } = await supabase
      .from("course_sections")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating section:", error);
      return NextResponse.json(
        { error: "Error al actualizar sección" },
        { status: 500 }
      );
    }

    return NextResponse.json({ section });
  } catch (error) {
    console.error("Error in PUT section:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar sección
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id es requerido" },
        { status: 400 }
      );
    }

    // Primero, desvincular las lecciones de esta sección
    await supabase
      .from("lessons")
      .update({ section_id: null })
      .eq("section_id", id);

    // Luego eliminar la sección
    const { error } = await supabase
      .from("course_sections")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting section:", error);
      return NextResponse.json(
        { error: "Error al eliminar sección" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE section:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
