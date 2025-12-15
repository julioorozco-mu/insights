import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';
import { teacherHasAccessToCourse } from '@/lib/auth/coursePermissions';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getApiAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const surveyId = searchParams.get('surveyId') || searchParams.get('quizId');
    const courseId = searchParams.get('courseId');
    const preview = searchParams.get('preview') === 'true';

    if (!surveyId) {
      return NextResponse.json({ error: 'surveyId es requerido' }, { status: 400 });
    }

    if (!courseId) {
      return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    if (preview) {
      const isAdmin =
        authUser.role === 'admin' || authUser.role === 'superadmin' || authUser.role === 'support';

      if (!isAdmin) {
        if (authUser.role !== 'teacher') {
          return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        try {
          const allowed = await teacherHasAccessToCourse(authUser.id, courseId);
          if (!allowed) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
          }
        } catch (e) {
          console.error('[getSurvey API] Error validando curso asignado:', e);
          return NextResponse.json({ error: 'Error validando permisos' }, { status: 500 });
        }
      }
    } else {
      if (authUser.role !== 'student') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      const { data: student, error: studentError } = await supabaseAdmin
        .from(TABLES.STUDENTS)
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (studentError) {
        console.error('[getSurvey API] Error fetching student:', studentError);
        return NextResponse.json({ error: 'Error obteniendo registro de estudiante' }, { status: 500 });
      }

      if (!student) {
        return NextResponse.json({ error: 'No tienes registro de estudiante' }, { status: 403 });
      }

      const { data: enrollment, error: enrollmentError } = await supabaseAdmin
        .from(TABLES.STUDENT_ENROLLMENTS)
        .select('id')
        .eq('student_id', student.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (enrollmentError) {
        console.error('[getSurvey API] Error checking enrollment:', enrollmentError);
        return NextResponse.json({ error: 'Error verificando inscripción' }, { status: 500 });
      }

      if (!enrollment) {
        return NextResponse.json({ error: 'No estás inscrito en este curso' }, { status: 403 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from(TABLES.SURVEYS)
      .select('id, title, description, type, questions, created_at')
      .eq('id', surveyId)
      .maybeSingle();

    if (error) {
      console.error('[getSurvey API] Error loading survey:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Quiz no encontrado' }, { status: 404 });
    }

    const survey = {
      id: data.id,
      title: data.title,
      description: data.description,
      type: data.type,
      questions: data.questions || [],
      createdAt: data.created_at,
    };

    return NextResponse.json({ survey }, { status: 200 });
  } catch (e: any) {
    console.error('[getSurvey API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
