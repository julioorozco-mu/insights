import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

/**
 * GET /api/student/questions - Obtener preguntas de una lección
 * Query params: lessonId, sortBy (recent | popular)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');
    const sortBy = searchParams.get('sortBy') || 'recent';

    if (!lessonId) {
      return NextResponse.json(
        { error: 'lessonId es requerido' },
        { status: 400 }
      );
    }

    // Validar que lessonId sea un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lessonId)) {
      return NextResponse.json({ questions: [] }, { status: 200 });
    }

    // Obtener preguntas con información del autor
    let query = supabase
      .from(TABLES.LESSON_QUESTIONS)
      .select(`
        *,
        student:students!lesson_questions_student_id_fkey (
          id,
          user:users!students_user_id_fkey (
            id,
            name,
            last_name,
            avatar_url
          )
        ),
        answers:lesson_question_answers (
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
        )
      `)
      .eq('lesson_id', lessonId);

    // Ordenar según preferencia
    if (sortBy === 'popular') {
      query = query.order('upvotes', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: questions, error: questionsError } = await query;

    if (questionsError) {
      console.error('[questions API] Error fetching questions:', questionsError);
      return NextResponse.json(
        { error: questionsError.message },
        { status: 500 }
      );
    }

    // Formatear respuesta
    const formattedQuestions = (questions || []).map((q: any) => ({
      id: q.id,
      questionText: q.question_text,
      videoTimestamp: q.video_timestamp,
      isResolved: q.is_resolved,
      upvotes: q.upvotes,
      createdAt: q.created_at,
      author: q.student?.user ? {
        id: q.student.user.id,
        name: `${q.student.user.name} ${q.student.user.last_name || ''}`.trim(),
        avatarUrl: q.student.user.avatar_url,
      } : null,
      answers: (q.answers || []).map((a: any) => ({
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
      })).sort((a: any, b: any) => {
        // Instructor answers first, then by upvotes
        if (a.isInstructorAnswer && !b.isInstructorAnswer) return -1;
        if (!a.isInstructorAnswer && b.isInstructorAnswer) return 1;
        if (a.isAccepted && !b.isAccepted) return -1;
        if (!a.isAccepted && b.isAccepted) return 1;
        return b.upvotes - a.upvotes;
      }),
      answersCount: (q.answers || []).length,
    }));

    return NextResponse.json({ questions: formattedQuestions }, { status: 200 });
  } catch (e: any) {
    console.error('[questions API] Error:', e);
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student/questions - Crear una nueva pregunta
 * Body: { userId, lessonId, courseId, questionText, videoTimestamp? }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { userId, lessonId, courseId, questionText, videoTimestamp = 0 } = body;

    if (!userId || !lessonId || !courseId || !questionText) {
      return NextResponse.json(
        { error: 'userId, lessonId, courseId y questionText son requeridos' },
        { status: 400 }
      );
    }

    // Obtener student_id
    const { data: student, error: studentError } = await supabase
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'No se encontró el registro de estudiante' },
        { status: 404 }
      );
    }

    // Crear la pregunta
    const { data: question, error: questionError } = await supabase
      .from(TABLES.LESSON_QUESTIONS)
      .insert({
        student_id: student.id,
        lesson_id: lessonId,
        course_id: courseId,
        question_text: questionText.trim(),
        video_timestamp: videoTimestamp,
      })
      .select()
      .single();

    if (questionError) {
      console.error('[questions API] Error creating question:', questionError);
      return NextResponse.json(
        { error: questionError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ question }, { status: 201 });
  } catch (e: any) {
    console.error('[questions API] Error:', e);
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    );
  }
}
