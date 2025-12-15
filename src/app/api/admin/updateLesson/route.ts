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
    const { lessonId, title, description, content } = body;

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId es requerido' }, { status: 400 });
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
    }

    const { data: existingLesson, error: existingLessonError } = await supabaseAdmin
      .from(TABLES.LESSONS)
      .select('id, course_id')
      .eq('id', lessonId)
      .maybeSingle();

    if (existingLessonError) {
      console.error('[updateLesson API] Error loading lesson:', existingLessonError);
      return NextResponse.json({ error: 'Error obteniendo lección' }, { status: 500 });
    }

    if (!existingLesson) {
      return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 });
    }

    const isAdmin =
      authUser.role === 'admin' || authUser.role === 'superadmin' || authUser.role === 'support';

    if (!isAdmin) {
      if (authUser.role !== 'teacher') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      const courseId = existingLesson.course_id || '';

      try {
        const allowed = await teacherHasAccessToCourse(authUser.id, courseId);
        if (!allowed) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }
      } catch (e) {
        console.error('[updateLesson API] Error validando curso asignado:', e);
        return NextResponse.json({ error: 'Error validando permisos' }, { status: 500 });
      }
    }

    // Preparar datos para actualizar
    const updateData: Record<string, any> = {
      title: title.trim(),
      updated_at: new Date().toISOString(),
    };

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (content !== undefined) {
      updateData.content = content || null;
    }

    // Actualizar la lección
    const { data, error } = await supabaseAdmin
      .from(TABLES.LESSONS)
      .update(updateData)
      .eq('id', lessonId)
      .select()
      .single();

    if (error) {
      console.error('[updateLesson API] Error updating lesson:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ lesson: data, success: true }, { status: 200 });
  } catch (e: any) {
    console.error('[updateLesson API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

