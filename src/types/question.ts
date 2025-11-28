// Tipos para preguntas de la audiencia
export interface AudienceQuestion {
  id: string;
  lessonId: string;
  userId: string;
  userName: string;
  question: string;
  isAnswered: boolean;
  createdAt: any;
  answeredAt?: any;
}

export interface CreateQuestionData {
  lessonId: string;
  userId: string;
  userName: string;
  question: string;
  isAnswered: boolean;
  createdAt: any;
}
