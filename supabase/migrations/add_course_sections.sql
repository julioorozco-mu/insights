-- ============================================================================
-- MIGRACIÓN: Agregar tabla course_sections para soportar curriculum anidado
-- Fecha: 2024-12-07
-- Descripción: Permite agrupar lecciones en secciones (ej: Week 1, Week 2)
-- ============================================================================

-- Crear tabla de secciones de curso (sin foreign key inicialmente)
CREATE TABLE IF NOT EXISTS "public"."course_sections" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "course_id" uuid NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" text,
    "order" integer DEFAULT 0 NOT NULL,
    "is_expanded" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "course_sections_pkey" PRIMARY KEY ("id")
);

-- Agregar foreign key solo si la tabla courses existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'course_sections_course_id_fkey'
        ) THEN
            ALTER TABLE "public"."course_sections"
                ADD CONSTRAINT "course_sections_course_id_fkey" 
                FOREIGN KEY ("course_id") 
                REFERENCES "public"."courses"("id") ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Índice para búsquedas por curso
CREATE INDEX IF NOT EXISTS "idx_course_sections_course_id" 
    ON "public"."course_sections"("course_id");

-- Índice para ordenamiento
CREATE INDEX IF NOT EXISTS "idx_course_sections_order" 
    ON "public"."course_sections"("course_id", "order");

-- Comentario de la tabla
COMMENT ON TABLE "public"."course_sections" IS 'Secciones de cursos para agrupar lecciones (ej: Week 1, Module A)';

-- Agregar columna section_id a lessons si la tabla existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lessons') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'section_id'
        ) THEN
            ALTER TABLE "public"."lessons" ADD COLUMN "section_id" uuid;
        END IF;
        
        -- Agregar foreign key si no existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'lessons_section_id_fkey'
        ) THEN
            ALTER TABLE "public"."lessons"
                ADD CONSTRAINT "lessons_section_id_fkey" 
                FOREIGN KEY ("section_id") 
                REFERENCES "public"."course_sections"("id") 
                ON DELETE SET NULL;
        END IF;
        
        -- Índice para búsquedas por sección
        CREATE INDEX IF NOT EXISTS "idx_lessons_section_id" ON "public"."lessons"("section_id");
        
        -- Comentario de la columna
        COMMENT ON COLUMN "public"."lessons"."section_id" IS 'Sección a la que pertenece la lección (opcional)';
    END IF;
END $$;

-- Trigger para actualizar updated_at (solo si la función existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = 'update_course_sections_updated_at'
        ) THEN
            CREATE TRIGGER "update_course_sections_updated_at"
                BEFORE UPDATE ON "public"."course_sections"
                FOR EACH ROW
                EXECUTE FUNCTION "public"."update_updated_at_column"();
        END IF;
    END IF;
END $$;

-- ============================================================================
-- RLS Policies para course_sections
-- ============================================================================

ALTER TABLE "public"."course_sections" ENABLE ROW LEVEL SECURITY;

-- Policy: Lectura pública de secciones
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'course_sections_select_all'
    ) THEN
        CREATE POLICY "course_sections_select_all" ON "public"."course_sections"
            FOR SELECT USING (true);
    END IF;
END $$;

-- Policy: Insert/Update/Delete para usuarios autenticados
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'course_sections_manage_authenticated'
    ) THEN
        CREATE POLICY "course_sections_manage_authenticated" ON "public"."course_sections"
            FOR ALL
            USING (auth.uid() IS NOT NULL)
            WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;
