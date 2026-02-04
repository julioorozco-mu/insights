'use client';

import { useState, useCallback, memo } from 'react';
import { IconSend, IconClock } from '@tabler/icons-react';

interface QuestionComposerProps {
  onSubmit: (questionText: string, videoTimestamp: number) => Promise<boolean>;
  currentTimestamp?: number;
  isSubmitting?: boolean;
}

/**
 * Formulario para crear nuevas preguntas
 * Aislado del resto del componente para evitar re-renders
 */
export const QuestionComposer = memo(function QuestionComposer({
  onSubmit,
  currentTimestamp = 0,
  isSubmitting = false,
}: QuestionComposerProps) {
  const [text, setText] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = useCallback(async () => {
    const trimmedText = text.trim();

    if (trimmedText.length < 10) {
      setError('La pregunta debe tener al menos 10 caracteres');
      return;
    }

    if (trimmedText.length > 2000) {
      setError('La pregunta no puede exceder 2000 caracteres');
      return;
    }

    setError(null);

    const timestamp = includeTimestamp ? Math.floor(currentTimestamp) : 0;
    const success = await onSubmit(trimmedText, timestamp);

    if (success) {
      setText('');
    }
  }, [text, includeTimestamp, currentTimestamp, onSubmit]);

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
    <div className="card bg-base-100 border shadow-sm">
      <div className="card-body p-4">
        <h3 className="font-semibold text-base mb-3">Hacer una pregunta</h3>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu pregunta aquí... (Ctrl+Enter para enviar)"
          className={`textarea textarea-bordered w-full min-h-[100px] resize-none ${
            error ? 'textarea-error' : ''
          }`}
          disabled={isSubmitting}
          maxLength={2000}
        />

        {error && (
          <p className="text-error text-sm mt-1">{error}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTimestamp}
              onChange={(e) => setIncludeTimestamp(e.target.checked)}
              className="checkbox checkbox-sm checkbox-primary"
              disabled={isSubmitting}
            />
            <span className="text-sm flex items-center gap-1">
              <IconClock size={16} />
              Incluir momento del video ({formatTimestamp(currentTimestamp)})
            </span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-xs text-base-content/60">
              {text.length}/2000
            </span>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || text.trim().length < 10}
              className="btn btn-primary btn-sm"
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <IconSend size={16} />
              )}
              Preguntar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
