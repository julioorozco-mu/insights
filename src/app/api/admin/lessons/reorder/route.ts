import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// POST - Reordenar lecciones y/o moverlas entre secciones
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lessons } = body;

    if (!lessons || !Array.isArray(lessons)) {
      return NextResponse.json(
        { error: "lessons array es requerido" },
        { status: 400 }
      );
    }

    // Actualizar el orden y sección de cada lección
    const updates = lessons.map((lesson: { id: string; order: number; sectionId?: string | null }) =>
      supabase
        .from("lessons")
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
