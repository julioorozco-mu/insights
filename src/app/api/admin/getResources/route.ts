import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Intentar cargar de teacher_resources primero
    const { data: teacherResData, error: teacherResError } = await supabaseAdmin
      .from(TABLES.TEACHER_RESOURCES)
      .select('*')
      .order('created_at', { ascending: false });

    let data: any[] = [];

    if (!teacherResError && teacherResData) {
      // Filtrar recursos eliminados
      data = teacherResData.filter((r: any) => {
        return r.is_deleted === undefined || r.is_deleted === null || !r.is_deleted;
      });
    } else {
      console.log('[getResources API] teacher_resources error, trying file_attachments:', teacherResError);
      
      // Fallback a file_attachments
      const { data: fileResData, error: fileResError } = await supabaseAdmin
        .from(TABLES.FILE_ATTACHMENTS)
        .select('*')
        .order('created_at', { ascending: false });

      if (fileResError) {
        console.error('[getResources API] Error loading file_attachments:', fileResError);
        return NextResponse.json({ error: fileResError.message }, { status: 500 });
      }

      data = (fileResData || []).filter((r: any) => {
        return r.is_deleted === undefined || r.is_deleted === null || !r.is_deleted;
      });
    }

    // Mapear recursos al formato esperado
    const resources = data.map((r: any) => {
      const fileName = r.file_name || r.name || r.title || 'Sin nombre';
      const displayName = fileName.replace(/\.[^/.]+$/, "") || fileName;
      const description = r.description || '';

      return {
        id: r.id,
        name: fileName,
        url: r.url || r.file_url,
        type: r.file_type || r.type || 'application/octet-stream',
        size: r.size_kb ? r.size_kb * 1024 : r.size || r.file_size || 0,
        uploadedBy: r.owner_id || r.uploaded_by || r.created_by,
        uploadedByName: r.uploaded_by_name,
        createdAt: r.created_at,
        metadata: r.metadata ? r.metadata : { title: displayName, description },
      };
    });

    // Filtrar duplicados por ID y ordenar por fecha
    const uniqueResources = Array.from(
      new Map(resources.map(r => [r.id, r])).values()
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ resources: uniqueResources }, { status: 200 });

  } catch (e: any) {
    console.error('[getResources API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

