'use client';

import useSWR from 'swr';
import { useCallback, useState } from 'react';
import type {
  Answer,
  AnswersResponse,
  CreateAnswerInput,
  AcceptAnswerInput,
} from './types';

// =============================================================================
// FETCHER
// =============================================================================

const fetcher = async (url: string): Promise<AnswersResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(error.error || 'Error al obtener respuestas');
  }
  return res.json();
};

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

interface UseAnswersOptions {
  questionId: string;
  enabled: boolean; // Solo fetch cuando se expande la pregunta
}

interface UseAnswersReturn {
  answers: Answer[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createAnswer: (input: Omit<CreateAnswerInput, 'questionId'>) => Promise<Answer | null>;
  acceptAnswer: (answerId: string) => Promise<boolean>;
  isCreating: boolean;
}

export function useAnswers({
  questionId,
  enabled,
}: UseAnswersOptions): UseAnswersReturn {
  const [isCreating, setIsCreating] = useState(false);

  // SWR key condicional - solo fetch si enabled es true
  const swrKey = enabled && questionId
    ? `/api/student/questions/${questionId}/answers`
    : null;

  const { data, error, isLoading, mutate } = useSWR<AnswersResponse>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // Cache por 10s
      errorRetryCount: 2,
    }
  );

  // Refetch manual
  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // Crear respuesta
  const createAnswer = useCallback(
    async (input: Omit<CreateAnswerInput, 'questionId'>): Promise<Answer | null> => {
      setIsCreating(true);
      try {
        const res = await fetch(`/api/student/questions/answer?questionId=${questionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answer_text: input.answerText,
            question_id: questionId,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error al crear respuesta');
        }

        const { answer } = await res.json();

        // Optimistic update
        mutate(
          (currentData) => {
            if (!currentData) return currentData;
            return {
              ...currentData,
              answers: [...currentData.answers, answer],
              total: currentData.total + 1,
            };
          },
          { revalidate: false }
        );

        return answer;
      } catch (err) {
        console.error('[useAnswers] Error creating answer:', err);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [questionId, mutate]
  );

  // Aceptar respuesta
  const acceptAnswer = useCallback(
    async (answerId: string): Promise<boolean> => {
      try {
        const res = await fetch('/api/student/questions/answer', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answer_id: answerId,
            question_id: questionId,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error al aceptar respuesta');
        }

        // Optimistic update: marcar como aceptada
        mutate(
          (currentData) => {
            if (!currentData) return currentData;
            return {
              ...currentData,
              answers: currentData.answers.map((a) => ({
                ...a,
                isAccepted: a.id === answerId,
              })),
            };
          },
          { revalidate: true }
        );

        return true;
      } catch (err) {
        console.error('[useAnswers] Error accepting answer:', err);
        return false;
      }
    },
    [questionId, mutate]
  );

  return {
    answers: data?.answers ?? [],
    isLoading: enabled && isLoading,
    error: error?.message ?? null,
    refetch,
    createAnswer,
    acceptAnswer,
    isCreating,
  };
}
