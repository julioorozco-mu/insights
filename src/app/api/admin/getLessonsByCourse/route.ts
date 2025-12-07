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

    // Buscar lecciones directamente por course_id (más confiable que usar lesson_ids del curso)
    const { data: lessonsData, error: lessonsError } = await supabaseAdmin
      .from(TABLES.LESSONS)
      .select('id, title, order, course_id, is_active, is_published, content')
      .eq('course_id', courseId)
      .order('order', { ascending: true });

    if (lessonsError) {
      console.error('[getLessonsByCourse API] Error loading lessons:', lessonsError);
      return NextResponse.json({ error: lessonsError.message }, { status: 500 });
    }

    const lessons = (lessonsData || []).map((l: any) => {
      // Parsear content para obtener subsecciones
      let subsections: { id: string; title: string }[] = [];
      if (l.content) {
        try {
          const contentData = typeof l.content === 'string' ? JSON.parse(l.content) : l.content;
          if (contentData.subsections && Array.isArray(contentData.subsections)) {
            subsections = contentData.subsections.map((s: any) => ({
              id: s.id,
              title: s.title || 'Sin título',
            }));
          }
        } catch (e) {
          console.error('Error parsing lesson content:', e);
        }
      }
      
      return {
        id: l.id,
        title: l.title || '',
        order: l.order || 0,
        courseId: l.course_id,
        isActive: l.is_active,
        isPublished: l.is_published,
        subsections,
      };
    });

    return NextResponse.json({ lessons }, { status: 200 });
  } catch (e: any) {
    console.error('[getLessonsByCourse API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

