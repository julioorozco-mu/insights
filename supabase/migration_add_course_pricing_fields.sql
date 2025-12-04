-- Migration: Add pricing and new course fields
-- Description: Adds pricing fields, product status, hide course, and organisation fields to courses table
-- Date: 2025-01-XX

-- Add new columns to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS sale_percentage INTEGER DEFAULT 0 CHECK (sale_percentage >= 0 AND sale_percentage <= 100),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS product_status VARCHAR(20) DEFAULT 'draft' CHECK (product_status IN ('draft', 'published', 'archived')),
ADD COLUMN IF NOT EXISTS hide_course BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES universities(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS specialisation_id UUID REFERENCES specialisations(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_courses_product_status ON courses(product_status);
CREATE INDEX IF NOT EXISTS idx_courses_university_id ON courses(university_id);
CREATE INDEX IF NOT EXISTS idx_courses_specialisation_id ON courses(specialisation_id);
CREATE INDEX IF NOT EXISTS idx_courses_price ON courses(price) WHERE price IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN courses.price IS 'Price of the course in the specified currency';
COMMENT ON COLUMN courses.sale_percentage IS 'Discount percentage (0-100)';
COMMENT ON COLUMN courses.currency IS 'Currency code (ISO 4217, e.g., USD, EUR)';
COMMENT ON COLUMN courses.product_status IS 'Publication status: draft, published, or archived';
COMMENT ON COLUMN courses.hide_course IS 'Whether the course should be hidden from public listings';
COMMENT ON COLUMN courses.university_id IS 'Reference to the university/organization';
COMMENT ON COLUMN courses.specialisation_id IS 'Reference to the specialisation/field of study';

-- Note: If universities and specialisations tables don't exist yet, you may need to create them first:
-- 
-- CREATE TABLE IF NOT EXISTS universities (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );
--
-- CREATE TABLE IF NOT EXISTS specialisations (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

