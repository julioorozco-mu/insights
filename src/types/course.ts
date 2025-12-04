// Colección: courses
export interface Course {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  thumbnailUrl?: string; // Miniatura para listados
  speakerIds: string[]; // relación con speakers (mantener para compatibilidad)
  coHostIds?: string[]; // Co-hosts para presentación/despedida (mantener para compatibilidad)
  lessonIds: string[];
  tags?: string[];
  durationMinutes?: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
  entrySurveyId?: string;
  exitSurveyId?: string;
  certificateTemplateId?: string;
  formTemplateId?: string; // formulario principal
  isLive?: boolean;
  livePlaybackId?: string; // de Mux
  // Fechas de inscripción
  enrollmentStartDate?: string; // Inicio de inscripciones
  enrollmentEndDate?: string; // Fin de inscripciones
  unlimitedEnrollment?: boolean; // Sin límite de fecha
  // Reglas de inscripción
  enrollmentRules?: {
    type: 'before_start' | 'date_range' | 'anytime'; // Tipo de regla
  };
  // Fechas del curso
  startDate?: string; // Inicio del curso
  endDate?: string; // Fin del curso
  // Campos para cursos públicos
  price?: number; // Precio base del curso en USD
  salePercentage?: number; // Porcentaje de descuento (0-100)
  isPublished?: boolean; // Si el curso está publicado y visible
  isHidden?: boolean; // Si el curso está oculto temporalmente
  university?: string; // Universidad asociada
  specialization?: string; // Especialización o programa
  // Reglas para certificados
  certificateRules?: {
    requireSurveys?: boolean; // Completar encuestas de entrada y salida
    requireAttendance?: boolean; // Asistir al menos 5 min a todas las lecciones
    requireEnrollmentOnly?: boolean; // Solo estar inscrito
    hoursAfterStart?: number; // Horas después del inicio para habilitar (1, 2 o 3) - legacy
    // Nuevo: modo de validación por lección
    perLessonMode?: 'complete_all' | 'quizzes_only' | 'none';
    // Nuevo: forzar completar lecciones en orden para habilitar cuestionarios
    requireSequentialLessons?: boolean;
    // Nuevo: disponibilidad del certificado
    availability?: {
      mode: 'hours_after_start' | 'after_course_end' | 'after_last_lesson';
      hours?: number; // requerido si mode = hours_after_start
    };
    // Nuevo: habilitar encuesta de salida solo después de la hora de inicio de la lección
    exitSurveyAfterLessonStart?: boolean;
  };
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
}

export interface CreateCourseData {
  title: string;
  description: string;
  speakerIds?: string[]; // Opcional para cursos públicos
  coHostIds?: string[];
  coverImageUrl?: string;
  thumbnailUrl?: string;
  tags?: string[];
  difficulty?: "beginner" | "intermediate" | "advanced";
  startDate?: string;
  endDate?: string;
  entrySurveyId?: string;
  exitSurveyId?: string;
  enrollmentRules?: {
    type: 'before_start' | 'date_range' | 'anytime';
  };
  enrollmentStartDate?: string;
  enrollmentEndDate?: string;
  // Campos para cursos públicos
  price?: number;
  salePercentage?: number;
  isPublished?: boolean;
  isHidden?: boolean;
  university?: string;
  specialization?: string;
}

export interface UpdateCourseData {
  title?: string;
  description?: string;
  coverImageUrl?: string;
  thumbnailUrl?: string;
  speakerIds?: string[];
  coHostIds?: string[];
  lessonIds?: string[];
  tags?: string[];
  durationMinutes?: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
  entrySurveyId?: string;
  exitSurveyId?: string;
  certificateTemplateId?: string;
  formTemplateId?: string;
  isLive?: boolean;
  livePlaybackId?: string;
  enrollmentStartDate?: string;
  enrollmentEndDate?: string;
  unlimitedEnrollment?: boolean;
  enrollmentRules?: {
    type: 'before_start' | 'date_range' | 'anytime';
  };
  startDate?: string;
  endDate?: string;
  certificateRules?: {
    requireSurveys?: boolean;
    requireAttendance?: boolean;
    requireEnrollmentOnly?: boolean;
    hoursAfterStart?: number;
  };
  isActive?: boolean;
  // Campos para cursos públicos
  price?: number;
  salePercentage?: number;
  isPublished?: boolean;
  isHidden?: boolean;
  university?: string;
  specialization?: string;
}
