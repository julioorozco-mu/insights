/**
 * Sistema de Evaluaciones de Acreditación
 * 
 * ESTRUCTURA:
 * - CUESTIONARIOS (existentes): Por nivel, NO impactan calificación
 * - EVALUACIONES (nuevas): Examen final para ACREDITAR la microcredencial
 * 
 * Microcredencial (Curso)
 *   ├── Nivel 1 → Lecciones + Cuestionario (sin calificación)
 *   ├── Nivel 2 → Lecciones + Cuestionario (sin calificación)
 *   └── EVALUACIÓN FINAL → Determina acreditación
 */

/**
 * Tipos de pregunta disponibles para evaluaciones
 */
export type TestQuestionType =
  | 'multiple_choice'    // Opción múltiple (una respuesta)
  | 'multiple_answer'    // Opción múltiple (varias respuestas)
  | 'true_false'         // Verdadero/Falso
  | 'open_ended'         // Respuesta abierta
  | 'poll'               // Encuesta/Poll
  | 'reorder'            // Ordenar elementos
  | 'match'              // Emparejar elementos
  | 'drag_drop'          // Arrastrar y soltar
  | 'sequencing';        // Secuenciación

/**
 * Estado de una evaluación
 */
export type TestStatus = 'draft' | 'published' | 'archived';

/**
 * Modo de tiempo para una evaluación
 */
export type TestTimeMode = 'unlimited' | 'timed';

/**
 * Estado de un intento de evaluación
 */
export type TestAttemptStatus = 'in_progress' | 'completed' | 'abandoned' | 'timed_out';

/**
 * Opción de respuesta para preguntas de opción múltiple
 */
export interface TestQuestionOption {
  id: string;
  text: string;
  mediaUrl?: string | null;
  correctPosition?: number; // Para preguntas de reordenamiento
}

/**
 * Estructura para preguntas de emparejamiento (match)
 */
export interface MatchOptions {
  left: TestQuestionOption[];
  right: TestQuestionOption[];
  pairs: Array<{ left: string; right: string }>;
}

/**
 * Pregunta de una evaluación
 */
