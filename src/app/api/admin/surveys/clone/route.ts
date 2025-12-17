import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { requireApiRoles } from '@/lib/auth/apiRouteAuth';

// POST - Clonar cuestionario existente
export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiRoles(['admin', 'superadmin', 'support']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { surveyId } = body;

    if (!surveyId) {
      return NextResponse.json(
        { error: 'El ID del cuestionario es requerido' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Obtener el cuestionario original
    const { data: original, error: fetchError } = await supabaseAdmin
      .from(TABLES.SURVEYS)
      .select('*')
      .eq('id', surveyId)
      .single();

    if (fetchError || !original) {
      return NextResponse.json(
        { error: 'Cuestionario no encontrado' },
        { status: 404 }
      );
    }

    // Crear la copia
    const clonedData = {
      title: `Copia de ${original.title}`,
      description: original.description,
      type: original.type,
      questions: original.questions || [],
      course_id: null, // No asociar a curso
      lesson_id: null, // No asociar a lección
    };

    const { data: cloned, error: insertError } = await supabaseAdmin
      .from(TABLES.SURVEYS)
      .insert(clonedData)
      .select()
      .single();

    if (insertError) {
      console.error('[Surveys Clone API] Error cloning survey:', insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      survey: {
        id: cloned.id,
        title: cloned.title,
        description: cloned.description,
        type: cloned.type,
        questions: cloned.questions,
        createdAt: cloned.created_at,
      },
      message: `Cuestionario clonado como "${cloned.title}"`
    }, { status: 201 });

  } catch (error: any) {
    console.error('[Surveys Clone API] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
