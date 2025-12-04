import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from(TABLES.SURVEYS)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getSurveys API] Error loading surveys:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const surveys = (data || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      type: s.type,
      questions: s.questions || [],
      isActive: true, // La tabla no tiene is_active, asumimos activo
      createdAt: s.created_at,
    }));

    return NextResponse.json({ surveys }, { status: 200 });
  } catch (e: any) {
    console.error('[getSurveys API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

