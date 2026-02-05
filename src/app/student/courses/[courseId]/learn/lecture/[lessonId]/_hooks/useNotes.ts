'use client';

import useSWR from 'swr';
import { useCallback, useState } from 'react';
import type {
  Note,
  NotesResponse,
  CreateNoteInput,
  UpdateNoteInput,
} from './types';

// =============================================================================
// FETCHER
// =============================================================================

const fetcher = async (url: string): Promise<NotesResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(error.error || 'Error al obtener notas');
  }
  return res.json();
};

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

interface UseNotesOptions {
  lessonId: string;
  courseId: string;
}

interface UseNotesReturn {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createNote: (input: Omit<CreateNoteInput, 'lessonId' | 'courseId'>) => Promise<Note | null>;
  updateNote: (input: UpdateNoteInput) => Promise<Note | null>;
  deleteNote: (noteId: string) => Promise<boolean>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

export function useNotes({ lessonId, courseId }: UseNotesOptions): UseNotesReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // SWR key
  const swrKey = lessonId
    ? `/api/student/notes?lessonId=${lessonId}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<NotesResponse>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // Cache por 30s para contenido semi-estático
      errorRetryCount: 2,
      shouldRetryOnError: (error: any) => {
        // No retry en errores de autenticación o permisos
        return error?.status !== 401 && error?.status !== 403 && error?.status !== 404;
      },
    }
  );

  // Refetch manual
  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // Crear nota
  const createNote = useCallback(
    async (input: Omit<CreateNoteInput, 'lessonId' | 'courseId'>): Promise<Note | null> => {
      setIsCreating(true);
      try {
        const res = await fetch(`/api/student/notes?lessonId=${lessonId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: input.content,
            video_timestamp: input.videoTimestamp ?? 0,
            course_id: courseId,
            lesson_id: lessonId,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error al crear nota');
        }

        const { note } = await res.json();

        // Optimistic update: agregar la nueva nota al principio (más reciente primero)
        mutate(
          (currentData) => {
            if (!currentData) return currentData;
            return {
              ...currentData,
              notes: [note, ...currentData.notes],
            };
          },
          false // No revalidate inmediatamente
        );

        return note;
      } catch (err) {
        console.error('[useNotes] Error creating note:', err);
        // Rollback al estado anterior en caso de error
        if (data) {
          mutate(data, false);
        }
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [lessonId, courseId, mutate]
  );

  // Actualizar nota
  const updateNote = useCallback(
    async (input: UpdateNoteInput): Promise<Note | null> => {
      setIsUpdating(true);
      try {
        const res = await fetch('/api/student/notes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            noteId: input.noteId,
            content: input.content,
            video_timestamp: input.videoTimestamp,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error al actualizar nota');
        }

        const { note } = await res.json();

        // Optimistic update con rollback en caso de error
        mutate(
          (currentData) => {
            if (!currentData) return currentData;
            return {
              ...currentData,
              notes: currentData.notes.map((n) =>
                n.id === note.id ? note : n
              ),
            };
          },
          false // No revalidate inmediatamente
        );

        return note;
      } catch (err) {
        console.error('[useNotes] Error updating note:', err);
        // Rollback al estado anterior en caso de error
        if (data) {
          mutate(data, false);
        }
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [mutate]
  );

  // Eliminar nota
  const deleteNote = useCallback(
    async (noteId: string): Promise<boolean> => {
      setIsDeleting(true);
      try {
        const res = await fetch(`/api/student/notes?noteId=${noteId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error al eliminar nota');
        }

        // Optimistic update con rollback en caso de error
        mutate(
          (currentData) => {
            if (!currentData) return currentData;
            return {
              ...currentData,
              notes: currentData.notes.filter((n) => n.id !== noteId),
            };
          },
          false // No revalidate inmediatamente
        );

        return true;
      } catch (err) {
        console.error('[useNotes] Error deleting note:', err);
        // Rollback al estado anterior en caso de error
        if (data) {
          mutate(data, false);
        }
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [mutate]
  );

  return {
    notes: data?.notes ?? [],
    isLoading,
    error: error?.message ?? null,
    refetch,
    createNote,
    updateNote,
    deleteNote,
    isCreating,
    isUpdating,
    isDeleting,
  };
}
