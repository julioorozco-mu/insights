// Colección: lessons
export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  content?: string;
  order: number;
  type: 'video' | 'livestream' | 'hybrid'; // video grabado, livestream o ambos
  videoUrl?: string; // URL del video grabado
  videoPlaybackId?: string; // de Mux (grabación o stream)
  videoRecordingId?: string;
  // Livestream
  isLive?: boolean;
  liveStreamId?: string; // ID del stream de Mux
  liveStreamKey?: string; // Stream key para OBS/software
  livePlaybackId?: string; // Playback ID del livestream
  liveStatus?: 'idle' | 'active' | 'ended';
  scheduledStartTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  // Configuración de streaming
  streamingType?: 'agora' | 'external_link'; // Tipo de streaming: nativo con Agora o link externo
  liveStreamUrl?: string; // URL del streaming en vivo externo (YouTube, etc.)
  recordedVideoUrl?: string; // URL del video grabado para mostrar después de la clase
  agoraChannel?: string; // Canal de Agora para streaming nativo
  agoraAppId?: string; // App ID de Agora
  // Recursos
  attachmentsIds?: string[];
  resourceIds?: string[]; // IDs de recursos vinculados
  formTemplateId?: string; // formulario individual
  surveyId?: string; // encuesta de la lección
  entrySurveyId?: string; // encuesta de entrada de la lección
  exitSurveyId?: string; // encuesta de salida de la lección
  startDate?: string;
  endDate?: string;
  durationMinutes?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isActive?: boolean;
  isPublished?: boolean;
}

export interface CreateLessonData {
  courseId: string;
  title: string;
  description?: string;
  order: number;
  videoPlaybackId?: string;
  startDate?: string;
  endDate?: string;
  entrySurveyId?: string;
  exitSurveyId?: string;
  resourceIds?: string[];
}

export interface UpdateLessonData {
  title?: string;
  description?: string;
  order?: number;
  videoPlaybackId?: string;
  videoRecordingId?: string;
  attachmentsIds?: string[];
  resourceIds?: string[];
  formTemplateId?: string;
  surveyId?: string;
  entrySurveyId?: string;
  exitSurveyId?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}
