import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId es requerido' }, { status: 400 });
    }

    // Buscar el registro de estudiante
    const { data: student, error: studentError } = await supabaseAdmin
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!student) {
      // No hay registro de estudiante, retornar lista vacía
      return NextResponse.json({ enrollments: [] }, { status: 200 });
    }

    // Obtener inscripciones del estudiante
    const { data: enrollmentsData, error: enrollmentsError } = await supabaseAdmin
      .from(TABLES.STUDENT_ENROLLMENTS)
      .select('id, course_id, student_id, enrolled_at, progress, completed_lessons')
      .eq('student_id', student.id);

    if (enrollmentsError) {
      console.error('[getEnrollments API] Error:', enrollmentsError);
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
    console.error('[getEnrollments API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
