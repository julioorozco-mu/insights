'use client';

import { useState, useCallback, memo } from 'react';
import {
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconCheck,
  IconMessage,
} from '@tabler/icons-react';
import { Avatar } from '../common';
import { AnswerCard } from './AnswerCard';
import { AnswerComposer } from './AnswerComposer';
import { useAnswers } from '../../_hooks';
import type { Question } from '../../_hooks';

interface QuestionCardProps {
  question: Question;
  currentUserId?: string;
  onTimestampClick?: (timestamp: number) => void;
}

/**
 * Tarjeta de pregunta con lazy loading de respuestas
 * Solo carga las respuestas cuando el usuario expande la pregunta
 */
export const QuestionCard = memo(function QuestionCard({
  question,
  currentUserId,
  onTimestampClick,
}: QuestionCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Lazy loading: solo fetch cuando expanded = true
  const {
    answers,
    isLoading: loadingAnswers,
    error: answersError,
    createAnswer,
    acceptAnswer,
    isCreating,
  } = useAnswers({
    questionId: question.id,
    enabled: expanded,
  });

  // Verificar si el usuario actual es el autor de la pregunta
  const isAuthor = !!(currentUserId && question.author?.id === currentUserId);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleTimestampClick = useCallback(() => {
    if (onTimestampClick && question.videoTimestamp > 0) {
      onTimestampClick(question.videoTimestamp);
    }
  }, [onTimestampClick, question.videoTimestamp]);

  const handleCreateAnswer = useCallback(
    async (answerText: string): Promise<boolean> => {
      const result = await createAnswer({ answerText });
      return !!result;
    },
    [createAnswer]
  );

  const handleAcceptAnswer = useCallback(
    async (answerId: string) => {
      await acceptAnswer(answerId);
    },
    [acceptAnswer]
  );

  return (
    <div className="card bg-base-100 border shadow-sm">
      <div className="card-body p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar
            src={question.author?.avatarUrl}
            name={question.author?.name || 'Usuario'}
            size="md"
          />

          <div className="flex-1 min-w-0">
            {/* Author info */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-medium">
                {question.author?.name || 'Usuario'}
              </span>
              <span className="text-xs text-base-content/50">
                {formatDate(question.createdAt)}
              </span>

              {question.isResolved && (
                <span className="badge badge-success badge-xs gap-1">
                  <IconCheck size={12} />
                  Resuelta
                </span>
              )}
            </div>

            {/* Timestamp badge */}
            {question.videoTimestamp > 0 && (
              <button
                onClick={handleTimestampClick}
                className="badge badge-ghost badge-sm gap-1 mb-2 hover:badge-primary transition-colors"
              >
                <IconClock size={12} />
                {formatTimestamp(question.videoTimestamp)}
              </button>
            )}

            {/* Question text */}
            <p className="text-base whitespace-pre-wrap break-words">
              {question.questionText}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-4 mt-3">
              <button
                onClick={handleToggle}
                className="btn btn-ghost btn-sm gap-1"
              >
                {expanded ? (
                  <IconChevronUp size={16} />
                ) : (
                  <IconChevronDown size={16} />
                )}
                <IconMessage size={16} />
                {question.answersCount} respuesta{question.answersCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>

        {/* Answers section (lazy loaded) */}
        {expanded && (
          <div className="mt-4 pl-4 border-l-2 border-base-300 space-y-3">
            {loadingAnswers && (
              <div className="flex items-center justify-center py-4">
                <span className="loading loading-spinner loading-sm"></span>
                <span className="ml-2 text-sm text-base-content/60">
                  Cargando respuestas...
                </span>
              </div>
            )}

            {answersError && (
              <div className="alert alert-error text-sm py-2">
                {answersError}
              </div>
            )}

            {!loadingAnswers && !answersError && answers.length === 0 && (
              <p className="text-sm text-base-content/60 py-2">
                Aún no hay respuestas. ¡Sé el primero en responder!
              </p>
            )}

            {!loadingAnswers &&
              answers.map((answer) => (
                <AnswerCard
                  key={answer.id}
                  answer={answer}
                  canAccept={isAuthor && !question.isResolved}
                  onAccept={handleAcceptAnswer}
                />
              ))}

            {/* Answer composer */}
            <AnswerComposer
              onSubmit={handleCreateAnswer}
              isSubmitting={isCreating}
            />
          </div>
        )}
      </div>
    </div>
  );
});
