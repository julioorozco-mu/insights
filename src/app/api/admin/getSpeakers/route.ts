import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Cargar teachers
    const { data: teachersData, error: teachersError } = await supabaseAdmin
      .from(TABLES.TEACHERS)
      .select("*")
      .order("created_at", { ascending: false });

    if (teachersError) {
      console.error('[getSpeakers API] Error loading teachers:', teachersError);
      return NextResponse.json({ error: teachersError.message }, { status: 500 });
    }

    // Obtener user_ids únicos
    const userIds = (teachersData || [])
      .map((t: any) => t.user_id)
      .filter((id: string | null) => id !== null);

    // Cargar usuarios
    let usersMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from(TABLES.USERS)
        .select("*")
        .in("id", userIds);

      if (usersError) {
        console.error('[getSpeakers API] Error loading users:', usersError);
      } else if (usersData) {
        usersMap = new Map(usersData.map((u: any) => [u.id, u]));
      }
    }

    // Mapear speakers con datos de usuario
    const speakers = (teachersData || []).map((row: any) => {
      const user = row.user_id ? usersMap.get(row.user_id) : null;
      return {
        id: row.id,
        userId: row.user_id,
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        avatarUrl: user?.avatar_url || '',
        bio: row.about_me || user?.bio || '',
        expertise: row.expertise || [],
        isActive: true,
      };
    });

    return NextResponse.json({ speakers }, { status: 200 });

  } catch (e: any) {
    console.error('[getSpeakers API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
