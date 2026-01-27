-- Migration: Add CURP field to users table
-- Purpose: Store CURP (Clave Única de Registro de Población) for student registration
-- Date: 2026-01-27

-- Add CURP column to users table
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS "curp" character varying(18);

-- Add unique constraint to ensure CURP is unique
CREATE UNIQUE INDEX IF NOT EXISTS "users_curp_unique_idx" 
ON "public"."users" ("curp") 
WHERE "curp" IS NOT NULL;

-- Add comment to document the field
COMMENT ON COLUMN "public"."users"."curp" IS 'CURP (Clave Única de Registro de Población) - 18 caracteres alfanuméricos';
