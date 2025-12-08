-- Migration: Add granular progress tracking to student_enrollments
-- Description: Adds columns for tracking last accessed lesson and subsection-level progress

-- Add last_accessed_lesson_id column (UUID, nullable)
-- This stores the ID of the last lesson the student was viewing
ALTER TABLE public.student_enrollments 
ADD COLUMN IF NOT EXISTS last_accessed_lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL;

-- Add subsection_progress column (JSONB, default empty object)
-- Structure: {"lesson_uuid": subsection_index_integer}
-- Example: {"abc-123": 2, "def-456": 0} means:
--   - In lesson abc-123, student is at subsection index 2
--   - In lesson def-456, student is at subsection index 0
ALTER TABLE public.student_enrollments 
ADD COLUMN IF NOT EXISTS subsection_progress jsonb DEFAULT '{}'::jsonb;

-- Add index for faster lookups on last_accessed_lesson_id
CREATE INDEX IF NOT EXISTS idx_student_enrollments_last_accessed 
ON public.student_enrollments(last_accessed_lesson_id);

-- Add GIN index for efficient JSONB queries on subsection_progress
CREATE INDEX IF NOT EXISTS idx_student_enrollments_subsection_progress 
ON public.student_enrollments USING GIN (subsection_progress);

-- Add comment for documentation
COMMENT ON COLUMN public.student_enrollments.last_accessed_lesson_id IS 
'UUID of the last lesson the student accessed - used for "resume course" functionality';

COMMENT ON COLUMN public.student_enrollments.subsection_progress IS 
'JSONB map of lesson_id -> highest_completed_subsection_index for granular progress tracking';

