'use client';

import { useCallback } from 'react';
import { IconNote, IconNotebook } from '@tabler/icons-react';
import { NoteComposer } from './NoteComposer';
import { NoteCard } from './NoteCard';
import { useNotes } from '../../_hooks';

interface NotesTabProps {
  lessonId: string;
  courseId: string;
  currentVideoTimestamp?: number;
  onTimestampClick?: (timestamp: number) => void;
}

/**
 * Tab de Notas personales
 * Lazy loaded via next/dynamic con ssr: false
 */
export default function NotesTab({
  lessonId,
  courseId,
  currentVideoTimestamp = 0,
  onTimestampClick,
}: NotesTabProps) {
  const {
    notes,
    isLoading,
    error,
    createNote,
    updateNote,
    deleteNote,
    isCreating,
  } = useNotes({ lessonId, courseId });

  const handleCreateNote = useCallback(
    async (content: string, videoTimestamp: number): Promise<boolean> => {
      const result = await createNote({
        content,
        videoTimestamp,
      });
      return !!result;
    },
    [createNote]
  );

  const handleUpdateNote = useCallback(
    async (noteId: string, content: string): Promise<boolean> => {
      const result = await updateNote({ noteId, content });
      return !!result;
    },
    [updateNote]
  );

  const handleDeleteNote = useCallback(
    async (noteId: string): Promise<boolean> => {
      return await deleteNote(noteId);
    },
    [deleteNote]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Skeleton del composer */}
        <div className="h-12 bg-base-200 rounded animate-pulse"></div>

        {/* Skeleton de notas */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="card bg-base-100 border animate-pulse">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-16 bg-base-300 rounded"></div>
                <div className="h-4 w-24 bg-base-300 rounded"></div>
              </div>
              <div className="h-4 bg-base-300 rounded w-full mb-1"></div>
              <div className="h-4 bg-base-300 rounded w-3/4"></div>
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
      {/* Header con info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconNotebook size={20} className="text-primary" />
          <span className="font-medium">Mis Notas</span>
          <span className="badge badge-ghost badge-sm">
            {notes.length} nota{notes.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Composer */}
      <NoteComposer
        onSubmit={handleCreateNote}
        currentTimestamp={currentVideoTimestamp}
        isSubmitting={isCreating}
      />

      {/* Notes list */}
      <div className="space-y-3">
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onUpdate={handleUpdateNote}
            onDelete={handleDeleteNote}
            onTimestampClick={onTimestampClick}
          />
        ))}

        {notes.length === 0 && (
          <div className="text-center py-12">
            <IconNote size={48} className="mx-auto text-base-content/30 mb-3" />
            <p className="text-base-content/60">
              No tienes notas aún.
              <br />
              ¡Agrega tu primera nota para recordar puntos importantes!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
