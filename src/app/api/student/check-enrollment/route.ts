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

    if (authUser.role !== 'student') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 });
    }

    // 1. Obtener registro de estudiante
    const { data: student, error: studentError } = await supabaseAdmin
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (studentError) {
      console.error('Error fetching student:', studentError);
      return NextResponse.json({ error: studentError.message }, { status: 500 });
    }

    if (!student) {
      return NextResponse.json({ isEnrolled: false, reason: 'no_student_record' });
    }

    // 2. Verificar inscripción e incluir progreso
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from(TABLES.STUDENT_ENROLLMENTS)
      .select('id, progress, completed_lessons, subsection_progress, last_accessed_lesson_id')
      .eq('course_id', courseId)
      .eq('student_id', student.id)
      .maybeSingle();

    if (enrollmentError) {
      console.error('Error fetching enrollment:', enrollmentError);
      return NextResponse.json({ error: enrollmentError.message }, { status: 500 });
    }

    if (!enrollment) {
      return NextResponse.json({ isEnrolled: false });
    }

    return NextResponse.json({ 
      isEnrolled: true,
      progress: enrollment.progress || 0,
      completedLessons: enrollment.completed_lessons || [],
      subsectionProgress: enrollment.subsection_progress || {},
      lastAccessedLessonId: enrollment.last_accessed_lesson_id || null,
    });

  } catch (error: any) {
    console.error('Check enrollment API error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

