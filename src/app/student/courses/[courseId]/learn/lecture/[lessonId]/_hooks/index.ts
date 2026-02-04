/**
 * Hooks para el LessonPlayer
 * Q&A y Notas con SWR para data fetching optimizado
 */

// Hooks principales
export { useQuestions } from './useQuestions';
export { useAnswers } from './useAnswers';
export { useNotes } from './useNotes';

// Tipos
export type {
  Question,
  QuestionAuthor,
  QuestionsResponse,
  Answer,
  AnswerAuthor,
  AnswersResponse,
  Note,
  NotesResponse,
  CreateQuestionInput,
  CreateAnswerInput,
  AcceptAnswerInput,
  CreateNoteInput,
  UpdateNoteInput,
  QuestionSortBy,
} from './types';
