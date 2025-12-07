import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// POST - Reordenar secciones (para drag-and-drop)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sections } = body;

    if (!sections || !Array.isArray(sections)) {
      return NextResponse.json(
        { error: "sections array es requerido" },
        { status: 400 }
      );
    }

    // Actualizar el orden de cada sección
    const updates = sections.map((section: { id: string; order: number }) =>
      supabase
        .from("course_sections")
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
