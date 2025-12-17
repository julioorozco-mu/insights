import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { requireApiRoles } from '@/lib/auth/apiRouteAuth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiRoles(['admin', 'superadmin', 'support']);
    if (auth instanceof NextResponse) return auth;

    const { uid } = await request.json();
    
    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Eliminar registro de teacher
    await supabaseAdmin
      .from(TABLES.TEACHERS)
      .delete()
      .eq('user_id', uid);

    // Eliminar registro de user
    await supabaseAdmin
      .from(TABLES.USERS)
      .delete()
      .eq('id', uid);

    // Eliminar usuario de Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(uid);
    
    if (authError) {
      console.error('Error deleting auth user:', authError);
      // Continuar aunque falle la eliminación de auth
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('deleteSpeakerUser error:', error);
    return NextResponse.json({ 
      error: error.message || 'Error deleting user' 
    }, { status: 500 });
  }
}
