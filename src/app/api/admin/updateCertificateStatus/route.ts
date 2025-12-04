import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { courseId, studentId, studentName, studentEmail, newStatus } = body;

    if (!courseId || !studentId) {
      return NextResponse.json({ error: 'courseId y studentId son requeridos' }, { status: 400 });
    }

    if (newStatus) {
      // Crear registro de descarga
      const { error } = await supabaseAdmin.from(TABLES.CERTIFICATE_DOWNLOADS).insert({
        course_id: courseId,
        student_id: studentId,
        student_name: studentName || '',
        student_email: studentEmail || '',
        downloaded_at: new Date().toISOString(),
        manually_marked: true,
      });

      if (error) {
        console.error('[updateCertificateStatus API] Error creating certificate:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // Eliminar registro de descarga
      const { error } = await supabaseAdmin
        .from(TABLES.CERTIFICATE_DOWNLOADS)
        .delete()
        .eq('course_id', courseId)
        .eq('student_id', studentId);

      if (error) {
        console.error('[updateCertificateStatus API] Error deleting certificate:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error('[updateCertificateStatus API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

