import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TABLES } from '@/utils/constants';
import {
  rateLimitMiddleware,
  RATE_LIMITS,
} from '@/lib/auth/serverRateLimiter';

/**
 * GET /api/student/questions/[questionId]/answers - Obtener respuestas de una pregunta (lazy loading)
 *
 * Este endpoint es crucial para el lazy loading de respuestas.
 * Solo se llama cuando el usuario expande una pregunta para ver sus respuestas.
 *
 * SEGURIDAD:
 * - Autenticación requerida via session
 * - Rate limiting aplicado
 * - RLS maneja permisos automáticamente
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    // 1. Rate limiting
    const rateLimitResponse = rateLimitMiddleware(req, RATE_LIMITS.READ);
    if (rateLimitResponse) return rateLimitResponse;

    // 2. Autenticación
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 3. Validar questionId (Next.js 14+ usa Promise para params)
    const { questionId } = await params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!questionId || !uuidRegex.test(questionId)) {
      return NextResponse.json(
        { error: 'ID de pregunta inválido' },
        { status: 400 }
      );
    }

    // 4. Obtener respuestas ordenadas
    // Orden: instructor primero, luego aceptadas, luego por upvotes, luego por fecha
    const { data: answers, error: answersError } = await supabase
      .from(TABLES.LESSON_QUESTION_ANSWERS)
      .select(`
        id,
        answer_text,
        is_instructor_answer,
        is_accepted,
        upvotes,
        created_at,
        user:users!lesson_question_answers_user_id_fkey (
          id,
          name,
          last_name,
          avatar_url,
          role
        )
      `)
      .eq('question_id', questionId)
      .order('is_instructor_answer', { ascending: false })
      .order('is_accepted', { ascending: false })
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: false });

    if (answersError) {
      console.error('[questions/answers API] Error fetching answers:', answersError);
      return NextResponse.json(
        { error: 'Error al obtener respuestas' },
        { status: 500 }
      );
    }

    // 5. Formatear respuesta
    const formattedAnswers = (answers || []).map((a: any) => ({
      id: a.id,
      answerText: a.answer_text,
      isInstructorAnswer: a.is_instructor_answer,
      isAccepted: a.is_accepted,
      upvotes: a.upvotes,
      createdAt: a.created_at,
      author: a.user ? {
        id: a.user.id,
        name: `${a.user.name} ${a.user.last_name || ''}`.trim(),
        avatarUrl: a.user.avatar_url,
        role: a.user.role,
      } : null,
    }));

    return NextResponse.json({
      answers: formattedAnswers,
      total: formattedAnswers.length,
    }, { status: 200 });

  } catch (e: any) {
    console.error('[questions/answers API] Error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
