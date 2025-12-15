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

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { count, error } = await supabaseAdmin
      .from(TABLES.STUDENT_ENROLLMENTS)
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId);

    if (error) {
      console.error('[student/getCourseStudentCount API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0 }, { status: 200 });
  } catch (e: any) {
    console.error('[student/getCourseStudentCount API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
