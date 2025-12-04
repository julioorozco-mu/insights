import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from(TABLES.CERTIFICATE_TEMPLATES)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getCertificates API] Error loading certificates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const templates = (data || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      backgroundUrl: t.background_url,
      pdfTemplateUrl: t.pdf_template_url,
      description: t.description,
      isActive: t.is_active ?? true,
      createdAt: t.created_at,
    }));

    return NextResponse.json({ templates }, { status: 200 });
  } catch (e: any) {
    console.error('[getCertificates API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

