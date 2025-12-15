import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { requireApiRoles } from '@/lib/auth/apiRouteAuth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiRoles(['admin', 'superadmin', 'support']);
    if (auth instanceof NextResponse) return auth;

    const supabaseAdmin = getSupabaseAdmin();

    // Cargar usuarios con rol "student"
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('[getStudents API] Error loading users:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    // Mapear usuarios a formato Student
    const studentsData = (usersData || []).map((user: any) => ({
      id: user.id,
      name: user.name || '',
      lastName: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      dateOfBirth: user.date_of_birth || '',
      gender: user.gender || '',
      state: user.state || '',
      avatarUrl: user.avatar_url || '',
      username: user.username || '',
      createdAt: user.created_at || '',
    }));

    // Cargar información adicional de estudiantes (cursos completados, certificados)
    const studentIds = studentsData.map((s: any) => s.id);
    let studentsDetailsMap = new Map<string, any>();

    if (studentIds.length > 0) {
      const { data: studentsDetails, error: detailsError } = await supabaseAdmin
        .from(TABLES.STUDENTS)
        .select('user_id, enrollment_date, completed_courses, certificates')
        .in('user_id', studentIds);

      if (!detailsError && studentsDetails) {
        studentsDetails.forEach((detail: any) => {
          studentsDetailsMap.set(detail.user_id, {
            enrollmentDate: detail.enrollment_date,
            completedCourses: detail.completed_courses || [],
            certificates: detail.certificates || [],
          });
        });
      }
    }

    // Combinar datos de usuarios con detalles de estudiantes
    const students = studentsData.map((student: any) => {
      const details = studentsDetailsMap.get(student.id);
      return {
        ...student,
        enrollmentDate: details?.enrollmentDate || '',
        completedCourses: details?.completedCourses || [],
        certificates: details?.certificates || [],
      };
    });

    return NextResponse.json({ students }, { status: 200 });
  } catch (e: any) {
    console.error('[getStudents API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

