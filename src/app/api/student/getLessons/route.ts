import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const userId = searchParams.get('userId');
    const isPreview = searchParams.get('preview') === 'true';

    if (!courseId) {
      return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 });
    }

    // En modo preview (para maestros), no requerimos userId ni validamos inscripción
    if (!isPreview) {
      if (!userId) {
        return NextResponse.json({ error: 'userId es requerido' }, { status: 400 });
      }

      // 1. Obtener registro de estudiante
      const { data: student, error: studentError } = await supabaseAdmin
        .from(TABLES.STUDENTS)
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (studentError) {
        console.error('[getLessons API] Error fetching student:', studentError);
        return NextResponse.json({ error: 'Error obteniendo registro de estudiante' }, { status: 500 });
      }

      if (!student) {
        return NextResponse.json({ error: 'No tienes registro de estudiante' }, { status: 403 });
      }

      // 2. Verificar que el estudiante está inscrito en el curso
      const { data: enrollment, error: enrollmentError } = await supabaseAdmin
        .from(TABLES.STUDENT_ENROLLMENTS)
        .select('id')
        .eq('student_id', student.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (enrollmentError) {
        console.error('[getLessons API] Error checking enrollment:', enrollmentError);
        return NextResponse.json({ error: 'Error verificando inscripción' }, { status: 500 });
      }

      if (!enrollment) {
        return NextResponse.json({ error: 'No estás inscrito en este curso' }, { status: 403 });
      }
    }

    // Buscar información del curso
    const { data: courseData, error: courseError } = await supabaseAdmin
      .from(TABLES.COURSES)
      .select('id, title, description, cover_image_url, thumbnail_url, teacher_ids')
      .eq('id', courseId)
      .single();

    if (courseError) {
      console.error('[getLessons API] Error loading course:', courseError);
      // No es error crítico, continuamos sin info del curso
    }

    // Buscar secciones del curso
    const { data: sectionsData, error: sectionsError } = await supabaseAdmin
      .from(TABLES.COURSE_SECTIONS)
      .select('*')
      .eq('course_id', courseId)
      .order('order', { ascending: true });

    if (sectionsError) {
      console.error('[getLessons API] Error loading sections:', sectionsError);
      // No es error crítico, continuamos sin secciones
    }

    // Buscar lecciones del curso
    const { data: lessonsData, error: lessonsError } = await supabaseAdmin
      .from(TABLES.LESSONS)
      .select('*')
      .eq('course_id', courseId)
      .order('order', { ascending: true });

    if (lessonsError) {
      console.error('[getLessons API] Error loading lessons:', lessonsError);
      return NextResponse.json({ error: lessonsError.message }, { status: 500 });
    }

    // Mapear secciones
    const sections = (sectionsData || []).map((s: any) => ({
      id: s.id,
      title: s.title || '',
      description: s.description || '',
      order: s.order || 0,
      isExpanded: s.is_expanded || false,
    }));

    // Mapear lecciones al formato esperado
    const lessons = (lessonsData || []).map((l: any) => ({
      id: l.id,
      title: l.title || '',
      description: l.description || '',
      type: l.type || 'video',
      videoUrl: l.video_url,
      recordedVideoUrl: l.recorded_video_url,
      isLive: l.is_live,
      agoraChannel: l.agora_channel,
      agoraAppId: l.agora_app_id,
      liveStatus: l.live_status,
      durationMinutes: l.duration_minutes,
      order: l.order || 0,
      resourceIds: l.resource_ids || [],
      scheduledDate: l.scheduled_date || l.scheduled_start_time,
      startDate: l.start_date,
      endDate: l.end_date,
      entrySurveyId: l.entry_survey_id,
      exitSurveyId: l.exit_survey_id,
      content: l.content, // JSON string con subsecciones
      isActive: l.is_active,
      isPublished: l.is_published,
      coverImage: l.cover_image,
      sectionId: l.section_id, // ID de la sección a la que pertenece
    }));

    // Mapear información del curso
    const course = courseData ? {
      id: courseData.id,
      title: courseData.title || '',
      description: courseData.description || '',
      coverImageUrl: courseData.cover_image_url,
      thumbnailUrl: courseData.thumbnail_url,
      teacherIds: courseData.teacher_ids || [],
    } : null;

    console.log('[getLessons API] Course:', course?.title);
    console.log('[getLessons API] Sections found:', sections.length, sections.map((s: any) => ({ id: s.id, title: s.title })));
    console.log('[getLessons API] Lessons found:', lessons.length, lessons.map((l: any) => ({ id: l.id, title: l.title, sectionId: l.sectionId })));
    
    return NextResponse.json({ lessons, sections, course }, { status: 200 });
  } catch (e: any) {
    console.error('[getLessons API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

