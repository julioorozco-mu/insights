import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getApiAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const surveyId = searchParams.get('surveyId');
    const userId = searchParams.get('userId') || authUser.id;

    if (!surveyId) {
      return NextResponse.json(
        { error: 'surveyId es requerido' },
        { status: 400 }
      );
    }

    // Solo permitir que el usuario vea sus propias respuestas
    if (userId !== authUser.id && authUser.role !== 'admin' && authUser.role !== 'superadmin' && authUser.role !== 'support') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Buscar respuesta guardada
    const { data: response, error } = await supabaseAdmin
      .from(TABLES.SURVEY_RESPONSES)
      .select('id, answers, submitted_at')
      .eq('survey_id', surveyId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[getQuizResponse API] Error:', error);
      return NextResponse.json(
        { error: 'Error al obtener la respuesta' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      response: response || null,
    });
  } catch (e: any) {
    console.error('[getQuizResponse API] Error:', e);
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    );
  }
}
