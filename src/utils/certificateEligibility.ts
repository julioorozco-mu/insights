import { Course } from "@/types/course";
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";

interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  timeRemaining?: number; // minutos restantes si aún no es tiempo
}

/**
 * Verifica si un estudiante es elegible para descargar el certificado
 */
export async function checkCertificateEligibility(
  courseId: string,
  studentId: string,
  course: Course
): Promise<EligibilityResult> {
  const reasons: string[] = [];
  
  // Verificar si el curso tiene certificado configurado
  if (!course.certificateTemplateId) {
    return {
      eligible: false,
      reasons: ["El curso no tiene un certificado configurado"],
    };
  }

  // Verificar si hay reglas configuradas
  if (!course.certificateRules) {
    return {
      eligible: false,
      reasons: ["No hay reglas de certificado configuradas para este curso"],
    };
  }

  const rules = course.certificateRules;

  // Disponibilidad del certificado (compatibilidad hacia atrás incluida)
  {
    const now = new Date();
    let enableAt: Date | null = null;

    if (rules.availability?.mode === 'hours_after_start') {
      if (course.startDate) {
        const hours = rules.availability.hours ?? rules.hoursAfterStart ?? 1;
        const startDate = new Date(course.startDate);
        // Convertir de UTC a hora local correctamente
        const year = startDate.getUTCFullYear();
        const month = startDate.getUTCMonth();
        const day = startDate.getUTCDate();
        const startHours = startDate.getUTCHours();
        const startMinutes = startDate.getUTCMinutes();
        const start = new Date(year, month, day, startHours, startMinutes);
        enableAt = new Date(start.getTime() + hours * 60 * 60 * 1000);
      }
    } else if (rules.availability?.mode === 'after_course_end') {
      if (course.endDate) {
        enableAt = new Date(course.endDate);
      }
    } else if (rules.availability?.mode === 'after_last_lesson') {
      try {
        const { data: lessonsData } = await supabaseClient
          .from(TABLES.LESSONS)
          .select('end_date, start_date, scheduled_start_time')
          .eq('course_id', courseId);
        
        let lastDate: Date | null = null;
        (lessonsData || []).forEach((lesson: any) => {
          const s = lesson.end_date || lesson.start_date || lesson.scheduled_start_time;
          if (s) {
            const dt = new Date(s);
            const year = dt.getUTCFullYear();
            const month = dt.getUTCMonth();
            const day = dt.getUTCDate();
            const hours = dt.getUTCHours();
            const minutes = dt.getUTCMinutes();
            const localDt = new Date(year, month, day, hours, minutes);
            if (!lastDate || localDt > lastDate) lastDate = localDt;
          }
        });
        if (lastDate) enableAt = lastDate;
      } catch {}
    } else {
      // Legacy: usar hoursAfterStart si existe
      if (course.startDate && (rules.hoursAfterStart ?? null) !== null) {
        const startDate = new Date(course.startDate);
        const year = startDate.getUTCFullYear();
        const month = startDate.getUTCMonth();
        const day = startDate.getUTCDate();
        const startHours = startDate.getUTCHours();
        const startMinutes = startDate.getUTCMinutes();
        const start = new Date(year, month, day, startHours, startMinutes);
        const hours = rules.hoursAfterStart || 1;
        enableAt = new Date(start.getTime() + hours * 60 * 60 * 1000);
      }
    }

    if (enableAt && now < enableAt) {
      const minutesRemaining = Math.ceil((enableAt.getTime() - now.getTime()) / (1000 * 60));
      return {
        eligible: false,
        reasons: [`El certificado estará disponible en ${minutesRemaining} minutos`],
        timeRemaining: minutesRemaining,
      };
    }
  }

  // Verificar inscripción desde Supabase
  // Primero obtener el student record
  const { data: studentData } = await supabaseClient
    .from(TABLES.STUDENTS)
    .select('id')
    .eq('user_id', studentId)
    .single();
  
  if (!studentData) {
    return {
      eligible: false,
      reasons: ["No estás inscrito en este curso"],
    };
  }

  const { data: enrollment } = await supabaseClient
    .from(TABLES.STUDENT_ENROLLMENTS)
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', studentData.id)
    .single();

  if (!enrollment) {
    return {
      eligible: false,
      reasons: ["No estás inscrito en este curso"],
    };
  }

  // Si solo requiere inscripción, ya es elegible
  if (rules.requireEnrollmentOnly) {
    return {
      eligible: true,
      reasons: ["Cumples con todos los requisitos"],
    };
  }

  // Verificar encuestas por curso si es requerido (compatibilidad)
  if (rules.requireSurveys && (!rules.perLessonMode || rules.perLessonMode === 'none')) {
    if (course.entrySurveyId) {
      const { data: entryResponse } = await supabaseClient
        .from(TABLES.SURVEY_RESPONSES)
        .select('id')
        .eq('survey_id', course.entrySurveyId)
        .eq('user_id', studentId)
        .single();

      if (!entryResponse) {
        reasons.push("Debes completar la encuesta de entrada");
      }
    }

    if (course.exitSurveyId) {
      const { data: exitResponse } = await supabaseClient
        .from(TABLES.SURVEY_RESPONSES)
        .select('id')
        .eq('survey_id', course.exitSurveyId)
        .eq('user_id', studentId)
        .single();

      if (!exitResponse) {
        reasons.push("Debes completar la encuesta de salida");
      }
    }
  }

  // Validaciones por lección (nuevo)
  if (rules.perLessonMode && rules.perLessonMode !== 'none') {
    try {
      const { data: lessonsData } = await supabaseClient
        .from(TABLES.LESSONS)
        .select('id, entry_survey_id, exit_survey_id')
        .eq('course_id', courseId);
      
      const lessonIds: string[] = (lessonsData || []).map((l: any) => l.id);

      for (const lessonId of lessonIds) {
        // Asistencia si se requiere "complete_all"
        if (rules.perLessonMode === 'complete_all') {
          const { data: attendance } = await supabaseClient
            .from(TABLES.LESSON_ATTENDANCE)
            .select('duration_minutes')
            .eq('lesson_id', lessonId)
            .eq('student_id', studentId)
            .single();
          
          if (!attendance) {
            reasons.push('Falta asistencia en una o más lecciones');
            break;
          } else {
            const durationMinutes = attendance.duration_minutes || 0;
            if (durationMinutes < 5) {
              reasons.push('Debes asistir al menos 5 minutos a todas las lecciones');
              break;
            }
          }
        }

        // Encuestas por lección
        const lessonDoc = (lessonsData || []).find((l: any) => l.id === lessonId);
        const entrySurveyId = lessonDoc?.entry_survey_id;
        const exitSurveyId = lessonDoc?.exit_survey_id;

        if (entrySurveyId) {
          const { data: entryResponse } = await supabaseClient
            .from(TABLES.SURVEY_RESPONSES)
            .select('id')
            .eq('survey_id', entrySurveyId)
            .eq('user_id', studentId)
            .single();
          
          if (!entryResponse) {
            reasons.push('Debes completar la encuesta de entrada de todas las lecciones');
            break;
          }
        }
        if (exitSurveyId) {
          const { data: exitResponse } = await supabaseClient
            .from(TABLES.SURVEY_RESPONSES)
            .select('id')
            .eq('survey_id', exitSurveyId)
            .eq('user_id', studentId)
            .single();
          
          if (!exitResponse) {
            reasons.push('Debes completar la encuesta de salida de todas las lecciones');
            break;
          }
        }
      }
    } catch (e) {
      reasons.push('No se pudieron validar todas las lecciones');
    }
  } else if (rules.requireAttendance) {
    // Compatibilidad: asistencia a todas las lecciones
    const lessonIds = course.lessonIds || [];
    if (lessonIds.length === 0) {
      reasons.push('El curso no tiene lecciones configuradas');
    } else {
      for (const lessonId of lessonIds) {
        const { data: attendance } = await supabaseClient
          .from(TABLES.LESSON_ATTENDANCE)
          .select('duration_minutes')
          .eq('lesson_id', lessonId)
          .eq('student_id', studentId)
          .single();
        
        if (!attendance) {
          reasons.push('Falta asistencia a una o más lecciones');
          break;
        } else {
          const durationMinutes = attendance.duration_minutes || 0;
          if (durationMinutes < 5) {
            reasons.push('Debes asistir al menos 5 minutos a todas las lecciones');
            break;
          }
        }
      }
    }
  }

  // Si no hay razones, es elegible
  if (reasons.length === 0) {
    return {
      eligible: true,
      reasons: ["Cumples con todos los requisitos"],
    };
  }

  return {
    eligible: false,
    reasons,
  };
}

/**
 * Obtiene un mensaje amigable sobre el estado de elegibilidad
 */
export function getEligibilityMessage(result: EligibilityResult): string {
  if (result.eligible) {
    return "¡Felicidades! Puedes descargar tu certificado.";
  }

  if (result.timeRemaining) {
    const hours = Math.floor(result.timeRemaining / 60);
    const minutes = result.timeRemaining % 60;
    
    if (hours > 0) {
      return `El certificado estará disponible en ${hours} hora(s) y ${minutes} minuto(s).`;
    }
    return `El certificado estará disponible en ${minutes} minuto(s).`;
  }

  return result.reasons.join(". ");
}
