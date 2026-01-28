import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';

// Función para mapear curso desde la base de datos
function mapToCourse(row: any) {
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || null,
    coverImageUrl: row.cover_image_url || null,
    thumbnailUrl: row.thumbnail_url || null,
    speakerIds: row.teacher_ids || [],
    coHostIds: row.co_host_ids || [],
    lessonIds: row.lesson_ids || [],
    tags: row.tags || [],
    difficulty: row.difficulty || null,
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    entrySurveyId: row.entry_survey_id || null,
    exitSurveyId: row.exit_survey_id || null,
    enrollmentRules: row.enrollment_rules || null,
    enrollmentStartDate: row.enrollment_start_date || null,
    enrollmentEndDate: row.enrollment_end_date || null,
    isActive: row.is_active ?? true,
    price: row.price ?? 0,
    salePercentage: row.sale_percentage ?? 0,
    isPublished: row.is_published ?? false,
    isHidden: row.is_hidden ?? false,
    university: row.university || null,
    specialization: row.specialization || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getApiAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Permitir acceso a estudiantes, admins y teachers
    if (authUser.role !== 'student' &&
      authUser.role !== 'admin' &&
      authUser.role !== 'superadmin' &&
      authUser.role !== 'support' &&
      authUser.role !== 'teacher') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 });
    }

    // Obtener información básica del curso
    // Para preview, solo requerimos que el curso esté activo (no necesariamente publicado)
    const { data, error } = await supabaseAdmin
      .from(TABLES.COURSES)
      .select('*')
      .eq('id', courseId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('[getCoursePreview API] Error loading course:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Curso no encontrado o no disponible' }, { status: 404 });
    }

    const course = mapToCourse(data);

    // Mapear teacher_ids a user_ids para obtener los speakers
    const legacyCandidateIds = new Set<string>();
    (course.speakerIds || []).forEach((id: string) => legacyCandidateIds.add(id));
    (course.coHostIds || []).forEach((id: string) => legacyCandidateIds.add(id));

    if (legacyCandidateIds.size > 0) {
      const { data: teachers, error: teachersError } = await supabaseAdmin
        .from(TABLES.TEACHERS)
        .select('id, user_id')
        .in('id', Array.from(legacyCandidateIds));

      if (teachersError) {
        console.error('[getCoursePreview API] Error cargando teachers:', teachersError);
      } else if (teachers) {
        const teacherIdToUserId = new Map<string, string>();
        teachers.forEach((t: any) => {
          if (t?.id && t?.user_id) {
            teacherIdToUserId.set(t.id, t.user_id);
          }
        });

        const mapIds = (ids: any) => {
          const list = Array.isArray(ids) ? ids : [];
          return Array.from(
            new Set(list.map((id: any) => teacherIdToUserId.get(id) || id).filter((id: any) => !!id))
          );
        };

        (course as any).speakerIds = mapIds((course as any).speakerIds);
        (course as any).coHostIds = mapIds((course as any).coHostIds);
      }
    }

    // Obtener lecciones del curso (solo información básica para preview)
    // No filtrar por is_active para mostrar todas las lecciones con contenido
    console.log(`[getCoursePreview API] Querying lessons for courseId: ${courseId}`);

    const { data: lessonsData, error: lessonsError } = await supabaseAdmin
      .from(TABLES.LESSONS)
      .select('id, title, description, order, content, section_id, is_active, is_published, course_id')
      .eq('course_id', courseId)
      .order('order', { ascending: true });

    if (lessonsError) {
      console.error('[getCoursePreview API] Error loading lessons:', lessonsError);
      console.error('[getCoursePreview API] Error details:', JSON.stringify(lessonsError, null, 2));
      // No es crítico, continuamos sin lecciones
    } else {
      console.log(`[getCoursePreview API] Loaded ${lessonsData?.length || 0} lessons for course ${courseId}`);
      if (lessonsData && lessonsData.length > 0) {
        console.log(`[getCoursePreview API] Lesson IDs:`, lessonsData.map((l: any) => ({ id: l.id, title: l.title, course_id: l.course_id })));
      } else {
        // Intentar una consulta sin filtros para ver si hay lecciones en la tabla
        const { data: allLessons, error: allLessonsError } = await supabaseAdmin
          .from(TABLES.LESSONS)
          .select('id, title, course_id')
          .limit(5);

        if (!allLessonsError && allLessons) {
          console.log(`[getCoursePreview API] Sample lessons in DB:`, allLessons);
        }

        // Verificar si hay lecciones con course_id diferente (por si hay problema de formato)
        const { data: lessonsByString, error: stringError } = await supabaseAdmin
          .from(TABLES.LESSONS)
          .select('id, title, course_id')
          .eq('course_id', courseId.toString())
          .limit(5);

        if (!stringError && lessonsByString) {
          console.log(`[getCoursePreview API] Lessons found with string courseId:`, lessonsByString.length);
        }
      }
    }

    const lessons = (lessonsData || []).map((l: any) => {
      // Parsear content para obtener subsecciones
      let parsedContent = null;
      let subsections: { id: string; title: string }[] = [];

      if (l.content) {
        try {
          const contentData = typeof l.content === 'string' ? JSON.parse(l.content) : l.content;
          console.log(`[getCoursePreview API] Lesson ${l.id} (${l.title}):`, {
            hasContent: !!l.content,
            contentType: typeof l.content,
            parsedKeys: contentData ? Object.keys(contentData) : [],
            hasSubsections: contentData?.subsections ? Array.isArray(contentData.subsections) : false,
            subsectionsCount: contentData?.subsections?.length || 0,
          });

          if (contentData && contentData.subsections && Array.isArray(contentData.subsections)) {
            parsedContent = contentData;
            // Mapear todas las subsecciones, similar a getLessonsByCourse
            subsections = contentData.subsections.map((s: any) => ({
              id: s.id || '',
              title: s.title || 'Sin título',
            }));
            console.log(`[getCoursePreview API] Lesson ${l.id}: Found ${subsections.length} subsections`);
          } else {
            console.log(`[getCoursePreview API] Lesson ${l.id}: No subsections found in content`);
          }
        } catch (e) {
          console.error('[getCoursePreview API] Error parsing lesson content for lesson', l.id, ':', e);
          console.error('[getCoursePreview API] Content that failed:', l.content?.substring(0, 200));
        }
      } else {
        console.log(`[getCoursePreview API] Lesson ${l.id} (${l.title}): No content field`);
      }

      return {
        id: l.id,
        title: l.title || '',
        description: l.description || '',
        order: l.order || 0,
        content: l.content, // Mantener el contenido original
        parsedContent, // Contenido parseado
        subsections, // Subsecciones extraídas
        sectionId: l.section_id,
        isActive: l.is_active,
      };
    });

    console.log(`[getCoursePreview API] Total lessons: ${lessons.length}, Lessons with subsections: ${lessons.filter(l => l.subsections.length > 0).length}`);
    console.log(`[getCoursePreview API] Lessons summary:`, lessons.map(l => ({
      id: l.id,
      title: l.title,
      hasContent: !!l.content,
      subsectionsCount: l.subsections.length,
      order: l.order
    })));

    // Obtener el número de usuarios inscritos en el curso
    const { count: enrolledCount, error: enrolledError } = await supabaseAdmin
      .from(TABLES.STUDENT_ENROLLMENTS)
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    if (enrolledError) {
      console.error('[getCoursePreview API] Error counting enrollments:', enrolledError);
    }

    // Obtener información de los speakers/teachers
    let speakers: any[] = [];
    const speakerIds = course.speakerIds || [];

    if (speakerIds.length > 0) {
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('id, name, last_name, email, avatar_url')
        .in('id', speakerIds);

      if (usersError) {
        console.error('[getCoursePreview API] Error loading speakers:', usersError);
      } else {
        speakers = (usersData || []).map((u: any) => ({
          id: u.id,
          name: u.name || '',
          lastName: u.last_name || '',
          email: u.email || '',
          avatarUrl: u.avatar_url || null,
        }));
      }
    }

    return NextResponse.json({
      course,
      lessons,
      speakers,
      enrolledCount: enrolledCount || 0
    }, { status: 200 });
  } catch (e: any) {
    console.error('[getCoursePreview API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
