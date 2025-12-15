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

    if (authUser.role !== 'student') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verificar que el curso exista
    const { data: course, error: courseError } = await supabaseAdmin
      .from(TABLES.COURSES)
      .select('id, title')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError || !course) {
      console.error('[student/enrollStudent API] Curso no encontrado:', courseError);
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    // Buscar o crear el registro de estudiante
    let studentId: string;

    const { data: existingStudent, error: studentError } = await supabaseAdmin
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (studentError) {
      console.error('[student/enrollStudent API] Error buscando estudiante:', studentError);
      return NextResponse.json({ error: 'Error obteniendo registro de estudiante' }, { status: 500 });
    }

    if (existingStudent) {
      studentId = existingStudent.id;
    } else {
      const { data: newStudent, error: createStudentError } = await supabaseAdmin
        .from(TABLES.STUDENTS)
        .insert({ user_id: authUser.id })
        .select('id')
        .single();

      if (createStudentError || !newStudent) {
        console.error('[student/enrollStudent API] Error creando estudiante:', createStudentError);
        return NextResponse.json(
          {
            error: 'Error al crear registro de estudiante',
            details: createStudentError?.message,
          },
          { status: 500 }
        );
      }

      studentId = newStudent.id;
    }

    // Verificar si ya está inscrito
    const { data: existingEnrollment, error: existingEnrollmentError } = await supabaseAdmin
      .from(TABLES.STUDENT_ENROLLMENTS)
      .select('id, student_id, course_id, enrolled_at, progress')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (existingEnrollmentError) {
      console.error('[student/enrollStudent API] Error validando inscripción:', existingEnrollmentError);
      return NextResponse.json({ error: 'Error verificando inscripción' }, { status: 500 });
    }

    if (existingEnrollment) {
      return NextResponse.json(
        {
          enrollment: {
            id: existingEnrollment.id,
            studentId: existingEnrollment.student_id,
            courseId: existingEnrollment.course_id,
            enrolledAt: existingEnrollment.enrolled_at,
            progress: existingEnrollment.progress || 0,
          },
          message: 'Ya estás inscrito en este curso',
          alreadyEnrolled: true,
        },
        { status: 200 }
      );
    }

    // Crear la inscripción
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from(TABLES.STUDENT_ENROLLMENTS)
      .insert({
        student_id: studentId,
        course_id: courseId,
        progress: 0,
        completed_lessons: [],
      })
      .select()
      .single();

    if (enrollmentError) {
      console.error('[student/enrollStudent API] Error creando inscripción:', enrollmentError);
      return NextResponse.json(
        {
          error: 'Error al crear inscripción',
          details: enrollmentError.message,
          hint: enrollmentError.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        enrollment: {
          id: enrollment.id,
          studentId: enrollment.student_id,
          courseId: enrollment.course_id,
          enrolledAt: enrollment.enrolled_at,
          progress: enrollment.progress,
        },
        success: true,
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error('[student/enrollStudent API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
