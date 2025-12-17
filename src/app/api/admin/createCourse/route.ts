import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';

function sanitizeIdArray(value: any): string[] {
  const list = Array.isArray(value) ? value : [];
  const cleaned = list.filter((v: any) => typeof v === 'string' && !!v);
  return Array.from(new Set(cleaned));
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getApiAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const isAdmin = authUser.role === 'admin' || authUser.role === 'superadmin' || authUser.role === 'support';
    const isTeacher = authUser.role === 'teacher';

    if (!isAdmin && !isTeacher) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { 
      title, 
      description, 
      coverImageUrl, 
      tags, 
      difficulty, 
      price, 
      salePercentage, 
      isPublished, 
      isHidden, 
      university, 
      specialization,
      speakerIds
    } = body;

    // Validar campos requeridos
    if (!title || title.trim().length < 3) {
      return NextResponse.json({ 
        error: 'El título es requerido y debe tener al menos 3 caracteres' 
      }, { status: 400 });
    }

    let teacherIds: string[] = [];

    if (isTeacher) {
      teacherIds = [authUser.id];
    } else {
      const ids = sanitizeIdArray(speakerIds);

      if (ids.length > 1) {
        return NextResponse.json({ error: 'Solo se permite 1 docente por curso' }, { status: 400 });
      }

      if (ids.length === 1) {
        const teacherUserId = ids[0];

        const { data: userRow, error: userError } = await supabaseAdmin
          .from(TABLES.USERS)
          .select('id, role')
          .eq('id', teacherUserId)
          .maybeSingle();

        if (userError) {
          console.error('[createCourse API] Error validando user teacher:', userError);
          return NextResponse.json({ error: 'Error validando docente' }, { status: 500 });
        }

        if (!userRow || userRow.role !== 'teacher') {
          return NextResponse.json({ error: 'El docente asignado no es válido' }, { status: 400 });
        }

        const { data: teacherRow, error: teacherError } = await supabaseAdmin
          .from(TABLES.TEACHERS)
          .select('id')
          .eq('user_id', teacherUserId)
          .maybeSingle();

        if (teacherError) {
          console.error('[createCourse API] Error validando registro teachers:', teacherError);
          return NextResponse.json({ error: 'Error validando docente' }, { status: 500 });
        }

        if (!teacherRow) {
          return NextResponse.json({ error: 'El docente no tiene perfil de teacher' }, { status: 400 });
        }
      }

      teacherIds = ids;
    }

    // Preparar datos para insertar
    const insertData: Record<string, unknown> = {
      title: title.trim(),
      description: description?.trim() || '',
      cover_image_url: coverImageUrl || null,
      tags: tags || [],
      difficulty: difficulty || 'beginner',
      price: price || 0,
      sale_percentage: salePercentage || 0,
      is_published: isPublished ?? false,
      is_hidden: isHidden ?? false,
      university: university || null,
      specialization: specialization || null,
      teacher_ids: teacherIds,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Crear el curso
    const { data: course, error } = await supabaseAdmin
      .from(TABLES.COURSES)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[createCourse API] Error creating course:', error);
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint 
      }, { status: 500 });
    }

    if (!course) {
      return NextResponse.json({ error: 'Error al crear el curso' }, { status: 500 });
    }

    return NextResponse.json({ course, success: true }, { status: 201 });
  } catch (e: unknown) {
    console.error('[createCourse API] Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
