'use client';

import { useState, useCallback, memo } from 'react';
import { IconPlus, IconClock } from '@tabler/icons-react';

interface NoteComposerProps {
  onSubmit: (content: string, videoTimestamp: number) => Promise<boolean>;
  currentTimestamp?: number;
  isSubmitting?: boolean;
}

/**
 * Formulario para crear nuevas notas
 */
export const NoteComposer = memo(function NoteComposer({
  onSubmit,
  currentTimestamp = 0,
  isSubmitting = false,
}: NoteComposerProps) {
  const [text, setText] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = useCallback(async () => {
    const trimmedText = text.trim();

    if (trimmedText.length < 1) {
      setError('La nota no puede estar vacía');
      return;
    }

    if (trimmedText.length > 10000) {
      setError('La nota no puede exceder 10000 caracteres');
      return;
    }

    setError(null);

    const timestamp = includeTimestamp ? Math.floor(currentTimestamp) : 0;
    const success = await onSubmit(trimmedText, timestamp);

    if (success) {
      setText('');
      setIsExpanded(false);
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

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="btn btn-outline btn-block gap-2"
      >
        <IconPlus size={18} />
        Agregar nota
      </button>
    );
  }

  return (
    <div className="card bg-base-100 border shadow-sm">
      <div className="card-body p-4">
        <h3 className="font-semibold text-base mb-3">Nueva nota</h3>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu nota aquí... (Ctrl+Enter para guardar)"
          className={`textarea textarea-bordered w-full min-h-[120px] resize-none ${
            error ? 'textarea-error' : ''
          }`}
          disabled={isSubmitting}
          maxLength={10000}
          autoFocus
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
              Vincular a {formatTimestamp(currentTimestamp)}
            </span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-xs text-base-content/60">
              {text.length}/10000
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              className="btn btn-ghost btn-sm"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || text.trim().length < 1}
              className="btn btn-primary btn-sm"
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <IconPlus size={16} />
              )}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
