'use client';

import { memo } from 'react';
import { IconCheck, IconSchool } from '@tabler/icons-react';
import { Avatar } from '../common';
import type { Answer } from '../../_hooks';

interface AnswerCardProps {
  answer: Answer;
  canAccept?: boolean;
  onAccept?: (answerId: string) => void;
}

/**
 * Tarjeta de respuesta individual
 * Memoizada para evitar re-renders innecesarios
 */
export const AnswerCard = memo(function AnswerCard({
  answer,
  canAccept = false,
  onAccept,
}: AnswerCardProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div
      className={`p-3 rounded-lg ${
        answer.isAccepted
          ? 'bg-success/10 border border-success/30'
          : answer.isInstructorAnswer
          ? 'bg-primary/5 border border-primary/20'
          : 'bg-base-200/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar
          src={answer.author?.avatarUrl}
          name={answer.author?.name || 'Usuario'}
          size="sm"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {answer.author?.name || 'Usuario'}
            </span>

            {answer.isInstructorAnswer && (
              <span className="badge badge-primary badge-xs gap-1">
                <IconSchool size={12} />
                Instructor
              </span>
            )}

            {answer.isAccepted && (
              <span className="badge badge-success badge-xs gap-1">
                <IconCheck size={12} />
                Aceptada
              </span>
            )}

            <span className="text-xs text-base-content/50">
              {formatDate(answer.createdAt)}
            </span>
          </div>

          {/* Content */}
          <p className="text-sm mt-2 whitespace-pre-wrap break-words">
            {answer.answerText}
          </p>

          {/* Actions */}
          {canAccept && !answer.isAccepted && onAccept && (
            <div className="mt-2">
              <button
                onClick={() => onAccept(answer.id)}
                className="btn btn-xs btn-ghost text-success"
              >
                <IconCheck size={14} />
                Marcar como aceptada
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
