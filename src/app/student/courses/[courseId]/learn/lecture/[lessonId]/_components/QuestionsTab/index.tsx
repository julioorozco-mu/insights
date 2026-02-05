'use client';

import React, { useCallback, memo } from 'react';
import {
  IconMessageCircle,
  IconClock,
  IconSend,
  IconLoader2,
  IconThumbUp,
  IconCheck,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuestions } from '../../_hooks';
import type { QuestionSortBy, Question as QuestionType } from '../../_hooks';
import { formatTimestamp } from '../../utils/lessonPlayerHelpers';

// ===== TYPES =====
interface QuestionsTabProps {
  lessonId: string;
  courseId: string;
  currentUserId?: string;
  currentVideoTimestamp?: number;
  onTimestampClick?: (timestamp: number) => void;
  isPreviewMode?: boolean;
  userEmail?: string;
}

interface QuestionCardProps {
  question: QuestionType & { answers?: any[] };
  currentUserId?: string;
  onTimestampClick?: (timestamp: number) => void;
  isPreviewMode?: boolean;
  expandedQuestionId: string | null;
  setExpandedQuestionId: (id: string | null) => void;
  replyingToId: string | null;
  setReplyingToId: (id: string | null) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  onSubmitReply: (questionId: string) => Promise<void>;
  submittingReply: boolean;
  userEmail?: string;
  replyError?: string | null;
  clearReplyError?: () => void;
  // Edit/Delete props
  editingQuestionId: string | null;
  editingQuestionText: string;
  setEditingQuestionId: (id: string | null) => void;
  setEditingQuestionText: (text: string) => void;
  onUpdateQuestion: (questionId: string) => Promise<void>;
  onDeleteQuestion: (questionId: string) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
}

