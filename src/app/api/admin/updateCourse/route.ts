import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';
import { teacherHasAccessToCourse } from '@/lib/auth/coursePermissions';

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

    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { 
      courseId, 
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

    if (!courseId) {
      return NextResponse.json({ error: 'courseId es requerido' }, { status: 400 });
    }

    const isAdmin = authUser.role === 'admin' || authUser.role === 'superadmin' || authUser.role === 'support';

    if (!isAdmin) {
      if (authUser.role !== 'teacher') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      try {
        const allowed = await teacherHasAccessToCourse(authUser.id, courseId);
        if (!allowed) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }
      } catch (e) {
        console.error('[updateCourse API] Error validando curso asignado:', e);
        return NextResponse.json({ error: 'Error validando permisos' }, { status: 500 });
      }
    }

    // Preparar datos para actualizar
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (coverImageUrl !== undefined) updateData.cover_image_url = coverImageUrl;
    if (tags !== undefined) updateData.tags = tags;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (price !== undefined) updateData.price = price;
    if (salePercentage !== undefined) updateData.sale_percentage = salePercentage;
    if (isPublished !== undefined) updateData.is_published = isPublished;
    if (isHidden !== undefined) updateData.is_hidden = isHidden;
    if (university !== undefined) updateData.university = university;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (speakerIds !== undefined) {
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
          console.error('[updateCourse API] Error validando user teacher:', userError);
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
          console.error('[updateCourse API] Error validando registro teachers:', teacherError);
          return NextResponse.json({ error: 'Error validando docente' }, { status: 500 });
        }

        if (!teacherRow) {
          return NextResponse.json({ error: 'El docente no tiene perfil de teacher' }, { status: 400 });
        }
      }

      updateData.teacher_ids = ids;
    }

    // Actualizar el curso
    const { data: course, error } = await supabaseAdmin
      .from(TABLES.COURSES)
      .update(updateData)
      .eq('id', courseId)
      .select()
      .single();

    if (error) {
      console.error('[updateCourse API] Error updating course:', error);
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint 
      }, { status: 500 });
    }

    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ course, success: true }, { status: 200 });
  } catch (e: any) {
    console.error('[updateCourse API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
