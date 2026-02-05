'use client';

import useSWR from 'swr';
import { useState, useCallback } from 'react';
import type {
  Question,
  QuestionsResponse,
  CreateQuestionInput,
  QuestionSortBy,
  Answer,
} from './types';
import { VALIDATION_LIMITS } from '../utils/lessonPlayerHelpers';

// =============================================================================
// FETCHER
// =============================================================================

const fetcher = async (url: string): Promise<QuestionsResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(error.error || 'Error al obtener preguntas');
  }
  return res.json();
};

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

interface UseQuestionsOptions {
  lessonId: string;
  initialSortBy?: QuestionSortBy;
}

// Usa constantes compartidas desde utils

interface SubmitAnswerResult {
  success: boolean;
  error?: string;
  answer?: Answer;
}

interface UseQuestionsReturn {
  questions: (Question & { answers?: Answer[] })[];
  isLoading: boolean;
  error: string | null;
  sortBy: QuestionSortBy;
  setSortBy: (sort: QuestionSortBy) => void;
  hasMore: boolean;
  refetch: () => Promise<void>;
  createQuestion: (input: Omit<CreateQuestionInput, 'lessonId'>) => Promise<Question | null>;
  isCreating: boolean;
  submitAnswer: (questionId: string, answerText: string) => Promise<SubmitAnswerResult>;
  isSubmittingAnswer: boolean;
}

export function useQuestions({
  lessonId,
  initialSortBy = 'recent',
}: UseQuestionsOptions): UseQuestionsReturn {
  const [sortBy, setSortByState] = useState<QuestionSortBy>(initialSortBy);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  // SWR key con sort incluido
  const swrKey = lessonId
    ? `/api/student/questions?lessonId=${lessonId}&sort=${sortBy}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<QuestionsResponse>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // Cache por 30s para contenido semi-estático
      errorRetryCount: 2,
      shouldRetryOnError: (error: any) => {
        // No retry en errores de autenticación o permisos
        return error?.status !== 401 && error?.status !== 403 && error?.status !== 404;
      },
    }
  );

  // Cambiar sorting
  const setSortBy = useCallback((newSort: QuestionSortBy) => {
    setSortByState(newSort);
  }, []);

  // Refetch manual
  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // Crear pregunta
  const createQuestion = useCallback(
    async (input: Omit<CreateQuestionInput, 'lessonId'>): Promise<Question | null> => {
      setIsCreating(true);
      try {
        const res = await fetch(`/api/student/questions?lessonId=${lessonId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_text: input.questionText,
            video_timestamp: input.videoTimestamp ?? 0,
            course_id: input.courseId,
            lesson_id: lessonId,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('[useQuestions] API error details:', errorData);
          throw new Error(errorData.error || 'Validation failed');
        }

        const { question } = await res.json();

        // Optimistic update con rollback en caso de error
        mutate(
          (currentData) => {
            if (!currentData) return currentData;
            return {
              ...currentData,
              questions: [question, ...currentData.questions],
            };
          },
          false // No revalidate inmediatamente
        );

        return question;
      } catch (err) {
        console.error('[useQuestions] Error creating question:', err);
        // Rollback al estado anterior en caso de error
        if (data) {
          mutate(data, false);
        }
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [lessonId, mutate]
  );

  // Responder a una pregunta con optimistic update
  const submitAnswer = useCallback(
    async (questionId: string, answerText: string): Promise<SubmitAnswerResult> => {
      const trimmedText = answerText.trim();

      // Validación cliente (debe coincidir con backend)
      if (trimmedText.length < VALIDATION_LIMITS.ANSWER.MIN) {
        return {
          success: false,
          error: `La respuesta debe tener al menos ${VALIDATION_LIMITS.ANSWER.MIN} caracteres`,
        };
      }

      setIsSubmittingAnswer(true);
      try {
        const res = await fetch(`/api/student/questions/answer?questionId=${questionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answer_text: trimmedText,
            question_id: questionId,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('[useQuestions] API error creating answer:', errorData);
          return {
            success: false,
            error: errorData.error || errorData.details?.answer_text?.[0] || 'Error al crear la respuesta',
          };
        }

        const { answer } = await res.json();

        // Optimistic update con rollback en caso de error
        mutate(
          (currentData) => {
            if (!currentData) return currentData;
            return {
              ...currentData,
              questions: currentData.questions.map((q: any) => {
                if (q.id === questionId) {
                  return {
                    ...q,
                    answers: [...(q.answers || []), answer],
                    answersCount: (q.answersCount || 0) + 1,
                  };
                }
                return q;
              }),
            };
          },
          false // No revalidate inmediatamente
        );

        return { success: true, answer };
      } catch (err) {
        console.error('[useQuestions] Error submitting answer:', err);
        // Rollback al estado anterior en caso de error
        if (data) {
          mutate(data, false);
        }
        return {
          success: false,
          error: 'Error de conexión. Intenta de nuevo.',
        };
      } finally {
        setIsSubmittingAnswer(false);
      }
    },
    [mutate]
  );

  return {
    questions: (data?.questions ?? []) as (Question & { answers?: Answer[] })[],
    isLoading,
    error: error?.message ?? null,
    sortBy,
    setSortBy,
    hasMore: data?.pagination?.hasMore ?? false,
    refetch,
    createQuestion,
    isCreating,
    submitAnswer,
    isSubmittingAnswer,
  };
}
