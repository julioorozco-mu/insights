import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireApiRoles } from '@/lib/auth/apiRouteAuth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiRoles(['admin', 'superadmin', 'support']);
    if (auth instanceof NextResponse) return auth;

    const { uid, password } = await req.json();
    
    if (!uid || !password) {
      return NextResponse.json({ error: 'UID and password are required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Actualizar contraseña en Supabase Auth
    const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, {
      password,
    });

    if (error) {
      console.error('Error updating password:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('updateSpeakerPassword error:', error);
    return NextResponse.json({ 
      error: error.message || 'Error updating password' 
    }, { status: 500 });
  }
}
