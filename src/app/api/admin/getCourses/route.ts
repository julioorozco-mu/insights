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
    const supabaseAdmin = getSupabaseAdmin();
    const authUser = await getApiAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const role = authUser.role;
    const userId = authUser.id;

    const isAdmin = role === 'admin' || role === 'superadmin' || role === 'support';
    const isTeacher = role === 'teacher';

    if (!isAdmin && !isTeacher) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    let coursesData: any[] = [];

    // Determinar qué cursos cargar según el rol
    if (isAdmin) {
      // Admin/Superadmin/Support ve todos los cursos
      const { data, error } = await supabaseAdmin
        .from(TABLES.COURSES)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[getCourses API] Error loading courses:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      coursesData = data || [];
    } else if (isTeacher && userId) {
      // Teacher ve solo sus cursos
      const { data, error } = await supabaseAdmin
        .from(TABLES.COURSES)
        .select('*')
        .contains('teacher_ids', [userId])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[getCourses API] Error loading courses by teacher:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      coursesData = data || [];

      if (coursesData.length === 0) {
        const { data: teacherRow, error: teacherError } = await supabaseAdmin
          .from(TABLES.TEACHERS)
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!teacherError && teacherRow?.id) {
          const { data: legacyCourses, error: legacyError } = await supabaseAdmin
            .from(TABLES.COURSES)
            .select('*')
            .contains('teacher_ids', [teacherRow.id])
            .order('created_at', { ascending: false });

          if (!legacyError && legacyCourses) {
            coursesData = legacyCourses;
          }
        }
      }
    }

    // Mapear cursos
    let courses = coursesData.map(mapToCourse);

    const legacyCandidateIds = new Set<string>();
    courses.forEach((course: any) => {
      (course.speakerIds || []).forEach((id: string) => legacyCandidateIds.add(id));
      (course.coHostIds || []).forEach((id: string) => legacyCandidateIds.add(id));
    });

    if (legacyCandidateIds.size > 0) {
      const allCandidateIds = Array.from(legacyCandidateIds);
      const { data: existingUsers, error: existingUsersError } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('id')
        .in('id', allCandidateIds);

      if (existingUsersError) {
        console.error('[getCourses API] Error validando users:', existingUsersError);
        return NextResponse.json({ error: 'Error cargando cursos' }, { status: 500 });
      }

      const userIdSet = new Set((existingUsers || []).map((u: any) => u.id));
      const remainingIds = allCandidateIds.filter((id) => !userIdSet.has(id));

      const teacherIdToUserId = new Map<string, string>();
      if (remainingIds.length > 0) {
        const { data: teachers, error: teachersError } = await supabaseAdmin
          .from(TABLES.TEACHERS)
          .select('id, user_id')
          .in('id', remainingIds);

        if (teachersError) {
          console.error('[getCourses API] Error cargando teachers:', teachersError);
          return NextResponse.json({ error: 'Error cargando cursos' }, { status: 500 });
        }

        (teachers || []).forEach((t: any) => {
          if (t?.id && t?.user_id) {
            teacherIdToUserId.set(t.id, t.user_id);
          }
        });
      }

      const mapIds = (ids: any) => {
        const list = Array.isArray(ids) ? ids : [];
        return Array.from(
          new Set(
            list
              .map((id: any) => teacherIdToUserId.get(id) || id)
              .filter((id: any) => !!id)
          )
        );
      };

      courses = courses.map((course: any) => ({
        ...course,
        speakerIds: mapIds(course.speakerIds),
        coHostIds: mapIds(course.coHostIds),
      }));
    }

    // Recolectar todos los IDs únicos de speakers y lessons
    const allSpeakerIds = new Set<string>();
    const allLessonIds = new Set<string>();

    courses.forEach(course => {
      course.speakerIds?.forEach((id: string) => allSpeakerIds.add(id));
      course.lessonIds?.forEach((id: string) => allLessonIds.add(id));
    });

    // Cargar todos los speakers y lessons en paralelo
    const [speakersData, lessonsData] = await Promise.all([
      allSpeakerIds.size > 0
        ? supabaseAdmin
            .from(TABLES.USERS)
            .select('id, name, email, avatar_url')
            .in('id', Array.from(allSpeakerIds))
        : Promise.resolve({ data: [], error: null }),
      allLessonIds.size > 0
        ? supabaseAdmin
            .from(TABLES.LESSONS)
            .select('id, title, start_date, scheduled_start_time')
            .in('id', Array.from(allLessonIds))
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Crear mapas para acceso rápido
    const speakersMap = new Map(
      (speakersData.data || []).map((s: any) => [
        s.id,
        {
          id: s.id,
          name: s.name || s.email,
          email: s.email,
          photoURL: s.avatar_url,
        },
      ])
    );

    const lessonsMap = new Map(
      (lessonsData.data || []).map((l: any) => [
        l.id,
        {
          id: l.id,
          title: l.title || `Lección`,
          startDate: l.start_date || l.scheduled_start_time,
        },
      ])
    );

    // Mapear cursos con sus speakers y lessons
    const coursesWithDetails = courses.map(course => {
      const speakers: any[] = [];
      const lessons: any[] = [];

      course.speakerIds?.forEach((speakerId: string) => {
        const speaker = speakersMap.get(speakerId);
        if (speaker) {
          speakers.push(speaker);
        }
      });

      course.lessonIds?.forEach((lessonId: string) => {
        const lesson = lessonsMap.get(lessonId);
        if (lesson) {
          lessons.push(lesson);
        }
      });

      return {
        ...course,
        speakers,
        lessons,
      };
    });

    return NextResponse.json({ courses: coursesWithDetails }, { status: 200 });
  } catch (e: any) {
    console.error('[getCourses API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

