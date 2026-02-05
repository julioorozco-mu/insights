'use client';

import React, { useCallback, useState, memo } from 'react';
import {
  IconNote,
  IconClock,
  IconLoader2,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';
import { useNotes } from '../../_hooks';
import { formatTimestamp } from '../../utils/lessonPlayerHelpers';

// ===== TYPES =====
interface NotesTabProps {
  lessonId: string;
  courseId: string;
  currentVideoTimestamp?: number;
  onTimestampClick?: (timestamp: number) => void;
  isPreviewMode?: boolean;
}

interface NoteCardProps {
  note: {
    id: string;
    content: string;
    video_timestamp: number;
  };
  onTimestampClick?: (timestamp: number) => void;
  isPreviewMode?: boolean;
  editingNoteId: string | null;
  editingNoteContent: string;
  setEditingNoteId: (id: string | null) => void;
  setEditingNoteContent: (content: string) => void;
  onUpdateNote: (noteId: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  isUpdating: boolean;
}

// ===== NOTE CARD COMPONENT =====
const NoteCard = memo(function NoteCard({
  note,
  onTimestampClick,
  isPreviewMode,
  editingNoteId,
  editingNoteContent,
  setEditingNoteId,
  setEditingNoteContent,
  onUpdateNote,
  onDeleteNote,
  isUpdating,
}: NoteCardProps) {
  return (
    <div
      className="p-4 border rounded-lg hover:shadow-sm transition-shadow"
      style={{ borderColor: 'rgba(15, 23, 42, 0.1)' }}
    >
      {editingNoteId === note.id ? (
        <div>
          <textarea
            value={editingNoteContent}
            onChange={(e) => setEditingNoteContent(e.target.value)}
            className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={3}
            style={{ borderColor: 'rgba(15, 23, 42, 0.1)' }}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setEditingNoteId(null);
                setEditingNoteContent("");
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={() => onUpdateNote(note.id)}
              disabled={!editingNoteContent.trim() || isUpdating}
              className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-purple-700"
            >
              Guardar cambios
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <button
                onClick={() => onTimestampClick?.(note.video_timestamp)}
                className="text-sm text-purple-600 bg-purple-50 px-2 py-0.5 rounded mb-2 hover:bg-purple-100"
                title="Ir a este momento del video"
              >
                {formatTimestamp(note.video_timestamp)}
              </button>
              <p className="text-gray-700">{note.content}</p>
            </div>
            {!isPreviewMode && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingNoteId(note.id);
                    setEditingNoteContent(note.content);
                  }}
                  className="p-1.5 text-gray-400 hover:text-purple-600 rounded transition-colors"
                  title="Editar nota"
                >
                  <IconEdit size={16} />
                </button>
                <button
                  onClick={() => onDeleteNote(note.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                  title="Eliminar nota"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});

// ===== MAIN COMPONENT =====
/**
 * Tab de Notas personales
 * Lazy loaded via next/dynamic con ssr: false
 * Usa SWR para data fetching optimizado
 */
function NotesTab({
  lessonId,
  courseId,
  currentVideoTimestamp = 0,
  onTimestampClick,
  isPreviewMode = false,
}: NotesTabProps) {
  const {
    notes,
    isLoading,
    error,
    createNote,
    updateNote,
    deleteNote,
    isCreating,
    isUpdating,
  } = useNotes({
    lessonId,
    courseId,
  });

  // Local state for UI
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");

  const handleCreateNote = useCallback(async () => {
    if (!newNoteContent.trim()) return;

    const result = await createNote({
      content: newNoteContent.trim(),
      videoTimestamp: Math.floor(currentVideoTimestamp),
    });

    if (result) {
      setNewNoteContent("");
    }
  }, [createNote, newNoteContent, currentVideoTimestamp]);

  const handleUpdateNote = useCallback(async (noteId: string) => {
    if (!editingNoteContent.trim()) return;

    const result = await updateNote({
      noteId,
      content: editingNoteContent.trim(),
    });

    if (result) {
      setEditingNoteId(null);
      setEditingNoteContent("");
    }
  }, [updateNote, editingNoteContent]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    await deleteNote(noteId);
  }, [deleteNote]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="max-w-4xl animate-pulse">
        <div className="h-20 bg-gray-100 rounded-lg mb-6"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-lg mb-4" style={{ borderColor: 'rgba(15, 23, 42, 0.1)' }}>
            <div className="h-6 bg-gray-100 rounded w-16 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-full mb-1"></div>
            <div className="h-4 bg-gray-100 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl animate-in fade-in duration-200">
      {/* New Note Input */}
      {!isPreviewMode && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
            <IconClock size={14} />
            <span>Crear una nueva nota en {formatTimestamp(currentVideoTimestamp)}</span>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleCreateNote()}
              placeholder="Escribe tu nota aquí..."
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              style={{ borderColor: 'rgba(15, 23, 42, 0.1)' }}
            />
            <button
              onClick={handleCreateNote}
              disabled={!newNoteContent.trim() || isCreating}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              {isCreating ? (
                <IconLoader2 className="w-4 h-4 animate-spin" />
              ) : (
                <IconNote size={18} />
              )}
              <span className="hidden sm:inline">Guardar</span>
            </button>
          </div>
        </div>
      )}

      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Modo Vista Previa:</strong> Puedes ver las notas existentes, pero no puedes crear, editar ni eliminar notas.
          </p>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
          <IconNote size={48} className="mb-4 opacity-20" />
          <h3 className="text-lg font-medium text-gray-900">Sin notas todavía</h3>
          <p>Crea tu primera nota para recordar los puntos importantes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={{
                id: note.id,
                content: note.content,
                video_timestamp: note.videoTimestamp,
              }}
              onTimestampClick={onTimestampClick}
              isPreviewMode={isPreviewMode}
              editingNoteId={editingNoteId}
              editingNoteContent={editingNoteContent}
              setEditingNoteId={setEditingNoteId}
              setEditingNoteContent={setEditingNoteContent}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(NotesTab);
