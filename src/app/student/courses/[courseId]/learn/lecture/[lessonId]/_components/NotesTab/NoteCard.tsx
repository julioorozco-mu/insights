'use client';

import { useState, useCallback, memo } from 'react';
import { IconClock, IconEdit, IconTrash, IconCheck, IconX } from '@tabler/icons-react';
import type { Note } from '../../_hooks';

interface NoteCardProps {
  note: Note;
  onUpdate: (noteId: string, content: string) => Promise<boolean>;
  onDelete: (noteId: string) => Promise<boolean>;
  onTimestampClick?: (timestamp: number) => void;
}

/**
 * Tarjeta de nota individual con edición inline
 */
export const NoteCard = memo(function NoteCard({
  note,
  onUpdate,
  onDelete,
  onTimestampClick,
}: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleTimestampClick = useCallback(() => {
    if (onTimestampClick && note.videoTimestamp > 0) {
      onTimestampClick(note.videoTimestamp);
    }
  }, [onTimestampClick, note.videoTimestamp]);

  const handleStartEdit = useCallback(() => {
    setEditText(note.content);
    setIsEditing(true);
  }, [note.content]);

  const handleCancelEdit = useCallback(() => {
    setEditText(note.content);
    setIsEditing(false);
  }, [note.content]);

  const handleSave = useCallback(async () => {
    const trimmedText = editText.trim();
    if (trimmedText.length < 1 || trimmedText === note.content) {
      handleCancelEdit();
      return;
    }

    setIsSaving(true);
    const success = await onUpdate(note.id, trimmedText);
    setIsSaving(false);

    if (success) {
      setIsEditing(false);
    }
  }, [editText, note.content, note.id, onUpdate, handleCancelEdit]);

  const handleDelete = useCallback(async () => {
    if (!confirm('¿Estás seguro de eliminar esta nota?')) return;

    setIsDeleting(true);
    await onDelete(note.id);
    setIsDeleting(false);
  }, [note.id, onDelete]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleSave, handleCancelEdit]
  );

  return (
    <div className="card bg-base-100 border shadow-sm hover:shadow-md transition-shadow">
      <div className="card-body p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {note.videoTimestamp > 0 && (
              <button
                onClick={handleTimestampClick}
                className="badge badge-ghost badge-sm gap-1 hover:badge-primary transition-colors"
              >
                <IconClock size={12} />
                {formatTimestamp(note.videoTimestamp)}
              </button>
            )}
            <span className="text-xs text-base-content/50">
              {formatDate(note.createdAt)}
            </span>
          </div>

          {!isEditing && (
            <div className="flex gap-1">
              <button
                onClick={handleStartEdit}
                className="btn btn-ghost btn-xs"
                title="Editar"
              >
                <IconEdit size={14} />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn btn-ghost btn-xs text-error"
                title="Eliminar"
              >
                {isDeleting ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <IconTrash size={14} />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="textarea textarea-bordered w-full min-h-[100px] resize-none"
              disabled={isSaving}
              autoFocus
              maxLength={10000}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="btn btn-ghost btn-sm"
              >
                <IconX size={14} />
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || editText.trim().length < 1}
                className="btn btn-primary btn-sm"
              >
                {isSaving ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <IconCheck size={14} />
                )}
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">
            {note.content}
          </p>
        )}
      </div>
    </div>
  );
});
