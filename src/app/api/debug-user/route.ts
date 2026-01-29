import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function GET() {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user from users table
    const supabaseAdmin = getSupabaseAdmin();
    const { data: dbUser } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('*')
        .eq('id', authUser.id)
        .single();

    return NextResponse.json({
        authUser: {
            id: authUser.id,
            email: authUser.email,
            user_metadata: authUser.user_metadata,
            app_metadata: authUser.app_metadata,
        },
        dbUser,
    });
}
