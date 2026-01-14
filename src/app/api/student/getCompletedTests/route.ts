import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getApiAuthUser } from "@/lib/auth/apiRouteAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/student/getCompletedTests
 * Obtiene los tests/quizzes completados por el estudiante para un curso específico
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getApiAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "Se requiere courseId" },
        { status: 400 }
      );
    }

    const userId = user.id;

    // Obtener todos los surveys asociados al curso
    const { data: surveys, error: surveysError } = await supabase
      .from("surveys")
      .select("id, title, lesson_id, created_at")
      .eq("course_id", courseId);

    if (surveysError) {
      console.error("[getCompletedTests] Error fetching surveys:", surveysError);
      return NextResponse.json(
        { error: "Error al obtener surveys" },
        { status: 500 }
      );
    }

    if (!surveys || surveys.length === 0) {
      // Si no hay surveys, intentar obtener la fecha del enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("student_enrollments")
        .select("updated_at, progress")
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .single();

      if (enrollment && enrollment.progress >= 100) {
        return NextResponse.json({
          completedTests: [{
            id: "enrollment",
            completed_at: enrollment.updated_at,
            type: "enrollment_completion"
          }],
        });
      }

      return NextResponse.json({
        completedTests: [],
      });
    }

    const surveyIds = surveys.map(s => s.id);

    // Obtener las respuestas del estudiante para estos surveys
    const { data: responses, error: responsesError } = await supabase
      .from("survey_responses")
      .select("id, survey_id, created_at, answers")
      .eq("user_id", userId)
      .in("survey_id", surveyIds);

    if (responsesError) {
      console.error("[getCompletedTests] Error fetching responses:", responsesError);
      return NextResponse.json(
        { error: "Error al obtener respuestas" },
        { status: 500 }
      );
    }

    // Mapear las respuestas con información del survey
    const completedTests = (responses || []).map(response => {
      const survey = surveys.find(s => s.id === response.survey_id);
      return {
        id: response.id,
        surveyId: response.survey_id,
        surveyTitle: survey?.title || "Quiz",
        completed_at: response.created_at,
        createdAt: response.created_at,
      };
    });

    // Ordenar por fecha de completación (más reciente primero)
    completedTests.sort((a, b) => 
      new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    );

    return NextResponse.json({
      completedTests,
      totalCompleted: completedTests.length,
      totalSurveys: surveys.length,
    });

  } catch (error) {
    console.error("[getCompletedTests] Unexpected error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
