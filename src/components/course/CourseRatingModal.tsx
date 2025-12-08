"use client";

import { useState, useEffect, useCallback } from "react";
import { IconX, IconStar, IconLoader2, IconTrash } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface CourseReview {
  id: string;
  course_id: string;
  student_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  userId: string;
  courseName?: string;
  onRatingSubmitted?: (review: CourseReview) => void;
  onRatingDeleted?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "Malo",
  2: "Regular", 
  3: "Bueno",
  4: "Muy bueno",
  5: "Excelente",
};

export default function CourseRatingModal({
  isOpen,
  onClose,
  courseId,
  userId,
  courseName,
  onRatingSubmitted,
  onRatingDeleted,
}: CourseRatingModalProps) {
  // State
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [existingReview, setExistingReview] = useState<CourseReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCommentField, setShowCommentField] = useState(false);

  // Fetch existing review when modal opens
  const fetchExistingReview = useCallback(async () => {
    if (!courseId || !userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/student/rating?courseId=${courseId}&userId=${userId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.review) {
          setExistingReview(data.review);
          setRating(data.review.rating);
          setComment(data.review.comment || "");
          setShowCommentField(true);
        } else {
          setExistingReview(null);
          setRating(0);
          setComment("");
          setShowCommentField(false);
        }
      }
    } catch (err) {
      console.error("Error fetching review:", err);
      setError("Error al cargar la reseña");
    } finally {
      setLoading(false);
    }
  }, [courseId, userId]);

  useEffect(() => {
    if (isOpen) {
      fetchExistingReview();
    }
  }, [isOpen, fetchExistingReview]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay to allow animation
      const timer = setTimeout(() => {
        setHoverRating(0);
        setError(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle rating selection
  const handleRatingClick = (value: number) => {
    setRating(value);
    // Show comment field after selecting rating
    if (!showCommentField) {
      setShowCommentField(true);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (rating === 0) {
      setError("Por favor selecciona una calificación");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/student/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          userId,
          rating,
          comment: comment.trim() || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onRatingSubmitted?.(data.review);
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || "Error al guardar la reseña");
      }
    } catch (err) {
      console.error("Error saving review:", err);
      setError("Error al guardar la reseña");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar tu reseña?")) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/student/rating?courseId=${courseId}&userId=${userId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        onRatingDeleted?.();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || "Error al eliminar la reseña");
      }
    } catch (err) {
      console.error("Error deleting review:", err);
      setError("Error al eliminar la reseña");
    } finally {
      setDeleting(false);
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  const displayRating = hoverRating || rating;
  const isEditing = !!existingReview;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-lg shadow-2xl w-full max-w-lg pointer-events-auto animate-in zoom-in-95 fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors z-10"
            disabled={saving || deleting}
          >
            <IconX size={24} />
          </button>

          {/* Content */}
          <div className="p-8 pt-12">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <IconLoader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                  {isEditing ? "Editar tu reseña" : "¿Cómo calificarías este curso?"}
                </h2>

                {/* Subtitle / Rating Label */}
                <p className="text-gray-600 text-center mb-6 h-6">
                  {displayRating > 0 
                    ? RATING_LABELS[displayRating] 
                    : "Elegir calificación"}
                </p>

                {/* Star Rating */}
                <div className="flex justify-center gap-2 mb-8">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRatingClick(value)}
                      onMouseEnter={() => setHoverRating(value)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
                      disabled={saving || deleting}
                    >
                      <IconStar
                        size={48}
                        className={cn(
                          "transition-colors duration-150",
                          value <= displayRating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-yellow-400 fill-transparent stroke-2"
                        )}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>

                {/* Comment Field (shows after rating is selected) */}
                {showCommentField && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Escribe una reseña opcional..."
                      maxLength={2000}
                      rows={4}
                      className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow text-gray-700 placeholder-gray-400"
                      disabled={saving || deleting}
                    />
                    <p className="text-xs text-gray-400 text-right mt-1">
                      {comment.length}/2000
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 text-center">{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex flex-col gap-3">
                  {/* Main Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      disabled={saving || deleting}
                      className="flex-1 px-6 py-3 text-gray-700 font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={rating === 0 || saving || deleting}
                      className="flex-1 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {saving && <IconLoader2 className="w-4 h-4 animate-spin" />}
                      {isEditing ? "Actualizar reseña" : "Guardar y continuar"}
                    </button>
                  </div>

                  {/* Delete Button (only for existing reviews) */}
                  {isEditing && (
                    <button
                      onClick={handleDelete}
                      disabled={saving || deleting}
                      className="w-full px-4 py-2 text-red-600 text-sm font-medium hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {deleting ? (
                        <IconLoader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <IconTrash size={16} />
                      )}
                      Eliminar reseña
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

