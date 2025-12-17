import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { requireApiRoles } from '@/lib/auth/apiRouteAuth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiRoles(['admin', 'superadmin', 'support']);
    if (auth instanceof NextResponse) return auth;

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
      createdAt: s.created_at,
    }));

    return NextResponse.json({ surveys }, { status: 200 });
  } catch (e: any) {
    console.error('[getSurveys API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

