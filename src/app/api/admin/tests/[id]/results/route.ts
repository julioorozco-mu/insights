import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';
import { getTeacherAssignedCourseIds, teacherHasViewAccessToTest } from '@/lib/auth/testPermissions';

/**
 * GET /api/admin/tests/[id]/results
 * Obtiene los resultados y estadísticas de una evaluación
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const testId = params.id;

    const authUser = await getApiAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const isAdmin =
      authUser.role === 'admin' || authUser.role === 'superadmin' || authUser.role === 'support';

    if (!isAdmin) {
      if (authUser.role !== 'teacher') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      const allowed = await teacherHasViewAccessToTest(authUser.id, testId);
      if (!allowed) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Obtener información del test
    const { data: test, error: testError } = await supabaseAdmin
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError || !test) {
      return NextResponse.json(
        { error: 'Evaluación no encontrada' },
        { status: 404 }
      );
    }

    // Obtener todos los intentos de este test
    const teacherAssignedCourseIds =
      !isAdmin && authUser.role === 'teacher'
        ? await getTeacherAssignedCourseIds(authUser.id)
        : null;

    let attemptsQuery = supabaseAdmin
      .from('test_attempts')
      .select(`
        *,
        student:users!test_attempts_student_id_fkey(
          id,
          name,
          last_name,
          email,
          avatar_url
        )
      `)
      .eq('test_id', testId)
      .order('created_at', { ascending: false });

    if (teacherAssignedCourseIds) {
      if (teacherAssignedCourseIds.length === 0) {
        return NextResponse.json({
          test: transformTest(test),
          stats: getEmptyStats(),
          attempts: [],
        });
      }

      attemptsQuery = attemptsQuery.in('course_id', teacherAssignedCourseIds);
    }

    const { data: attempts, error: attemptsError } = await attemptsQuery;

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError);
      // Si la tabla no existe, devolver datos vacíos
      if (attemptsError.code === 'PGRST205') {
        return NextResponse.json({
          test: transformTest(test),
          stats: getEmptyStats(),
          attempts: [],
        });
      }
    }

    const attemptsList = attempts || [];

    // Calcular estadísticas
    const completedAttempts = attemptsList.filter(a => a.status === 'completed');
    const passedAttempts = completedAttempts.filter(a => a.passed === true);
    const accreditedAttempts = completedAttempts.filter(a => a.accredited === true);
    
    const scores = completedAttempts
      .map(a => a.percentage)
      .filter((p): p is number => p !== null && p !== undefined);
    
    const times = completedAttempts
      .map(a => a.time_spent_seconds)
      .filter((t): t is number => t !== null && t !== undefined);

    const stats = {
      totalAttempts: attemptsList.length,
      completedAttempts: completedAttempts.length,
      averageScore: scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length 
        : 0,
      passRate: completedAttempts.length > 0 
        ? (passedAttempts.length / completedAttempts.length) * 100 
        : 0,
      accreditationRate: completedAttempts.length > 0 
        ? (accreditedAttempts.length / completedAttempts.length) * 100 
        : 0,
      averageTimeSeconds: times.length > 0 
        ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) 
        : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
    };

    // Transformar intentos a formato camelCase
    const transformedAttempts = attemptsList.map(attempt => ({
      id: attempt.id,
      courseTestId: attempt.course_test_id,
      testId: attempt.test_id,
      courseId: attempt.course_id,
      studentId: attempt.student_id,
      attemptNumber: attempt.attempt_number,
      status: attempt.status,
      score: attempt.score,
      maxScore: attempt.max_score,
      percentage: attempt.percentage,
      passed: attempt.passed,
      accredited: attempt.accredited,
      startTime: attempt.start_time,
      endTime: attempt.end_time,
      timeSpentSeconds: attempt.time_spent_seconds,
      createdAt: attempt.created_at,
      updatedAt: attempt.updated_at,
      student: attempt.student ? {
        id: attempt.student.id,
        name: attempt.student.name,
        lastName: attempt.student.last_name,
        email: attempt.student.email,
        avatarUrl: attempt.student.avatar_url,
      } : null,
    }));

    return NextResponse.json({
      test: transformTest(test),
      stats,
      attempts: transformedAttempts,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/tests/[id]/results:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function transformTest(test: any) {
  return {
    id: test.id,
    title: test.title,
    description: test.description,
    instructions: test.instructions,
    coverImageUrl: test.cover_image_url,
    status: test.status,
    timeMode: test.time_mode,
    timeLimitMinutes: test.time_limit_minutes,
    passingScore: test.passing_score,
    maxAttempts: test.max_attempts,
    shuffleQuestions: test.shuffle_questions,
    shuffleOptions: test.shuffle_options,
    showResultsImmediately: test.show_results_immediately,
    showCorrectAnswers: test.show_correct_answers,
    allowReview: test.allow_review,
    createdBy: test.created_by,
    isActive: test.is_active,
    createdAt: test.created_at,
    updatedAt: test.updated_at,
  };
}

function getEmptyStats() {
  return {
    totalAttempts: 0,
    completedAttempts: 0,
    averageScore: 0,
    passRate: 0,
    accreditationRate: 0,
    averageTimeSeconds: 0,
    highestScore: 0,
    lowestScore: 0,
  };
}

