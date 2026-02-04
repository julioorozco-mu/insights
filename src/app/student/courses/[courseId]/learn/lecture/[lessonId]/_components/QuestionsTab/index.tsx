'use client';

import { useCallback } from 'react';
import { IconMessageCircle, IconFlame, IconHelpCircle } from '@tabler/icons-react';
import { QuestionComposer } from './QuestionComposer';
import { QuestionCard } from './QuestionCard';
import { useQuestions } from '../../_hooks';
import type { QuestionSortBy } from '../../_hooks';

interface QuestionsTabProps {
  lessonId: string;
  courseId: string;
  currentUserId?: string;
  currentVideoTimestamp?: number;
  onTimestampClick?: (timestamp: number) => void;
}

/**
 * Tab de Preguntas y Respuestas
 * Lazy loaded via next/dynamic con ssr: false
 */
export default function QuestionsTab({
  lessonId,
  courseId,
  currentUserId,
  currentVideoTimestamp = 0,
  onTimestampClick,
}: QuestionsTabProps) {
  const {
    questions,
    isLoading,
    error,
    sortBy,
    setSortBy,
    createQuestion,
    isCreating,
  } = useQuestions({
    lessonId,
    initialSortBy: 'recent',
  });

  const handleCreateQuestion = useCallback(
    async (questionText: string, videoTimestamp: number): Promise<boolean> => {
      const result = await createQuestion({
        questionText,
        videoTimestamp,
        courseId,
      });
      return !!result;
    },
    [createQuestion, courseId]
  );

  const sortOptions: { key: QuestionSortBy; label: string; icon: React.ReactNode }[] = [
    { key: 'recent', label: 'Recientes', icon: <IconMessageCircle size={16} /> },
    { key: 'popular', label: 'Populares', icon: <IconFlame size={16} /> },
    { key: 'unanswered', label: 'Sin responder', icon: <IconHelpCircle size={16} /> },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Skeleton del composer */}
        <div className="card bg-base-100 border animate-pulse">
          <div className="card-body p-4">
            <div className="h-4 bg-base-300 rounded w-1/4 mb-4"></div>
            <div className="h-24 bg-base-300 rounded"></div>
          </div>
        </div>

        {/* Skeleton de preguntas */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="card bg-base-100 border animate-pulse">
            <div className="card-body p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-base-300 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-base-300 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-base-300 rounded w-full"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Composer */}
      <QuestionComposer
        onSubmit={handleCreateQuestion}
        currentTimestamp={currentVideoTimestamp}
        isSubmitting={isCreating}
      />

      {/* Sort options */}
      <div className="flex gap-2 flex-wrap">
        {sortOptions.map((option) => (
          <button
            key={option.key}
            onClick={() => setSortBy(option.key)}
            className={`btn btn-sm gap-1 ${
              sortBy === option.key ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>

      {/* Questions list */}
      <div className="space-y-4">
        {questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            currentUserId={currentUserId}
            onTimestampClick={onTimestampClick}
          />
        ))}

        {questions.length === 0 && (
          <div className="text-center py-12">
            <IconMessageCircle size={48} className="mx-auto text-base-content/30 mb-3" />
            <p className="text-base-content/60">
              No hay preguntas aún.
              <br />
              ¡Sé el primero en preguntar!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
