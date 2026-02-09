-- Add attempt_count column to survey_responses to track quiz retry attempts
-- Each student gets a maximum of 2 attempts per quiz
ALTER TABLE "public"."survey_responses"
  ADD COLUMN IF NOT EXISTS "attempt_count" integer NOT NULL DEFAULT 1;

-- Add a check constraint to enforce the 2-attempt limit at the database level
ALTER TABLE "public"."survey_responses"
  ADD CONSTRAINT "chk_survey_responses_max_attempts" CHECK (attempt_count >= 1 AND attempt_count <= 2);