// ===== QUESTION CARD COMPONENT =====
const QuestionCard = memo(function QuestionCard({
  question,
  currentUserId,
  onTimestampClick,
  isPreviewMode,
  expandedQuestionId,
  setExpandedQuestionId,
  replyingToId,
  setReplyingToId,
  replyText,
  setReplyText,
  onSubmitReply,
  submittingReply,
  userEmail,
  replyError,
  clearReplyError,
  editingQuestionId,
  editingQuestionText,
  setEditingQuestionId,
  setEditingQuestionText,
  onUpdateQuestion,
  onDeleteQuestion,
  isUpdating,
  isDeleting,
}: QuestionCardProps) {
  // Check if current user is the author
  const isAuthor = !!(currentUserId && question.author?.id === currentUserId);
  // Can only edit/delete if no answers
  const canEditOrDelete = isAuthor && question.answersCount === 0;

  return (
    <div className="border-b pb-6" style={{ borderColor: 'rgba(15, 23, 42, 0.1)' }}>
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold shrink-0">
          {question.author?.avatarUrl ? (
            <Image
              src={question.author.avatarUrl}
              alt=""
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            question.author?.name?.charAt(0).toUpperCase() || "?"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900">{question.author?.name || "Usuario"}</span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(question.createdAt), { addSuffix: true, locale: es })}
              </span>
              {question.videoTimestamp > 0 && (
                <button
                  onClick={() => onTimestampClick?.(question.videoTimestamp)}
                  className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded hover:bg-purple-100"
                >
                  {formatTimestamp(question.videoTimestamp)}
                </button>
              )}
              {question.isResolved && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded flex items-center gap-1">
                  <IconCheck size={12} />
                  Resuelta
                </span>
              )}
            </div>
            {/* Edit/Delete buttons - only show for author with no answers */}
            {!isPreviewMode && canEditOrDelete && editingQuestionId !== question.id && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingQuestionId(question.id);
                    setEditingQuestionText(question.questionText);
                  }}
                  className="p-1.5 text-gray-400 hover:text-purple-600 rounded transition-colors"
                  title="Editar pregunta"
                >
                  <IconEdit size={16} />
                </button>
                <button
                  onClick={() => onDeleteQuestion(question.id)}
                  disabled={isDeleting}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                  title="Eliminar pregunta"
                >
                  {isDeleting ? (
                    <IconLoader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <IconTrash size={16} />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Question text or edit form */}
          {editingQuestionId === question.id ? (
            <div className="mb-3">
              <textarea
                value={editingQuestionText}
                onChange={(e) => setEditingQuestionText(e.target.value)}
                className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
                style={{ borderColor: 'rgba(15, 23, 42, 0.1)' }}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setEditingQuestionId(null);
                    setEditingQuestionText("");
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onUpdateQuestion(question.id)}
                  disabled={!editingQuestionText.trim() || editingQuestionText.trim().length < 10 || isUpdating}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-purple-700 flex items-center gap-1"
                >
                  {isUpdating && <IconLoader2 className="w-3 h-3 animate-spin" />}
                  Guardar cambios
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 mb-3">{question.questionText}</p>
          )}

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-gray-500">
              <IconThumbUp size={16} />
              <span>{question.upvotes}</span>
            </div>
            <button
              onClick={() => setExpandedQuestionId(expandedQuestionId === question.id ? null : question.id)}
              className="text-gray-500 hover:text-purple-600 transition-colors"
              disabled={isPreviewMode}
            >
              {question.answersCount} respuesta{question.answersCount !== 1 ? 's' : ''}
            </button>
            {!isPreviewMode && (
              <button
                onClick={() => {
                  setReplyingToId(replyingToId === question.id ? null : question.id);
                  setExpandedQuestionId(question.id);
                }}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Responder
              </button>
            )}
          </div>

          {/* Answers - expandible */}
          {expandedQuestionId === question.id && (
            <div className="mt-4 ml-4 pl-4 border-l-2 space-y-4" style={{ borderColor: 'rgba(15, 23, 42, 0.1)' }}>
              {(question.answers || []).map((answer: any) => (
                <div key={answer.id} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${answer.isInstructorAnswer
                    ? "bg-purple-100 text-purple-600"
                    : "bg-gray-100 text-gray-600"
                    }`}>
                    {answer.author?.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">
                        {answer.author?.name || "Usuario"}
                      </span>
                      {answer.isInstructorAnswer && (
                        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                          Instructor
                        </span>
                      )}
                      {answer.isAccepted && (
                        <span className="text-xs text-green-600">
                          <IconCheck size={14} className="inline" /> Aceptada
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(answer.createdAt), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{answer.answerText}</p>
                  </div>
                </div>
              ))}

              {/* Reply Form */}
              {!isPreviewMode && replyingToId === question.id && (
                <div className="flex gap-3 mt-4">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold shrink-0 text-sm">
                    {userEmail?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={replyText}
                      onChange={(e) => {
                        setReplyText(e.target.value);
                        if (replyError) clearReplyError?.();
                      }}
                      placeholder="Escribe tu respuesta (mínimo 5 caracteres)..."
                      className={`w-full p-2 border rounded-lg resize-none text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        replyError ? 'border-red-300 focus:ring-red-500' : ''
                      }`}
                      rows={2}
                      style={{ borderColor: replyError ? undefined : 'rgba(15, 23, 42, 0.1)' }}
                    />
                    {replyError && (
                      <p className="text-xs text-red-500 mt-1">{replyError}</p>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-400">
                        ({replyText.trim().length}/5 mín.)
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setReplyingToId(null);
                            setReplyText("");
                            clearReplyError?.();
                          }}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => onSubmitReply(question.id)}
                          disabled={!replyText.trim() || submittingReply}
                          className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-purple-700 flex items-center gap-1"
                        >
                          {submittingReply && <IconLoader2 className="w-3 h-3 animate-spin" />}
                          Responder
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ===== MAIN COMPONENT =====
/**
 * Tab de Preguntas y Respuestas
 * Lazy loaded via next/dynamic con ssr: false
 * Usa SWR para data fetching optimizado
 */
function QuestionsTab({
  lessonId,
  courseId,
  currentUserId,
  currentVideoTimestamp = 0,
  onTimestampClick,
  isPreviewMode = false,
  userEmail,
}: QuestionsTabProps) {
  const {
    questions,
    isLoading,
    error,
    sortBy,
    setSortBy,
    createQuestion,
    isCreating,
    updateQuestion,
    isUpdating,
    deleteQuestion,
    isDeleting,
    submitAnswer,
    isSubmittingAnswer,
  } = useQuestions({
    lessonId,
    initialSortBy: 'recent',
  });

  // Local state for UI interactions
  const [newQuestionText, setNewQuestionText] = React.useState("");
  const [questionError, setQuestionError] = React.useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = React.useState<string | null>(null);
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState("");
  const [replyError, setReplyError] = React.useState<string | null>(null);
  // Edit state
  const [editingQuestionId, setEditingQuestionId] = React.useState<string | null>(null);
  const [editingQuestionText, setEditingQuestionText] = React.useState("");

  // Constantes de validación (deben coincidir con el backend)
  const MIN_QUESTION_LENGTH = 10;

  const handleCreateQuestion = useCallback(async () => {
    const trimmedText = newQuestionText.trim();

    // Validación cliente
    if (!trimmedText) return;

    if (trimmedText.length < MIN_QUESTION_LENGTH) {
      setQuestionError(`La pregunta debe tener al menos ${MIN_QUESTION_LENGTH} caracteres`);
      return;
    }

    setQuestionError(null);

    const result = await createQuestion({
      questionText: trimmedText,
      videoTimestamp: Math.floor(currentVideoTimestamp),
      courseId,
    });

    if (result) {
      setNewQuestionText("");
    } else {
      setQuestionError("Error al crear la pregunta. Intenta de nuevo.");
    }
  }, [createQuestion, courseId, newQuestionText, currentVideoTimestamp]);

  const handleSubmitReply = useCallback(async (questionId: string) => {
    if (!replyText.trim()) return;

    setReplyError(null);
    const result = await submitAnswer(questionId, replyText);

    if (result.success) {
      setReplyText("");
      setReplyingToId(null);
    } else {
      setReplyError(result.error || 'Error al enviar la respuesta');
    }
  }, [replyText, submitAnswer]);

  const handleUpdateQuestion = useCallback(async (questionId: string) => {
    if (!editingQuestionText.trim() || editingQuestionText.trim().length < 10) return;

    const result = await updateQuestion({
      questionId,
      questionText: editingQuestionText.trim(),
    });

    if (result) {
      setEditingQuestionId(null);
      setEditingQuestionText("");
    }
  }, [updateQuestion, editingQuestionText]);

  const handleDeleteQuestion = useCallback(async (questionId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta pregunta?')) return;

    await deleteQuestion(questionId);
  }, [deleteQuestion]);

  const sortOptions: { key: QuestionSortBy; label: string }[] = [
    { key: 'recent', label: 'Más recientes' },
    { key: 'popular', label: 'Más votadas' },
  ];

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="max-w-4xl animate-pulse">
        <div className="h-24 bg-gray-100 rounded-lg mb-6"></div>
        <div className="flex gap-4 mb-6">
          <div className="h-8 bg-gray-100 rounded w-24"></div>
          <div className="h-8 bg-gray-100 rounded w-24"></div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-b pb-6 mb-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-full mb-1"></div>
                <div className="h-4 bg-gray-100 rounded w-3/4"></div>
              </div>
            </div>
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
      {/* New Question Input */}
      {!isPreviewMode && (
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold shrink-0">
              {userEmail?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1">
              <textarea
                value={newQuestionText}
                onChange={(e) => {
                  setNewQuestionText(e.target.value);
                  // Limpiar error cuando el usuario escribe
                  if (questionError) setQuestionError(null);
                }}
                placeholder={`Haz una pregunta en ${formatTimestamp(currentVideoTimestamp)}...`}
                className={`w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${questionError ? 'border-red-300 focus:ring-red-500' : ''
                  }`}
                rows={3}
                style={{ borderColor: questionError ? undefined : 'rgba(15, 23, 42, 0.1)' }}
              />
              {questionError && (
                <p className="text-xs text-red-500 mt-1">{questionError}</p>
              )}
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <IconClock size={12} />
                  {formatTimestamp(currentVideoTimestamp)}
                  <span className="ml-2 text-gray-400">
                    ({newQuestionText.trim().length}/10 mín.)
                  </span>
                </span>
                <button
                  onClick={handleCreateQuestion}
                  disabled={!newQuestionText.trim() || isCreating}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  {isCreating ? (
                    <IconLoader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <IconSend size={16} />
                  )}
                  Publicar pregunta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Modo Vista Previa:</strong> Puedes ver las preguntas existentes, pero no puedes crear nuevas preguntas ni responder.
          </p>
        </div>
      )}

      {/* Sort Options */}
      <div className="flex gap-4 mb-6 border-b pb-4" style={{ borderColor: 'rgba(15, 23, 42, 0.1)' }}>
        {sortOptions.map((option) => (
          <button
            key={option.key}
            onClick={() => setSortBy(option.key)}
            className={`text-sm font-medium transition-colors ${sortBy === option.key ? "text-purple-600" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
          <IconMessageCircle size={48} className="mb-4 opacity-20" />
          <h3 className="text-lg font-medium text-gray-900">Sin preguntas todavía</h3>
          <p>Sé el primero en preguntar algo sobre esta lección.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question as any}
              currentUserId={currentUserId}
              onTimestampClick={onTimestampClick}
              isPreviewMode={isPreviewMode}
              expandedQuestionId={expandedQuestionId}
              setExpandedQuestionId={setExpandedQuestionId}
              replyingToId={replyingToId}
              setReplyingToId={setReplyingToId}
              replyText={replyText}
              setReplyText={setReplyText}
              onSubmitReply={handleSubmitReply}
              submittingReply={isSubmittingAnswer}
              replyError={replyError}
              clearReplyError={() => setReplyError(null)}
              userEmail={userEmail}
              editingQuestionId={editingQuestionId}
              editingQuestionText={editingQuestionText}
              setEditingQuestionId={setEditingQuestionId}
              setEditingQuestionText={setEditingQuestionText}
              onUpdateQuestion={handleUpdateQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              isUpdating={isUpdating}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(QuestionsTab);
