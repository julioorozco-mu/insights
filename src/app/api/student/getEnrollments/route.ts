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

    // Buscar el registro de estudiante
    const { data: student, error: studentError } = await supabaseAdmin
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (studentError) {
      console.error('[student/getEnrollments API] Error:', studentError);
      return NextResponse.json({ error: 'Error obteniendo registro de estudiante' }, { status: 500 });
    }

    if (!student) {
      return NextResponse.json({ enrollments: [] }, { status: 200 });
    }

    // Obtener inscripciones del estudiante
    const { data: enrollmentsData, error: enrollmentsError } = await supabaseAdmin
      .from(TABLES.STUDENT_ENROLLMENTS)
      .select('id, course_id, student_id, enrolled_at, progress, completed_lessons')
      .eq('student_id', student.id);

    if (enrollmentsError) {
      console.error('[student/getEnrollments API] Error:', enrollmentsError);
      return NextResponse.json({ error: enrollmentsError.message }, { status: 500 });
    }

    const enrollments = (enrollmentsData || []).map((e: any) => ({
      id: e.id,
      courseId: e.course_id,
      studentId: e.student_id,
      enrolledAt: e.enrolled_at,
      progress: e.progress || 0,
      completedLessons: e.completed_lessons || [],
    }));

    return NextResponse.json({ enrollments }, { status: 200 });
  } catch (e: any) {
    console.error('[student/getEnrollments API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
