// Colección: lessonAttendance
export interface LessonAttendance {
  id: string;
  lessonId: string;
  studentId: string;
  courseId: string;
  // Asistencia al streaming en vivo
  joinedLiveAt?: string;
  leftLiveAt?: string;
  totalLiveMinutes?: number; // Tiempo total viendo el stream
  attendedLive?: boolean; // true si estuvo al menos 5 minutos
  // Encuestas
  completedEntrySurvey?: boolean;
  completedExitSurvey?: boolean;
  // Participación en encuestas en vivo (polls)
  livePollsAnswered?: number; // Cuántas encuestas en vivo contestó
  totalLivePolls?: number; // Total de encuestas en vivo que se lanzaron
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Colección: liveStreamSessions - Sesiones de visualización del stream
export interface LiveStreamSession {
  id: string;
  lessonId: string;
  studentId: string;
  joinedAt: string;
  leftAt?: string;
  durationMinutes?: number;
  createdAt: string;
}

// Colección: pollResponses - Respuestas a encuestas en vivo
export interface PollResponse {
  id: string;
  pollId: string;
  lessonId: string;
  studentId: string;
  answer: string | string[]; // Puede ser respuesta única o múltiple
  answeredAt: string;
  createdAt: string;
}

export interface CreateAttendanceData {
  lessonId: string;
  studentId: string;
  courseId: string;
}

export interface UpdateAttendanceData {
  joinedLiveAt?: string;
  leftLiveAt?: string;
  totalLiveMinutes?: number;
  attendedLive?: boolean;
  completedEntrySurvey?: boolean;
  completedExitSurvey?: boolean;
  livePollsAnswered?: number;
  totalLivePolls?: number;
}

// Datos agregados para mostrar en la UI
export interface StudentAttendanceStats {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvatar?: string;
  // Por lección
  lessons: {
    lessonId: string;
    lessonTitle: string;
    attendedLive: boolean;
    totalLiveMinutes: number;
    completedEntrySurvey: boolean;
    completedExitSurvey: boolean;
    livePollsAnswered: number;
    totalLivePolls: number;
  }[];
  // Totales del curso
  totalLessons: number;
  attendedLessons: number;
  totalLiveMinutes: number;
  completedEntrySurveys: number;
  completedExitSurveys: number;
  totalLivePollsAnswered: number;
  totalLivePolls: number;
}
