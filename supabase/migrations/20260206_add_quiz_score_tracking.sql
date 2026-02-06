-- Add score tracking columns to survey_responses for quiz grading
-- This enables filtering by passing grade (>=60%) in the dashboard

ALTER TABLE "public"."survey_responses"
  ADD COLUMN IF NOT EXISTS "score" integer,
  ADD COLUMN IF NOT EXISTS "total_questions" integer,
  ADD COLUMN IF NOT EXISTS "percentage" numeric(5,2);

-- Index for efficient dashboard queries filtering by course + user + percentage
CREATE INDEX IF NOT EXISTS "idx_survey_responses_course_user_pct"
  ON "public"."survey_responses" ("course_id", "user_id", "percentage");

COMMENT ON COLUMN "public"."survey_responses"."score" IS 'Number of correct answers';
COMMENT ON COLUMN "public"."survey_responses"."total_questions" IS 'Total number of questions in the quiz';
COMMENT ON COLUMN "public"."survey_responses"."percentage" IS 'Score as percentage (0-100)';
