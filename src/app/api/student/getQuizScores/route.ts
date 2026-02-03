import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';

interface QuizScore {
    lessonId: string;
    subsectionIndex: number;
    correct: number;
    total: number;
}

export async function GET(req: NextRequest) {
    try {
        const authUser = await getApiAuthUser();

        if (!authUser) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get('courseId');

        if (!courseId) {
            return NextResponse.json(
                { error: 'courseId es requerido' },
                { status: 400 }
            );
        }

        const supabaseAdmin = getSupabaseAdmin();

        // Obtener todas las lecciones del curso
        const { data: lessons, error: lessonsError } = await supabaseAdmin
            .from(TABLES.LESSONS)
            .select('id, content')
            .eq('course_id', courseId);

        if (lessonsError) {
            console.error('[getQuizScores API] Error fetching lessons:', lessonsError);
            return NextResponse.json(
                { error: 'Error obteniendo lecciones' },
                { status: 500 }
            );
        }

        if (!lessons || lessons.length === 0) {
            return NextResponse.json({ scores: [] });
        }

        // Extraer todos los quizIds de las lecciones con su lessonId y subsectionIndex
        const quizMappings: { quizId: string; lessonId: string; subsectionIndex: number }[] = [];

        for (const lesson of lessons) {
            if (!lesson.content) continue;

            try {
                const parsed = JSON.parse(lesson.content);
                const subsections = parsed.subsections || [];

                subsections.forEach((subsection: any, subIndex: number) => {
                    if (!subsection?.blocks) return;

                    for (const block of subsection.blocks) {
                        if (block.type === 'quiz' && block.data?.quizId) {
                            quizMappings.push({
                                quizId: block.data.quizId,
                                lessonId: lesson.id,
                                subsectionIndex: subIndex,
                            });
                        }
                    }
                });
            } catch {
                // Ignorar errores de parseo
            }
        }

        if (quizMappings.length === 0) {
            return NextResponse.json({ scores: [] });
        }

        // Obtener todos los quizIds
        const quizIds = quizMappings.map((m) => m.quizId);

        // Obtener las respuestas del usuario para estos quizzes
        const { data: responses, error: responsesError } = await supabaseAdmin
            .from(TABLES.SURVEY_RESPONSES)
            .select('survey_id, answers')
            .eq('user_id', authUser.id)
            .in('survey_id', quizIds);

        if (responsesError) {
            console.error('[getQuizScores API] Error fetching responses:', responsesError);
            return NextResponse.json(
                { error: 'Error obteniendo respuestas' },
                { status: 500 }
            );
        }

        if (!responses || responses.length === 0) {
            return NextResponse.json({ scores: [] });
        }

        // Obtener los surveys para calcular correctas
        const { data: surveys, error: surveysError } = await supabaseAdmin
            .from(TABLES.SURVEYS)
            .select('id, questions')
            .in('id', quizIds);

        if (surveysError) {
            console.error('[getQuizScores API] Error fetching surveys:', surveysError);
            return NextResponse.json(
                { error: 'Error obteniendo surveys' },
                { status: 500 }
            );
        }

        // Crear mapa de surveys para acceso rápido
        const surveyMap = new Map<string, any[]>();
        for (const survey of surveys || []) {
            surveyMap.set(survey.id, survey.questions || []);
        }

        // Calcular scores
        const scores: QuizScore[] = [];

        for (const response of responses) {
            const mapping = quizMappings.find((m) => m.quizId === response.survey_id);
            if (!mapping) continue;

            const questions = surveyMap.get(response.survey_id);
            if (!questions || questions.length === 0) continue;

            const answers = response.answers || [];
            let correctCount = 0;

            // Crear mapa de respuestas del usuario
            const userAnswersMap: Record<string, string | string[]> = {};
            for (const ans of answers) {
                if (ans.questionId) {
                    userAnswersMap[ans.questionId] = ans.answer;
                }
            }

            // Calcular correctas
            for (const q of questions) {
                const userAnswer = userAnswersMap[q.id];
                if (!userAnswer) continue;

                // Verificar usando isCorrect en las opciones
                if (q.options && q.options.some((o: any) => o.isCorrect)) {
                    const correctOptions = q.options
                        .filter((o: any) => o.isCorrect)
                        .map((o: any) => o.value);

                    if (q.type === 'multiple_choice') {
                        const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
                        if (
                            correctOptions.length === userAnswers.length &&
                            correctOptions.every((c: string) => userAnswers.includes(c))
                        ) {
                            correctCount++;
                        }
                    } else {
                        if (correctOptions.includes(userAnswer as string)) {
                            correctCount++;
                        }
                    }
                } else if (q.correctAnswer) {
                    // Fallback a correctAnswer si no hay isCorrect
                    if (Array.isArray(q.correctAnswer)) {
                        if (
                            Array.isArray(userAnswer) &&
                            userAnswer.length === q.correctAnswer.length &&
                            userAnswer.every((a: string) => q.correctAnswer.includes(a))
                        ) {
                            correctCount++;
                        }
                    } else if (userAnswer === q.correctAnswer) {
                        correctCount++;
                    }
                }
            }

            scores.push({
                lessonId: mapping.lessonId,
                subsectionIndex: mapping.subsectionIndex,
                correct: correctCount,
                total: questions.length,
            });
        }

        return NextResponse.json({ scores });
    } catch (e: any) {
        console.error('[getQuizScores API] Error:', e);
        return NextResponse.json(
            { error: e?.message || 'Error interno' },
            { status: 500 }
        );
    }
}
