-- Migration: Agregar campos para cursos públicos con pricing
-- Fecha: 2025-12-03
-- Descripción: Agrega campos para pricing, organizaciones, y estado de publicación

-- Agregar campos de pricing
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sale_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- Agregar campos de organizaciones
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS university TEXT,
ADD COLUMN IF NOT EXISTS specialization TEXT;

-- Agregar índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_courses_is_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_courses_university ON courses(university);
CREATE INDEX IF NOT EXISTS idx_courses_specialization ON courses(specialization);
CREATE INDEX IF NOT EXISTS idx_courses_price ON courses(price);

-- Comentarios para documentación
COMMENT ON COLUMN courses.price IS 'Precio base del curso en USD';
COMMENT ON COLUMN courses.sale_percentage IS 'Porcentaje de descuento (0-100)';
COMMENT ON COLUMN courses.is_published IS 'Si el curso está publicado y visible para estudiantes';
COMMENT ON COLUMN courses.is_hidden IS 'Si el curso está oculto temporalmente';
COMMENT ON COLUMN courses.university IS 'Universidad asociada al curso';
COMMENT ON COLUMN courses.specialization IS 'Especialización o programa del curso';

