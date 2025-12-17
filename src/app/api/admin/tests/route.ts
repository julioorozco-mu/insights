import { NextRequest, NextResponse } from 'next/server';
import { Test, CreateTestDTO } from '@/types/test';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';

/**
 * GET /api/admin/tests
 * Lista todos los tests (con filtros opcionales)
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getApiAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const isAdmin =
      authUser.role === 'admin' || authUser.role === 'superadmin' || authUser.role === 'support';

    if (!isAdmin && authUser.role !== 'teacher') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const createdByParam = searchParams.get('createdBy');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Construir query base
    let query = supabaseAdmin
      .from('tests')
      .select(`
        *,
        creator:users!tests_created_by_fkey(id, name, avatar_url)
      `, { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }

    if (isAdmin) {
      if (createdByParam) {
        query = query.eq('created_by', createdByParam);
      }
    } else {
      query = query.eq('created_by', authUser.id);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Paginación
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: tests, error, count } = await query;

    if (error) {
      console.error('Error fetching tests:', error);
      
      // Verificar si es error de tabla no existente
      if (error.code === 'PGRST205' || error.message?.includes('table')) {
        return NextResponse.json(
          { 
            error: 'La tabla de evaluaciones no existe. Ejecuta la migración SQL.', 
            code: 'TABLE_NOT_FOUND',
            migration: 'supabase/migrations/add_tests_tables.sql'
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Error al obtener las evaluaciones' },
        { status: 500 }
      );
    }

    // Obtener conteo de preguntas por test
    const testIds = tests?.map(t => t.id) || [];
    
    if (testIds.length > 0) {
      const { data: questionCounts } = await supabaseAdmin
        .from('test_questions')
        .select('test_id')
        .in('test_id', testIds);

      const countsMap = (questionCounts || []).reduce((acc, q) => {
        acc[q.test_id] = (acc[q.test_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Agregar questionsCount a cada test
      tests?.forEach(test => {
        (test as Test & { questionsCount: number }).questionsCount = countsMap[test.id] || 0;
      });
    }

    // Transformar datos a formato camelCase
    const transformedTests = tests?.map(test => ({
      id: test.id,
      title: test.title,
      description: test.description,
      instructions: test.instructions,
      coverImageUrl: test.cover_image_url,
      status: test.status,
      timeMode: test.time_mode,
      timeLimitMinutes: test.time_limit_minutes,
      passingScore: test.passing_score,
      maxAttempts: test.max_attempts,
      shuffleQuestions: test.shuffle_questions,
      shuffleOptions: test.shuffle_options,
      showResultsImmediately: test.show_results_immediately,
      showCorrectAnswers: test.show_correct_answers,
      allowReview: test.allow_review,
      createdBy: test.created_by,
      isActive: test.is_active,
      createdAt: test.created_at,
      updatedAt: test.updated_at,
      questionsCount: (test as any).questionsCount || 0,
      creator: test.creator ? {
        id: test.creator.id,
        name: test.creator.name,
        avatarUrl: test.creator.avatar_url,
      } : undefined,
    }));

    return NextResponse.json({
      tests: transformedTests || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/tests:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tests
 * Crea una nueva evaluación
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getApiAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const isAdmin =
      authUser.role === 'admin' || authUser.role === 'superadmin' || authUser.role === 'support';

    if (!isAdmin && authUser.role !== 'teacher') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const body: CreateTestDTO = await request.json();

    // Validar datos requeridos
    if (!body.title) {
      return NextResponse.json(
        { error: 'El título es requerido' },
        { status: 400 }
      );
    }

    // Preparar datos para inserción
    const testData = {
      title: body.title,
      description: body.description || null,
      instructions: body.instructions || null,
      cover_image_url: body.coverImageUrl || null,
      time_mode: body.timeMode || 'unlimited',
      time_limit_minutes: body.timeLimitMinutes || null,
      passing_score: body.passingScore || 60,
      max_attempts: body.maxAttempts || 1,
      shuffle_questions: body.shuffleQuestions || false,
      shuffle_options: body.shuffleOptions || false,
      show_results_immediately: body.showResultsImmediately ?? true,
      show_correct_answers: body.showCorrectAnswers ?? true,
      allow_review: body.allowReview ?? true,
      created_by: authUser.id,
      status: 'draft',
      is_active: true,
    };

    const { data: test, error } = await supabaseAdmin
      .from('tests')
      .insert(testData)
      .select()
      .single();

    if (error) {
      console.error('Error creating test:', error);
      return NextResponse.json(
        { error: 'Error al crear la evaluación' },
        { status: 500 }
      );
    }

    // Transformar respuesta
    const transformedTest = {
      id: test.id,
      title: test.title,
      description: test.description,
      instructions: test.instructions,
      coverImageUrl: test.cover_image_url,
      status: test.status,
      timeMode: test.time_mode,
      timeLimitMinutes: test.time_limit_minutes,
      passingScore: test.passing_score,
      maxAttempts: test.max_attempts,
      shuffleQuestions: test.shuffle_questions,
      shuffleOptions: test.shuffle_options,
      showResultsImmediately: test.show_results_immediately,
      showCorrectAnswers: test.show_correct_answers,
      allowReview: test.allow_review,
      createdBy: test.created_by,
      isActive: test.is_active,
      createdAt: test.created_at,
      updatedAt: test.updated_at,
    };

    return NextResponse.json({ test: transformedTest }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/tests:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

