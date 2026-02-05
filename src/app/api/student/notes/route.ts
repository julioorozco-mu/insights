import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TABLES } from '@/utils/constants';
import {
  createNoteSchema,
  updateNoteSchema,
  listNotesQuerySchema,
  parseRequestBody,
  parseQueryParams,
} from '@/lib/validators/lessonContentSchema';
import {
  rateLimitMiddleware,
  RATE_LIMITS,
} from '@/lib/auth/serverRateLimiter';

/**
 * GET /api/student/notes - Obtener notas del estudiante para una lección
 * Query params: lessonId
 *
 * SEGURIDAD:
 * - Autenticación requerida via session (NO confía en userId del cliente)
 * - Rate limiting aplicado
 * - RLS filtra automáticamente por student_id
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResponse = rateLimitMiddleware(req, RATE_LIMITS.READ);
    if (rateLimitResponse) return rateLimitResponse;

    // 2. Autenticación
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 3. Validar lessonId
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');

    if (!lessonId) {
      return NextResponse.json(
        { error: 'lessonId es requerido' },
        { status: 400 }
      );
    }

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lessonId)) {
      return NextResponse.json({ notes: [] }, { status: 200 });
    }

    // Parsear opciones de query
    const queryResult = parseQueryParams(req, listNotesQuerySchema);
    const parsedOptions = queryResult.success ? queryResult.data : {};
    const queryOptions = {
      limit: parsedOptions.limit ?? 100,
      cursor: parsedOptions.cursor,
      from_timestamp: parsedOptions.from_timestamp,
    };

    // 4. Obtener student_id del usuario autenticado
    const { data: student, error: studentError } = await supabase
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'No se encontró el registro de estudiante' },
        { status: 404 }
      );
    }

    // 5. Obtener notas del estudiante para esta lección
    // Ordenar por fecha de creación descendente (más recientes primero)
    let query = supabase
      .from(TABLES.LESSON_NOTES)
      .select('id, content, video_timestamp, created_at, updated_at')
      .eq('student_id', student.id)
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(queryOptions.limit);

    // Filtro opcional por timestamp
    if (queryOptions.from_timestamp !== undefined) {
      query = query.gte('video_timestamp', queryOptions.from_timestamp);
    }

    // Cursor-based pagination
    if (queryOptions.cursor) {
      query = query.gt('id', queryOptions.cursor);
    }

    const { data: notes, error: notesError } = await query;

    if (notesError) {
      console.error('[notes API] Error fetching notes:', notesError);
      return NextResponse.json(
        { error: 'Error al obtener notas' },
        { status: 500 }
      );
    }

    // Formatear respuesta (compatible con código existente - snake_case)
    const formattedNotes = (notes || []).map((n: any) => ({
      id: n.id,
      content: n.content,
      // snake_case para código existente
      video_timestamp: n.video_timestamp,
      created_at: n.created_at,
      updated_at: n.updated_at,
      // camelCase para nuevos componentes
      videoTimestamp: n.video_timestamp,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));

    return NextResponse.json({
      notes: formattedNotes,
      pagination: {
        cursor: formattedNotes.length > 0 ? formattedNotes[formattedNotes.length - 1].id : null,
        hasMore: formattedNotes.length === queryOptions.limit,
      },
    }, { status: 200 });

  } catch (e: any) {
    console.error('[notes API] Error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student/notes - Crear una nueva nota
 * Body: { lessonId, courseId, content, videoTimestamp? }
 *
 * SEGURIDAD:
 * - Autenticación requerida via session (NO confía en userId del cliente)
 * - Rate limiting estricto para creación de contenido
 * - Validación y sanitización con Zod
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Autenticación PRIMERO
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 2. Rate limiting por usuario autenticado
    const rateLimitResponse = rateLimitMiddleware(
      req,
      RATE_LIMITS.CONTENT_CREATE,
      user.id
    );
    if (rateLimitResponse) return rateLimitResponse;

    // 3. Validar body con Zod
    const parseResult = await parseRequestBody(req, createNoteSchema);
    if (!parseResult.success) {
      return parseResult.error;
    }

    const { content, video_timestamp, course_id } = parseResult.data;

    // 4. Obtener lessonId de query params o body
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId') || parseResult.data.lesson_id;

    if (!lessonId) {
      return NextResponse.json(
        { error: 'lessonId es requerido' },
        { status: 400 }
      );
    }

    // 5. Obtener student_id del usuario autenticado
    const { data: student, error: studentError } = await supabase
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'No se encontró el registro de estudiante' },
        { status: 404 }
      );
    }

    // 6. Verificar que el estudiante está inscrito en el curso
    const { data: enrollment, error: enrollmentError } = await supabase
      .from(TABLES.STUDENT_ENROLLMENTS)
      .select('id')
      .eq('student_id', student.id)
      .eq('course_id', course_id)
      .maybeSingle();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: 'No estás inscrito en este curso' },
        { status: 403 }
      );
    }

    // 7. Crear la nota
    const { data: note, error: noteError } = await supabase
      .from(TABLES.LESSON_NOTES)
      .insert({
        student_id: student.id,
        lesson_id: lessonId,
        course_id: course_id,
        content: content, // Ya sanitizado por Zod
        video_timestamp: video_timestamp,
      })
      .select('id, content, video_timestamp, created_at, updated_at')
      .single();

    if (noteError) {
      console.error('[notes API] Error creating note:', noteError);
      return NextResponse.json(
        { error: 'Error al crear la nota' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      note: {
        id: note.id,
        content: note.content,
        // snake_case para código existente
        video_timestamp: note.video_timestamp,
        created_at: note.created_at,
        updated_at: note.updated_at,
        // camelCase para nuevos componentes
        videoTimestamp: note.video_timestamp,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      },
    }, { status: 201 });

  } catch (e: any) {
    console.error('[notes API] Error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/student/notes - Eliminar una nota
 * Query params: noteId
 *
 * SEGURIDAD:
 * - Autenticación requerida via session
 * - Verifica que la nota pertenece al estudiante autenticado
 */
