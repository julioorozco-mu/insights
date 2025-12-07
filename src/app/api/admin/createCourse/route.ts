import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function POST(req: NextRequest) {
  try {
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
      teacher_ids: speakerIds || [],
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
