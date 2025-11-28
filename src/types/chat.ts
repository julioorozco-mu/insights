// Colección: courseLiveChats/{courseId}/messages
export interface CourseChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
  isPinned?: boolean;
  isQuestion?: boolean;
}

// Tipo genérico para mensajes de chat en vivo
export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  createdAt: Date;
  isHighlighted?: boolean;
  isPinned?: boolean;
  isQuestion?: boolean;
}

// Colección: surveyLiveChats/{courseId}/polls
export interface SurveyLiveChat {
  id: string;
  courseId: string;
  question: string;
  options: {
    label: string;
    value: string;
  }[];
  responses: {
    userId: string;
    answer: string;
  }[];
  createdAt: string;
  isActive: boolean;
}

export interface CreateChatMessageData {
  userId: string;
  userName: string;
  message: string;
  isPinned?: boolean;
  isQuestion?: boolean;
}

export interface CreateMessageData {
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  createdAt?: Date;
  isHighlighted?: boolean;
  isPinned?: boolean;
  isQuestion?: boolean;
}

export interface CreateLivePollData {
  courseId: string;
  question: string;
  options: {
    label: string;
    value: string;
  }[];
}

export interface PollResponseData {
  userId: string;
  answer: string;
}
