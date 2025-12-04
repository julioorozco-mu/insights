import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

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
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 });
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

    return NextResponse.json({ course }, { status: 200 });
  } catch (e: any) {
    console.error('[getCourse API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

