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
    const lessonId = searchParams.get('lessonId');

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId es requerido' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLES.LESSONS)
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error) {
      console.error('[getLesson API] Error loading lesson:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 });
    }

    const isAdmin =
      authUser.role === 'admin' || authUser.role === 'superadmin' || authUser.role === 'support';

    if (!isAdmin) {
      if (authUser.role !== 'teacher') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      const courseId = data.course_id || '';

      try {
        const allowed = await teacherHasAccessToCourse(authUser.id, courseId);
        if (!allowed) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }
      } catch (e) {
        console.error('[getLesson API] Error validando curso asignado:', e);
        return NextResponse.json({ error: 'Error validando permisos' }, { status: 500 });
      }
    }

    // Mapear lección al formato esperado
    const lesson = {
      id: data.id,
      title: data.title || '',
      description: data.description || null,
      content: data.content || null,
      type: data.type || 'video',
      courseId: data.course_id || '',
      order: data.order || 0,
      videoUrl: data.video_url || null,
      isLive: data.is_live || false,
      agoraChannel: data.agora_channel || null,
      agoraAppId: data.agora_app_id || null,
      liveStatus: data.live_status || 'idle',
      scheduledStartTime: data.scheduled_start_time || null,
      startDate: data.start_date || null,
      durationMinutes: data.duration_minutes || null,
      createdAt: data.created_at || null,
      updatedAt: data.updated_at || null,
      createdBy: data.created_by || null,
    };

    return NextResponse.json({ lesson }, { status: 200 });
  } catch (e: any) {
    console.error('[getLesson API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

