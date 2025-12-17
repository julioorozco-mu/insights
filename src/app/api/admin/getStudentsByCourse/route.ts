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

    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 });
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
        console.error('[getStudentsByCourse API] Error validando curso asignado:', e);
        return NextResponse.json({ error: 'Error validando permisos' }, { status: 500 });
      }
    }

    // Obtener inscripciones del curso
    const { data: enrollmentsData, error: enrollmentsError } = await supabaseAdmin
      .from(TABLES.STUDENT_ENROLLMENTS)
      .select(`
        id,
        student_id,
        enrolled_at,
        students:student_id (
          user_id,
          users:user_id (
            id, name, email, phone, date_of_birth, gender, state
          )
        )
      `)
      .eq('course_id', courseId);

    if (enrollmentsError) {
      console.error('[getStudentsByCourse API] Error loading enrollments:', enrollmentsError);
      return NextResponse.json({ error: enrollmentsError.message }, { status: 500 });
    }

    // Obtener IDs de estudiantes para verificar certificados
    const studentIds = (enrollmentsData || [])
      .map((e: any) => e.students?.users?.id)
      .filter((id: string) => id);

    // Verificar certificados descargados
    let certificatesMap = new Map<string, boolean>();
    if (studentIds.length > 0) {
      const { data: certDownloads } = await supabaseAdmin
        .from(TABLES.CERTIFICATE_DOWNLOADS)
        .select('student_id')
        .eq('course_id', courseId)
        .in('student_id', studentIds);

      if (certDownloads) {
        certDownloads.forEach((cert: any) => {
          certificatesMap.set(cert.student_id, true);
        });
      }
    }

    // Mapear estudiantes
    const students = (enrollmentsData || [])
      .map((enrollment: any) => {
        const studentData = enrollment.students?.users;
        if (!studentData) return null;

        const studentId = studentData.id;

        // Calcular edad desde dateOfBirth
        let calculatedAge: number | undefined = undefined;
        const dateOfBirth = studentData.date_of_birth;
        if (dateOfBirth) {
          const birthDate = new Date(dateOfBirth);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          calculatedAge = age;
        }

        // Traducir género a español
        const genderValue = studentData.gender || '';
        let genderInSpanish = '';
        if (genderValue.toLowerCase() === 'male' || genderValue.toLowerCase() === 'masculino') {
          genderInSpanish = 'Masculino';
        } else if (genderValue.toLowerCase() === 'female' || genderValue.toLowerCase() === 'femenino') {
          genderInSpanish = 'Femenino';
        } else if (genderValue) {
          genderInSpanish = genderValue;
        }

        // Verificar si descargó certificado
        const hasCertificate = certificatesMap.get(studentId) || false;

        // Concatenar nombre completo
        const fullName = studentData.name || 'N/A';

        return {
          id: studentId,
          name: fullName,
          email: studentData.email || 'N/A',
          phone: studentData.phone || '',
          state: studentData.state || '',
          age: calculatedAge,
          birthDate: dateOfBirth || '',
          gender: genderInSpanish,
          hasCertificate,
          enrolledAt: enrollment.enrolled_at
            ? new Date(enrollment.enrolled_at).toLocaleDateString('es-MX')
            : 'N/A',
        };
      })
      .filter((s: any) => s !== null);

    return NextResponse.json({ students }, { status: 200 });
  } catch (e: any) {
    console.error('[getStudentsByCourse API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

