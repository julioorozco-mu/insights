import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const courseId = searchParams.get('courseId');

    if (!userId || !courseId) {
      return NextResponse.json({ error: 'userId y courseId son requeridos' }, { status: 400 });
    }

    // 1. Obtener registro de estudiante
    const { data: student, error: studentError } = await supabaseAdmin
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (studentError) {
      console.error('Error fetching student:', studentError);
      return NextResponse.json({ error: studentError.message }, { status: 500 });
    }

    if (!student) {
      return NextResponse.json({ isEnrolled: false, reason: 'no_student_record' });
    }

    // 2. Verificar inscripción
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from(TABLES.STUDENT_ENROLLMENTS)
      .select('id')
      .eq('course_id', courseId)
      .eq('student_id', student.id)
      .maybeSingle();

    if (enrollmentError) {
      console.error('Error fetching enrollment:', enrollmentError);
      return NextResponse.json({ error: enrollmentError.message }, { status: 500 });
    }

    return NextResponse.json({ isEnrolled: !!enrollment });

  } catch (error: any) {
    console.error('Check enrollment API error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

