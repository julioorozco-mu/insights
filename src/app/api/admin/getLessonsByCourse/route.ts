import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 });
    }

    // Primero obtener el curso para ver qué lecciones tiene
    const { data: courseData, error: courseError } = await supabaseAdmin
      .from(TABLES.COURSES)
      .select('lesson_ids')
      .eq('id', courseId)
      .single();

    if (courseError || !courseData) {
      console.error('[getLessonsByCourse API] Error loading course:', courseError);
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    const lessonIds = courseData.lesson_ids || [];

    if (lessonIds.length === 0) {
      return NextResponse.json({ lessons: [] }, { status: 200 });
    }

    // Cargar las lecciones
    const { data: lessonsData, error: lessonsError } = await supabaseAdmin
      .from(TABLES.LESSONS)
      .select('id, title, order, course_id')
      .in('id', lessonIds)
      .order('order', { ascending: true });

    if (lessonsError) {
      console.error('[getLessonsByCourse API] Error loading lessons:', lessonsError);
      return NextResponse.json({ error: lessonsError.message }, { status: 500 });
    }

    const lessons = (lessonsData || []).map((l: any) => ({
      id: l.id,
      title: l.title || '',
      order: l.order || 0,
      courseId: l.course_id,
    }));

    return NextResponse.json({ lessons }, { status: 200 });
  } catch (e: any) {
    console.error('[getLessonsByCourse API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

