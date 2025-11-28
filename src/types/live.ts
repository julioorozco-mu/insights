export interface LiveStream {
  id: string;
  title: string;
  description?: string;
  instructorId: string;
  instructorName?: string;
  agoraChannel: string;
  agoraAppId: string;
  active: boolean;
  startAt?: Date;
  endAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLiveStreamData {
  title: string;
  description?: string;
  instructorId: string;
  startAt?: Date;
}

export interface AgoraStreamResponse {
  channelName: string;
  appId: string;
  status: string;
}

export interface LiveStreamStatus {
  id: string;
  active: boolean;
  status: "idle" | "active" | "disconnected";
  viewerCount?: number;
}

// Chat en vivo
export interface LiveChatMessage {
  id: string;
  lessonId: string;
  userId: string;
  userName: string;
  userRole: 'student' | 'speaker' | 'admin';
  message: string;
  timestamp: string;
  isQuestion?: boolean;
  isHighlighted?: boolean;
}

// Encuestas rápidas en vivo
export interface LivePoll {
  id: string;
  lessonId: string;
  question: string;
  options: LivePollOption[];
  duration: number; // segundos (15-60)
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  totalVotes: number;
}

export interface LivePollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

export interface LivePollVote {
  id: string;
  pollId: string;
  userId: string;
  optionId: string;
  timestamp: string;
}

export interface LivePollResult {
  pollId: string;
  question: string;
  options: LivePollOption[];
  totalVotes: number;
  endedAt: string;
}
