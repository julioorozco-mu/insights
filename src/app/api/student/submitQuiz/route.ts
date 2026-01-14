import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getApiAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (authUser.role !== 'student') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { surveyId, courseId, lessonId, answers } = body;

    if (!surveyId || !courseId || !answers) {
      return NextResponse.json(
        { error: 'surveyId, courseId y answers son requeridos' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Obtener registro de estudiante
    const { data: student, error: studentError } = await supabaseAdmin
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'No se encontró el registro de estudiante' },
        { status: 404 }
      );
    }

    // Verificar si ya existe una respuesta
    const { data: existingResponse, error: checkError } = await supabaseAdmin
      .from(TABLES.SURVEY_RESPONSES)
      .select('id')
      .eq('survey_id', surveyId)
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[submitQuiz API] Error checking existing response:', checkError);
      return NextResponse.json(
        { error: 'Error al verificar respuesta existente' },
        { status: 500 }
      );
    }

    // Obtener nombre del usuario
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('name')
      .eq('id', authUser.id)
      .maybeSingle();

    if (userDataError || !userData) {
      return NextResponse.json(
        { error: 'Error al obtener información del usuario' },
        { status: 500 }
      );
    }

    // Preparar datos de respuesta
    const responseData: any = {
      survey_id: surveyId,
      user_id: authUser.id,
      user_name: userData.name || 'Usuario',
      course_id: courseId,
      lesson_id: lessonId || null,
      answers: answers,
      submitted_at: new Date().toISOString(),
    };

    let responseId: string;

    if (existingResponse) {
      // Actualizar respuesta existente
      const { data: updatedResponse, error: updateError } = await supabaseAdmin
        .from(TABLES.SURVEY_RESPONSES)
        .update({
          answers: responseData.answers,
          submitted_at: responseData.submitted_at,
        })
        .eq('id', existingResponse.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('[submitQuiz API] Error updating response:', updateError);
        return NextResponse.json(
          { error: 'Error al actualizar la respuesta' },
          { status: 500 }
        );
      }

      responseId = updatedResponse.id;
    } else {
      // Crear nueva respuesta
      const { data: newResponse, error: insertError } = await supabaseAdmin
        .from(TABLES.SURVEY_RESPONSES)
        .insert(responseData)
        .select('id')
        .single();

      if (insertError) {
        console.error('[submitQuiz API] Error inserting response:', insertError);
        return NextResponse.json(
          { error: 'Error al guardar la respuesta' },
          { status: 500 }
        );
      }

      responseId = newResponse.id;
    }

    return NextResponse.json({
      success: true,
      responseId,
      message: existingResponse ? 'Respuesta actualizada' : 'Respuesta guardada',
    });
  } catch (e: any) {
    console.error('[submitQuiz API] Error:', e);
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    );
  }
}
