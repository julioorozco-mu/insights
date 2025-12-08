import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

/**
 * GET /api/student/lesson-resources - Obtener recursos adjuntos de una lección
 * Query params: lessonId
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');

    if (!lessonId) {
      return NextResponse.json(
        { error: 'lessonId es requerido' },
        { status: 400 }
      );
    }

    // Validar que lessonId sea un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lessonId)) {
      // Si no es UUID válido, retornar array vacío sin error
      return NextResponse.json({ resources: [] }, { status: 200 });
    }

    // Obtener la relación de archivos con la lección
    const { data: attachmentRelation, error: relationError } = await supabase
      .from(TABLES.FILE_ATTACHMENTS_LESSON)
      .select('file_ids')
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (relationError) {
      console.error('[lesson-resources API] Error fetching relation:', relationError);
      return NextResponse.json(
        { error: relationError.message },
        { status: 500 }
      );
    }

    if (!attachmentRelation || !attachmentRelation.file_ids || attachmentRelation.file_ids.length === 0) {
      return NextResponse.json({ resources: [] }, { status: 200 });
    }

    // Obtener los archivos adjuntos
    const { data: files, error: filesError } = await supabase
      .from(TABLES.FILE_ATTACHMENTS)
      .select('*')
      .in('id', attachmentRelation.file_ids)
      .eq('is_deleted', false);

    if (filesError) {
      console.error('[lesson-resources API] Error fetching files:', filesError);
      return NextResponse.json(
        { error: filesError.message },
        { status: 500 }
      );
    }

    // Formatear recursos
    const resources = (files || []).map((file: any) => ({
      id: file.id,
      fileName: file.file_name,
      fileType: file.file_type,
      url: file.url,
      sizeKb: file.size_kb,
      category: file.category,
      createdAt: file.created_at,
    }));

    return NextResponse.json({ resources }, { status: 200 });
  } catch (e: any) {
    console.error('[lesson-resources API] Error:', e);
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    );
  }
}
