import { useState, useCallback } from "react";
import type { CourseReview } from "@/components/course/CourseRatingModal";

/**
 * Hook helper para manejar el estado del modal de calificación de cursos
 * 
 * @example
 * ```tsx
 * const { isOpen, openModal, closeModal, handleRatingSubmitted } = useCourseRating({
 *   courseId: "uuid",
 *   userId: user.id,
 *   onSuccess: (review) => toast.success("¡Gracias por tu calificación!")
 * });
 * 
 * return (
 *   <>
 *     <button onClick={openModal}>Calificar</button>
 *     <CourseRatingModal isOpen={isOpen} onClose={closeModal} ... />
 *   </>
 * );
 * ```
 */
export function useCourseRating({
  courseId,
  userId,
  onSuccess,
  onDelete,
}: {
  courseId: string;
  userId: string;
  onSuccess?: (review: CourseReview) => void;
  onDelete?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  const handleRatingSubmitted = useCallback(
    (review: CourseReview) => {
      onSuccess?.(review);
      closeModal();
    },
    [onSuccess, closeModal]
  );

  const handleRatingDeleted = useCallback(() => {
    onDelete?.();
    closeModal();
  }, [onDelete, closeModal]);

  return {
    isOpen,
    openModal,
    closeModal,
    handleRatingSubmitted,
    handleRatingDeleted,
  };
}

