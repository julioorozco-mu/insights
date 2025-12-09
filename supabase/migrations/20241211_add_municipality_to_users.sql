-- Migration: Add municipality field to users table
-- Purpose: Store municipality/city information for users
-- Date: 2024-12-11

-- Add municipality column to users table
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS "municipality" character varying(255);

-- Add comment to document the field
COMMENT ON COLUMN "public"."users"."municipality" IS 'Municipality or city where the user is located';

