'use client';

import useSWR from 'swr';
import { useState, useCallback } from 'react';
import type {
  Question,
  QuestionsResponse,
  CreateQuestionInput,
  QuestionSortBy,
} from './types';

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

interface UseQuestionsReturn {
  questions: Question[];
  isLoading: boolean;
  error: string | null;
  sortBy: QuestionSortBy;
  setSortBy: (sort: QuestionSortBy) => void;
  hasMore: boolean;
  refetch: () => Promise<void>;
  createQuestion: (input: Omit<CreateQuestionInput, 'lessonId'>) => Promise<Question | null>;
  isCreating: boolean;
}

export function useQuestions({
  lessonId,
  initialSortBy = 'recent',
}: UseQuestionsOptions): UseQuestionsReturn {
  const [sortBy, setSortByState] = useState<QuestionSortBy>(initialSortBy);
  const [isCreating, setIsCreating] = useState(false);

  // SWR key con sort incluido
  const swrKey = lessonId
    ? `/api/student/questions?lessonId=${lessonId}&sort=${sortBy}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<QuestionsResponse>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // Dedup requests por 5s
      errorRetryCount: 2,
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
          throw new Error(errorData.error || 'Error al crear pregunta');
        }

        const { question } = await res.json();

        // Optimistic update: agregar la pregunta al principio
        mutate(
          (currentData) => {
            if (!currentData) return currentData;
            return {
              ...currentData,
              questions: [question, ...currentData.questions],
            };
          },
          { revalidate: false }
        );

        return question;
      } catch (err) {
        console.error('[useQuestions] Error creating question:', err);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [lessonId, mutate]
  );

  return {
    questions: data?.questions ?? [],
    isLoading,
    error: error?.message ?? null,
    sortBy,
    setSortBy,
    hasMore: data?.pagination?.hasMore ?? false,
    refetch,
    createQuestion,
    isCreating,
  };
}
