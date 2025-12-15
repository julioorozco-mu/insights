import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';
import { teacherHasAccessToCourse } from '@/lib/auth/coursePermissions';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getApiAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { courseId, studentId, studentName, studentEmail, newStatus } = body;

    if (!courseId || !studentId) {
      return NextResponse.json({ error: 'courseId y studentId son requeridos' }, { status: 400 });
    }

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
        console.error('[updateCertificateStatus API] Error validando curso asignado:', e);
        return NextResponse.json({ error: 'Error validando permisos' }, { status: 500 });
      }
    }

    const { data: studentRow, error: studentRowError } = await supabaseAdmin
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', studentId)
      .maybeSingle();

    if (studentRowError) {
      console.error('[updateCertificateStatus API] Error buscando student:', studentRowError);
      return NextResponse.json({ error: 'Error validando estudiante' }, { status: 500 });
    }

    if (!studentRow) {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 400 });
    }

    const { data: enrollmentRow, error: enrollmentRowError } = await supabaseAdmin
      .from(TABLES.STUDENT_ENROLLMENTS)
      .select('id')
      .eq('course_id', courseId)
      .eq('student_id', (studentRow as any).id)
      .maybeSingle();

    if (enrollmentRowError) {
      console.error('[updateCertificateStatus API] Error validando inscripción:', enrollmentRowError);
      return NextResponse.json({ error: 'Error validando inscripción' }, { status: 500 });
    }

    if (!enrollmentRow) {
      return NextResponse.json({ error: 'El estudiante no está inscrito en el curso' }, { status: 400 });
    }

    let resolvedStudentName = studentName || '';
    let resolvedStudentEmail = studentEmail || '';

    const { data: userRow, error: userRowError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('name, email')
      .eq('id', studentId)
      .maybeSingle();

    if (userRowError) {
      console.error('[updateCertificateStatus API] Error buscando users:', userRowError);
    }

    if (userRow) {
      resolvedStudentName = (userRow as any).name || resolvedStudentName;
      resolvedStudentEmail = (userRow as any).email || resolvedStudentEmail;
    }

    if (newStatus) {
      // Crear registro de descarga
      const { error } = await supabaseAdmin.from(TABLES.CERTIFICATE_DOWNLOADS).insert({
        course_id: courseId,
        student_id: studentId,
        student_name: resolvedStudentName,
        student_email: resolvedStudentEmail,
        downloaded_at: new Date().toISOString(),
        manually_marked: true,
      });

      if (error) {
        console.error('[updateCertificateStatus API] Error creating certificate:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // Eliminar registro de descarga
      const { error } = await supabaseAdmin
        .from(TABLES.CERTIFICATE_DOWNLOADS)
        .delete()
        .eq('course_id', courseId)
        .eq('student_id', studentId);

      if (error) {
        console.error('[updateCertificateStatus API] Error deleting certificate:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error('[updateCertificateStatus API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

