import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

// POST - Crear nuevo cuestionario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, type, questions } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'El título es requerido' },
        { status: 400 }
      );
    }

    if (!type || !['entry', 'exit', 'lesson'].includes(type)) {
      return NextResponse.json(
        { error: 'El tipo debe ser: entry, exit o lesson' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const surveyData = {
      title: title.trim(),
      description: description?.trim() || null,
      type,
      questions: questions || [],
    };

    const { data, error } = await supabaseAdmin
      .from(TABLES.SURVEYS)
      .insert(surveyData)
      .select()
      .single();

    if (error) {
      console.error('[Surveys API] Error creating survey:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      survey: {
        id: data.id,
        title: data.title,
        description: data.description,
        type: data.type,
        questions: data.questions,
        createdAt: data.created_at,
      },
      message: 'Cuestionario creado exitosamente'
    }, { status: 201 });

  } catch (error: any) {
    console.error('[Surveys API] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar cuestionario existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, description, type, questions } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID del cuestionario es requerido' },
        { status: 400 }
      );
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'El título es requerido' },
        { status: 400 }
      );
    }

    if (!type || !['entry', 'exit', 'lesson'].includes(type)) {
      return NextResponse.json(
        { error: 'El tipo debe ser: entry, exit o lesson' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const surveyData = {
      title: title.trim(),
      description: description?.trim() || null,
      type,
      questions: questions || [],
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from(TABLES.SURVEYS)
      .update(surveyData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Surveys API] Error updating survey:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      survey: {
        id: data.id,
        title: data.title,
        description: data.description,
        type: data.type,
        questions: data.questions,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
      message: 'Cuestionario actualizado exitosamente'
    });

  } catch (error: any) {
    console.error('[Surveys API] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar cuestionario
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'El ID del cuestionario es requerido' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Primero verificar que existe
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from(TABLES.SURVEYS)
      .select('id, title')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Cuestionario no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar respuestas asociadas primero
    await supabaseAdmin
      .from(TABLES.SURVEY_RESPONSES)
      .delete()
      .eq('survey_id', id);

    // Eliminar el cuestionario
    const { error: deleteError } = await supabaseAdmin
      .from(TABLES.SURVEYS)
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Surveys API] Error deleting survey:', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Cuestionario "${existing.title}" eliminado exitosamente`
    });

  } catch (error: any) {
    console.error('[Surveys API] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
