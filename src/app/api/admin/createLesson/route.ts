import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { courseId, title, order, type, createdBy } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 });
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
    }

    if (!createdBy) {
      return NextResponse.json({ error: 'createdBy es requerido' }, { status: 400 });
    }

    // Verificar que el curso exista
    const { data: course, error: courseError } = await supabaseAdmin
      .from(TABLES.COURSES)
      .select('id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      console.error('[createLesson API] Curso no encontrado:', courseError);
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    // Crear la lección
    const lessonData = {
      course_id: courseId,
      title: title.trim(),
      order: order ?? 0,
      type: type || 'video',
      created_by: createdBy,
      is_active: true,
      is_published: false,
      is_live: false,
      live_status: 'idle',
      streaming_type: 'agora',
      attachment_ids: [],
      resource_ids: [],
    };

    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from(TABLES.LESSONS)
      .insert(lessonData)
      .select()
      .single();

    if (lessonError) {
      console.error('[createLesson API] Error creating lesson:', lessonError);
      return NextResponse.json({ 
        error: lessonError.message,
        details: lessonError.details,
        hint: lessonError.hint,
        code: lessonError.code
      }, { status: 500 });
    }

    if (!lesson) {
      return NextResponse.json({ error: 'No se pudo crear la lección' }, { status: 500 });
    }

    // Mapear respuesta
    const mappedLesson = {
      id: lesson.id,
      courseId: lesson.course_id,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      order: lesson.order,
      type: lesson.type,
      isActive: lesson.is_active,
      isPublished: lesson.is_published,
      createdAt: lesson.created_at,
      updatedAt: lesson.updated_at,
    };

    return NextResponse.json({ lesson: mappedLesson, success: true }, { status: 201 });
  } catch (e: any) {
    console.error('[createLesson API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
