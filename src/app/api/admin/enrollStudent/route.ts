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

    const isAdmin =
      authUser.role === 'admin' || authUser.role === 'superadmin' || authUser.role === 'support';

    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { userId, courseId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId es requerido' }, { status: 400 });
    }

    if (!courseId) {
      return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 });
    }

    // Verificar que el curso exista
    const { data: course, error: courseError } = await supabaseAdmin
      .from(TABLES.COURSES)
      .select('id, title')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      console.error('[enrollStudent API] Curso no encontrado:', courseError);
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    // Buscar o crear el registro de estudiante
    let studentId: string;
    
    const { data: existingStudent, error: studentError } = await supabaseAdmin
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingStudent) {
      studentId = existingStudent.id;
    } else {
      // Crear nuevo registro de estudiante
      const { data: newStudent, error: createStudentError } = await supabaseAdmin
        .from(TABLES.STUDENTS)
        .insert({ user_id: userId })
        .select('id')
        .single();

      if (createStudentError || !newStudent) {
        console.error('[enrollStudent API] Error creando estudiante:', createStudentError);
        return NextResponse.json({ 
          error: 'Error al crear registro de estudiante',
          details: createStudentError?.message 
        }, { status: 500 });
      }
      
      studentId = newStudent.id;
    }

    // Verificar si ya está inscrito
    const { data: existingEnrollment } = await supabaseAdmin
      .from(TABLES.STUDENT_ENROLLMENTS)
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .single();

    if (existingEnrollment) {
      return NextResponse.json({ 
        enrollment: existingEnrollment,
        message: 'Ya estás inscrito en este curso',
        alreadyEnrolled: true 
      }, { status: 200 });
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
      console.error('[enrollStudent API] Error creando inscripción:', enrollmentError);
      return NextResponse.json({ 
        error: 'Error al crear inscripción',
        details: enrollmentError.message,
        hint: enrollmentError.hint 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      enrollment: {
        id: enrollment.id,
        studentId: enrollment.student_id,
        courseId: enrollment.course_id,
        enrolledAt: enrollment.enrolled_at,
        progress: enrollment.progress,
      },
      success: true 
    }, { status: 201 });

  } catch (e: any) {
    console.error('[enrollStudent API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