export async function DELETE(req: NextRequest) {
  try {
    // 1. Autenticación
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 2. Rate limiting
    const rateLimitResponse = rateLimitMiddleware(
      req,
      RATE_LIMITS.CONTENT_CREATE,
      user.id
    );
    if (rateLimitResponse) return rateLimitResponse;

    // 3. Validar noteId
    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json(
        { error: 'noteId es requerido' },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(noteId)) {
      return NextResponse.json(
        { error: 'noteId inválido' },
        { status: 400 }
      );
    }

    // 4. Obtener student_id del usuario autenticado
    const { data: student, error: studentError } = await supabase
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'No se encontró el registro de estudiante' },
        { status: 404 }
      );
    }

    // 5. Verificar que la nota pertenece al estudiante y eliminarla
    const { error: deleteError } = await supabase
      .from(TABLES.LESSON_NOTES)
      .delete()
      .eq('id', noteId)
      .eq('student_id', student.id);

    if (deleteError) {
      console.error('[notes API] Error deleting note:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar la nota' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (e: any) {
    console.error('[notes API] Error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/student/notes - Actualizar una nota
 * Body: { noteId, content }
 *
 * SEGURIDAD:
 * - Autenticación requerida via session
 * - Verifica que la nota pertenece al estudiante autenticado
 * - Validación y sanitización con Zod
 */
export async function PATCH(req: NextRequest) {
  try {
    // 1. Autenticación
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 2. Rate limiting
    const rateLimitResponse = rateLimitMiddleware(
      req,
      RATE_LIMITS.CONTENT_CREATE,
      user.id
    );
    if (rateLimitResponse) return rateLimitResponse;

    // 3. Parsear y validar body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Body JSON inválido' },
        { status: 400 }
      );
    }

    const { noteId } = body;

    if (!noteId) {
      return NextResponse.json(
        { error: 'noteId es requerido' },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(noteId)) {
      return NextResponse.json(
        { error: 'noteId inválido' },
        { status: 400 }
      );
    }

    // Validar contenido con Zod
    const parseResult = updateNoteSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { content, video_timestamp } = parseResult.data;

    // 4. Obtener student_id del usuario autenticado
    const { data: student, error: studentError } = await supabase
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'No se encontró el registro de estudiante' },
        { status: 404 }
      );
    }

    // 5. Actualizar la nota
    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (video_timestamp !== undefined) updateData.video_timestamp = video_timestamp;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Nada que actualizar' },
        { status: 400 }
      );
    }

    const { data: note, error: updateError } = await supabase
      .from(TABLES.LESSON_NOTES)
      .update(updateData)
      .eq('id', noteId)
      .eq('student_id', student.id)
      .select('id, content, video_timestamp, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('[notes API] Error updating note:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar la nota' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      note: {
        id: note.id,
        content: note.content,
        // snake_case para código existente
        video_timestamp: note.video_timestamp,
        created_at: note.created_at,
        updated_at: note.updated_at,
        // camelCase para nuevos componentes
        videoTimestamp: note.video_timestamp,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      },
    }, { status: 200 });

  } catch (e: any) {
    console.error('[notes API] Error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
