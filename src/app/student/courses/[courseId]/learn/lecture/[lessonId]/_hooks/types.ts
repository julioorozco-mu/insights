/**
 * Tipos compartidos para Q&A y Notes del LessonPlayer
 */

// =============================================================================
// TIPOS DE PREGUNTAS (Q&A)
// =============================================================================

export interface QuestionAuthor {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Question {
  id: string;
  questionText: string;
  videoTimestamp: number;
  isResolved: boolean;
  upvotes: number;
  answersCount: number;
  createdAt: string;
  author: QuestionAuthor | null;
}

export interface QuestionsResponse {
  questions: Question[];
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

// =============================================================================
// TIPOS DE RESPUESTAS
// =============================================================================

export interface AnswerAuthor {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

export interface Answer {
  id: string;
  answerText: string;
  isInstructorAnswer: boolean;
  isAccepted: boolean;
  upvotes: number;
  createdAt: string;
  author: AnswerAuthor | null;
}

export interface AnswersResponse {
  answers: Answer[];
  total: number;
}

// =============================================================================
// TIPOS DE NOTAS
// =============================================================================

export interface Note {
  id: string;
  content: string;
  videoTimestamp: number;
  createdAt: string;
  updatedAt?: string;
}

export interface NotesResponse {
  notes: Note[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
  };
}

// =============================================================================
// TIPOS DE INPUTS PARA MUTACIONES
// =============================================================================

export interface CreateQuestionInput {
  questionText: string;
  videoTimestamp?: number;
  courseId: string;
  lessonId: string;
}

export interface CreateAnswerInput {
  answerText: string;
  questionId: string;
}

export interface AcceptAnswerInput {
  answerId: string;
  questionId: string;
}

export interface CreateNoteInput {
  content: string;
  videoTimestamp?: number;
  courseId: string;
  lessonId: string;
}

export interface UpdateNoteInput {
  noteId: string;
  content?: string;
  videoTimestamp?: number;
}

// =============================================================================
// TIPOS DE SORTING
// =============================================================================

export type QuestionSortBy = 'recent' | 'popular' | 'unanswered';
