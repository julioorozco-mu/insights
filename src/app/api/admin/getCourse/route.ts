import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';
import { teacherHasAccessToCourse } from '@/lib/auth/coursePermissions';

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

    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 });
    }

    const isAdmin = authUser.role === 'admin' || authUser.role === 'superadmin' || authUser.role === 'support';

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
        console.error('[getCourse API] Error validando curso asignado:', e);
        return NextResponse.json({ error: 'Error validando permisos' }, { status: 500 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from(TABLES.COURSES)
      .select('*')
      .eq('id', courseId)
      .single();

    if (error) {
      console.error('[getCourse API] Error loading course:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    const course = mapToCourse(data);

    const legacyCandidateIds = new Set<string>();
    (course.speakerIds || []).forEach((id: string) => legacyCandidateIds.add(id));
    (course.coHostIds || []).forEach((id: string) => legacyCandidateIds.add(id));

    if (legacyCandidateIds.size > 0) {
      const { data: teachers, error: teachersError } = await supabaseAdmin
        .from(TABLES.TEACHERS)
        .select('id, user_id')
        .in('id', Array.from(legacyCandidateIds));

      if (teachersError) {
        console.error('[getCourse API] Error cargando teachers:', teachersError);
        return NextResponse.json({ error: 'Error cargando curso' }, { status: 500 });
      }

      const teacherIdToUserId = new Map<string, string>();
      (teachers || []).forEach((t: any) => {
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

    return NextResponse.json({ course }, { status: 200 });
  } catch (e: any) {
    console.error('[getCourse API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

