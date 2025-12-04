import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { lessonId, title, description, content } = body;

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId es requerido' }, { status: 400 });
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
    }

    // Preparar datos para actualizar
    const updateData: Record<string, any> = {
      title: title.trim(),
      updated_at: new Date().toISOString(),
    };

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (content !== undefined) {
      updateData.content = content || null;
    }

    // Actualizar la lección
    const { data, error } = await supabaseAdmin
      .from(TABLES.LESSONS)
      .update(updateData)
      .eq('id', lessonId)
      .select()
      .single();

    if (error) {
      console.error('[updateLesson API] Error updating lesson:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ lesson: data, success: true }, { status: 200 });
  } catch (e: any) {
    console.error('[updateLesson API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}

