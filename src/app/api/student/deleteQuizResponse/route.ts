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

    const body = await req.json();
    const { surveyId, userId } = body;

    if (!surveyId) {
      return NextResponse.json(
        { error: 'surveyId es requerido' },
        { status: 400 }
      );
    }

    // Solo permitir que el usuario elimine sus propias respuestas
    const targetUserId = userId || authUser.id;
    if (targetUserId !== authUser.id && authUser.role !== 'admin' && authUser.role !== 'superadmin' && authUser.role !== 'support') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Limpiar respuestas pero conservar el registro y attempt_count
    // para poder rastrear los intentos del estudiante
    const { error } = await supabaseAdmin
      .from(TABLES.SURVEY_RESPONSES)
      .update({
        answers: [],
        score: null,
        total_questions: null,
        percentage: null,
        submitted_at: null,
      })
      .eq('survey_id', surveyId)
      .eq('user_id', targetUserId);

    if (error) {
      console.error('[deleteQuizResponse API] Error:', error);
      return NextResponse.json(
        { error: 'Error al limpiar la respuesta' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Respuesta limpiada para reintento',
    });
  } catch (e: any) {
    console.error('[deleteQuizResponse API] Error:', e);
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    );
  }
}
