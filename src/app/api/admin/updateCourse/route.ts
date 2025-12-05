import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function POST(req: NextRequest) {
  try {
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
    if (speakerIds !== undefined) updateData.teacher_ids = speakerIds;

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
