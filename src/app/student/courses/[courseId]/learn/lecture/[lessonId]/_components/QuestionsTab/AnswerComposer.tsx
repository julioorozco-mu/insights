'use client';

import { useState, useCallback, memo } from 'react';
import { IconSend } from '@tabler/icons-react';

interface AnswerComposerProps {
  onSubmit: (answerText: string) => Promise<boolean>;
  isSubmitting?: boolean;
}

/**
 * Formulario inline para responder preguntas
 */
export const AnswerComposer = memo(function AnswerComposer({
  onSubmit,
  isSubmitting = false,
}: AnswerComposerProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmedText = text.trim();

    if (trimmedText.length < 5) {
      setError('La respuesta debe tener al menos 5 caracteres');
      return;
    }

    if (trimmedText.length > 5000) {
      setError('La respuesta no puede exceder 5000 caracteres');
      return;
    }

    setError(null);
    const success = await onSubmit(trimmedText);

    if (success) {
      setText('');
    }
  }, [text, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="mt-3 p-3 bg-base-200/50 rounded-lg">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe tu respuesta... (Ctrl+Enter para enviar)"
        className={`textarea textarea-bordered w-full min-h-[80px] resize-none text-sm ${
          error ? 'textarea-error' : ''
        }`}
        disabled={isSubmitting}
        maxLength={5000}
      />

      {error && (
        <p className="text-error text-xs mt-1">{error}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-base-content/60">
          {text.length}/5000
        </span>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || text.trim().length < 5}
          className="btn btn-primary btn-xs"
        >
          {isSubmitting ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <IconSend size={14} />
          )}
          Responder
        </button>
      </div>
    </div>
  );
});
