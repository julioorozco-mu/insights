import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { requireApiRoles } from '@/lib/auth/apiRouteAuth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiRoles(['admin', 'superadmin', 'support']);
    if (auth instanceof NextResponse) return auth;

    const { email, password, name, phone, bio, avatarUrl, expertise, skipTeacherRecord } = await req.json();
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'teacher',
      },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // Crear registro en la tabla users
    const { error: userError } = await supabaseAdmin
      .from(TABLES.USERS)
      .insert({
        id: userId,
        name,
        email,
        role: 'teacher',
        phone: phone || null,
        bio: bio || null,
        avatar_url: avatarUrl || null,
      });

    if (userError) {
      console.error('Error creating user record:', userError);
      // Intentar eliminar el usuario de auth si falla la creación en la base de datos
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // Crear registro en la tabla teachers (solo si no se indica skipTeacherRecord)
    if (!skipTeacherRecord) {
      const { error: teacherError } = await supabaseAdmin
        .from(TABLES.TEACHERS)
        .insert({
          user_id: userId,
          expertise: expertise || [],
          about_me: bio || null,
        });

      if (teacherError) {
        console.error('Error creating teacher record:', teacherError);
        // No es crítico, el usuario ya existe
      }
    }

    return NextResponse.json({ uid: userId }, { status: 200 });
  } catch (e: any) {
    console.error('createSpeakerUser error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