export interface TestQuestion {
  id: string;
  testId: string;
  questionType: TestQuestionType;
  questionText: string;
  questionMediaUrl?: string | null;
  options: TestQuestionOption[] | MatchOptions;
  correctAnswer: string | string[] | Record<string, string> | null;
  explanation?: string | null;
  points: number;
  timeLimitSeconds?: number | null;
  order: number;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Evaluación de Acreditación
 * Examen final para acreditar una microcredencial
 */
export interface Test {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  coverImageUrl?: string | null;
  status: TestStatus;
  timeMode: TestTimeMode;
  timeLimitMinutes?: number | null;
  passingScore: number; // % mínimo para ACREDITAR
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  allowReview: boolean;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Relaciones (opcionales, para cuando se incluyen en queries)
  questions?: TestQuestion[];
  questionsCount?: number;
  creator?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

/**
 * Vinculación de evaluación a CURSO (Microcredencial)
 * El examen final de acreditación se vincula al curso completo
 */
export interface CourseTest {
  id: string;
  testId: string;
  courseId: string;
  isRequired: boolean;
  requireAllSections: boolean; // Requiere completar todos los niveles antes
  availableFrom?: string | null;
  availableUntil?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Relaciones
  test?: Test;
  course?: {
    id: string;
    title: string;
    thumbnailUrl?: string;
  };
}

/**
 * Intento de evaluación por un estudiante
 */
export interface TestAttempt {
  id: string;
  courseTestId: string;
  testId: string;
  courseId: string;
  studentId: string;
  attemptNumber: number;
  status: TestAttemptStatus;
  score?: number | null;
  maxScore?: number | null;
  percentage?: number | null;
  passed?: boolean | null;
  accredited?: boolean; // Si ACREDITÓ la microcredencial con este intento
  startTime: string;
  endTime?: string | null;
  timeSpentSeconds?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  updatedAt: string;
  // Relaciones
  courseTest?: CourseTest;
  test?: Test;
  course?: {
    id: string;
    title: string;
  };
  student?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  answers?: TestAnswer[];
}

/**
 * Respuesta de un estudiante a una pregunta
 */
export interface TestAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  studentId: string;
  answer: string | string[] | Record<string, string> | null;
  isCorrect?: boolean | null;
  pointsEarned: number;
  timeSpentSeconds?: number | null;
  answeredAt: string;
  createdAt: string;
  // Relaciones
  question?: TestQuestion;
}

/**
 * Acreditación de microcredencial
 * Registro de estudiantes que acreditaron una microcredencial
 */
export interface CourseAccreditation {
  id: string;
  studentId: string;
  courseId: string;
  testAttemptId?: string | null;
  finalScore?: number | null;
  accreditedAt: string;
  certificateIssued: boolean;
  certificateId?: string | null;
  createdAt: string;
  updatedAt: string;
  // Relaciones
  student?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  course?: {
    id: string;
    title: string;
    thumbnailUrl?: string;
  };
  testAttempt?: TestAttempt;
}

// ============================================================================
// DTOs para APIs
// ============================================================================

/**
 * DTO para crear una nueva evaluación
 */
export interface CreateTestDTO {
  title: string;
  description?: string;
  instructions?: string;
  coverImageUrl?: string;
  timeMode?: TestTimeMode;
  timeLimitMinutes?: number;
  passingScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResultsImmediately?: boolean;
  showCorrectAnswers?: boolean;
  allowReview?: boolean;
}

/**
 * DTO para actualizar una evaluación
 */
export interface UpdateTestDTO extends Partial<CreateTestDTO> {
  status?: TestStatus;
  isActive?: boolean;
}

/**
 * DTO para crear una pregunta
 */
export interface CreateQuestionDTO {
  questionType: TestQuestionType;
  questionText: string;
  questionMediaUrl?: string;
  options?: TestQuestionOption[] | MatchOptions;
  correctAnswer?: string | string[] | Record<string, string>;
  explanation?: string;
  points?: number;
  timeLimitSeconds?: number;
  order?: number;
  isRequired?: boolean;
}

/**
 * DTO para actualizar una pregunta
 */
export interface UpdateQuestionDTO extends Partial<CreateQuestionDTO> {}

/**
 * DTO para vincular una evaluación a un CURSO (microcredencial)
 */
export interface LinkTestToCourseDTO {
  testId: string;
  courseId: string;
  isRequired?: boolean;
  requireAllSections?: boolean;
  availableFrom?: string;
  availableUntil?: string;
}

/**
 * DTO para guardar una respuesta
 */
export interface SaveAnswerDTO {
  questionId: string;
  answer: string | string[] | Record<string, string>;
  timeSpentSeconds?: number;
}

/**
 * DTO para iniciar un intento de evaluación
 */
export interface StartTestAttemptDTO {
  courseTestId: string;
}

/**
 * DTO para finalizar una evaluación
 */
export interface SubmitTestDTO {
  answers: SaveAnswerDTO[];
}

// ============================================================================
// Respuestas de API
// ============================================================================

/**
 * Respuesta al listar evaluaciones
 */
export interface TestsListResponse {
  tests: Test[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Respuesta al obtener una evaluación con sus preguntas
 */
export interface TestWithQuestionsResponse extends Test {
  questions: TestQuestion[];
}

/**
 * Respuesta al iniciar un intento de evaluación
 */
export interface StartTestResponse {
  attempt: TestAttempt;
  test: TestWithQuestionsResponse;
  remainingTime?: number; // En segundos, si es timed
}

/**
 * Respuesta al finalizar una evaluación
 */
export interface SubmitTestResponse {
  attempt: TestAttempt;
  results: {
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    unanswered: number;
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    accredited: boolean; // Si ACREDITÓ la microcredencial
    timeSpent: number;
  };
  // Si showCorrectAnswers es true
  answersReview?: Array<{
    questionId: string;
    studentAnswer: string | string[] | Record<string, string> | null;
    correctAnswer: string | string[] | Record<string, string> | null;
    isCorrect: boolean;
    pointsEarned: number;
    explanation?: string;
  }>;
}

/**
 * Estadísticas de resultados para admin/teacher
 */
export interface TestResultsStats {
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  passRate: number;
  accreditationRate: number;
  averageTimeSeconds: number;
  highestScore: number;
  lowestScore: number;
}

/**
 * Respuesta al obtener resultados de una evaluación (admin)
 */
export interface TestResultsResponse {
  test: Test;
  course: {
    id: string;
    title: string;
  };
  stats: TestResultsStats;
  attempts: Array<TestAttempt & {
    student: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
    };
  }>;
}

// ============================================================================
// Configuración de tipos de pregunta
// ============================================================================

/**
 * Configuración visual para cada tipo de pregunta
 */
export const QUESTION_TYPE_CONFIG: Record<TestQuestionType, {
  label: string;
  labelEs: string;
  icon: string;
  color: string;
  description: string;
  descriptionEs: string;
}> = {
  multiple_choice: {
    label: 'Multiple Choice',
    labelEs: 'Opción Múltiple',
    icon: 'CheckSquare',
    color: '#A855F7',
    description: 'Single answer from multiple options',
    descriptionEs: 'Una respuesta de varias opciones',
  },
  multiple_answer: {
    label: 'Multiple Answer',
    labelEs: 'Respuesta Múltiple',
    icon: 'ListChecks',
    color: '#A855F7',
    description: 'Multiple correct answers',
    descriptionEs: 'Varias respuestas correctas',
  },
  true_false: {
    label: 'True/False',
    labelEs: 'Verdadero/Falso',
    icon: 'ToggleLeft',
    color: '#6366F1',
    description: 'True or False question',
    descriptionEs: 'Pregunta de verdadero o falso',
  },
  open_ended: {
    label: 'Open Ended',
    labelEs: 'Respuesta Abierta',
    icon: 'AlignLeft',
    color: '#0EA5E9',
    description: 'Free text response',
    descriptionEs: 'Respuesta de texto libre',
  },
  poll: {
    label: 'Poll',
    labelEs: 'Encuesta',
    icon: 'BarChart2',
    color: '#22C55E',
    description: 'Opinion poll without correct answer',
    descriptionEs: 'Encuesta de opinión sin respuesta correcta',
  },
  reorder: {
    label: 'Reorder',
    labelEs: 'Ordenar',
    icon: 'ArrowUpDown',
    color: '#22C55E',
    description: 'Put items in correct order',
    descriptionEs: 'Ordenar elementos correctamente',
  },
  match: {
    label: 'Match',
    labelEs: 'Emparejar',
    icon: 'Link2',
    color: '#0EA5E9',
    description: 'Match items from two columns',
    descriptionEs: 'Emparejar elementos de dos columnas',
  },
  drag_drop: {
    label: 'Drag and Drop',
    labelEs: 'Arrastrar y Soltar',
    icon: 'Move',
    color: '#6366F1',
    description: 'Drag items to correct positions',
    descriptionEs: 'Arrastrar elementos a posiciones correctas',
  },
  sequencing: {
    label: 'Sequencing',
    labelEs: 'Secuencia',
    icon: 'ListOrdered',
    color: '#F97316',
    description: 'Arrange in sequential order',
    descriptionEs: 'Ordenar en secuencia',
  },
};

/**
 * Obtiene el color de fondo suave para un tipo de pregunta
 */
export function getQuestionTypeBackgroundColor(type: TestQuestionType): string {
  const colors: Record<TestQuestionType, string> = {
    multiple_choice: '#F4E9FF',
    multiple_answer: '#F4E9FF',
    true_false: '#EEF2FF',
    open_ended: '#E0F7FF',
    poll: '#E7F9EE',
    reorder: '#E7F9EE',
    match: '#E0F7FF',
    drag_drop: '#EEF2FF',
    sequencing: '#FFF7ED',
  };
  return colors[type];
}

/**
 * Verifica si una respuesta es correcta según el tipo de pregunta
 */
export function checkAnswer(
  questionType: TestQuestionType,
  studentAnswer: unknown,
  correctAnswer: unknown
): boolean {
  if (questionType === 'poll' || questionType === 'open_ended') {
    // Las encuestas y respuestas abiertas no tienen respuesta correcta
    return true;
  }

  if (questionType === 'multiple_choice' || questionType === 'true_false') {
    return studentAnswer === correctAnswer;
  }

  if (questionType === 'multiple_answer') {
    const studentArr = Array.isArray(studentAnswer) ? studentAnswer : [];
    const correctArr = Array.isArray(correctAnswer) ? correctAnswer : [];
    return (
      studentArr.length === correctArr.length &&
      studentArr.every((a) => correctArr.includes(a))
    );
  }

  if (questionType === 'reorder' || questionType === 'sequencing') {
    const studentArr = Array.isArray(studentAnswer) ? studentAnswer : [];
    const correctArr = Array.isArray(correctAnswer) ? correctAnswer : [];
    return (
      studentArr.length === correctArr.length &&
      studentArr.every((a, i) => a === correctArr[i])
    );
  }

  if (questionType === 'match') {
    const studentObj = typeof studentAnswer === 'object' ? studentAnswer : {};
    const correctObj = typeof correctAnswer === 'object' ? correctAnswer : {};
    return JSON.stringify(studentObj) === JSON.stringify(correctObj);
  }

  return false;
}
