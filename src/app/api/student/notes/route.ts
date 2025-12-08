import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';

/**
 * GET /api/student/notes - Obtener notas del estudiante para una lección
 * Query params: lessonId, userId
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');
    const userId = searchParams.get('userId');

    if (!lessonId || !userId) {
      return NextResponse.json(
        { error: 'lessonId y userId son requeridos' },
        { status: 400 }
      );
    }

    // Validar que los IDs sean UUIDs válidos
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lessonId) || !uuidRegex.test(userId)) {
      return NextResponse.json({ notes: [] }, { status: 200 });
    }

    // Obtener student_id del usuario
    const { data: student, error: studentError } = await supabase
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'No se encontró el registro de estudiante' },
        { status: 404 }
      );
    }

    // Obtener notas del estudiante para esta lección
    const { data: notes, error: notesError } = await supabase
      .from(TABLES.LESSON_NOTES)
      .select('*')
      .eq('student_id', student.id)
      .eq('lesson_id', lessonId)
      .order('video_timestamp', { ascending: true });

    if (notesError) {
      console.error('[notes API] Error fetching notes:', notesError);
      return NextResponse.json(
        { error: notesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ notes: notes || [] }, { status: 200 });
  } catch (e: any) {
    console.error('[notes API] Error:', e);
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student/notes - Crear una nueva nota
 * Body: { userId, lessonId, courseId, content, videoTimestamp? }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { userId, lessonId, courseId, content, videoTimestamp = 0 } = body;

    if (!userId || !lessonId || !courseId || !content) {
      return NextResponse.json(
        { error: 'userId, lessonId, courseId y content son requeridos' },
        { status: 400 }
      );
    }

    // Obtener student_id
    const { data: student, error: studentError } = await supabase
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'No se encontró el registro de estudiante' },
        { status: 404 }
      );
    }

    // Crear la nota
    const { data: note, error: noteError } = await supabase
      .from(TABLES.LESSON_NOTES)
      .insert({
        student_id: student.id,
        lesson_id: lessonId,
        course_id: courseId,
        content: content.trim(),
        video_timestamp: videoTimestamp,
      })
      .select()
      .single();

    if (noteError) {
      console.error('[notes API] Error creating note:', noteError);
      return NextResponse.json(
        { error: noteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ note }, { status: 201 });
  } catch (e: any) {
    console.error('[notes API] Error:', e);
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/student/notes - Eliminar una nota
 * Query params: noteId, userId
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get('noteId');
    const userId = searchParams.get('userId');

    if (!noteId || !userId) {
      return NextResponse.json(
        { error: 'noteId y userId son requeridos' },
        { status: 400 }
      );
    }

    // Obtener student_id
    const { data: student, error: studentError } = await supabase
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'No se encontró el registro de estudiante' },
        { status: 404 }
      );
    }

    // Verificar que la nota pertenece al estudiante y eliminarla
    const { error: deleteError } = await supabase
      .from(TABLES.LESSON_NOTES)
      .delete()
      .eq('id', noteId)
      .eq('student_id', student.id);

    if (deleteError) {
      console.error('[notes API] Error deleting note:', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error('[notes API] Error:', e);
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/student/notes - Actualizar una nota
 * Body: { noteId, userId, content }
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { noteId, userId, content } = body;

    if (!noteId || !userId || !content) {
      return NextResponse.json(
        { error: 'noteId, userId y content son requeridos' },
        { status: 400 }
      );
    }

    // Obtener student_id
    const { data: student, error: studentError } = await supabase
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'No se encontró el registro de estudiante' },
        { status: 404 }
      );
    }

    // Actualizar la nota
    const { data: note, error: updateError } = await supabase
      .from(TABLES.LESSON_NOTES)
      .update({ content: content.trim() })
      .eq('id', noteId)
      .eq('student_id', student.id)
      .select()
      .single();

    if (updateError) {
      console.error('[notes API] Error updating note:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ note }, { status: 200 });
  } catch (e: any) {
    console.error('[notes API] Error:', e);
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    );
  }
}
