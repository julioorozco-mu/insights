export interface LivePoll {
  id: string;
  lessonId: string;
  question: string;
  options: string[];
  duration: number; // en segundos (20-120)
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  createdBy: string;
}

export interface PollResponse {
  id: string;
  pollId: string;
  userId: string;
  userName: string;
  selectedOption: number; // índice de la opción seleccionada
  timestamp: Date;
}

export interface PollResults {
  pollId: string;
  question: string;
  options: string[];
  totalResponses: number;
  responses: {
    option: string;
    count: number;
    percentage: number;
  }[];
  expiresAt: Date;
  isActive: boolean;
}
