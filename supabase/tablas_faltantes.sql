-- =====================================================
-- TABLAS FALTANTES - MicroCert by Marca UNACH
-- =====================================================
-- 
-- ESTADO: ✅ TODAS LAS TABLAS YA ESTÁN CREADAS
-- 
-- Este archivo es solo de REFERENCIA.
-- NO ejecutar - las tablas ya existen en Supabase.
--
-- Tablas creadas:
-- - scheduled_emails (con tipos ENUM)
-- - certificate_downloads
-- - Columnas de perfil público en 'teachers'
--
-- =====================================================

/*
-- =====================================================
-- 1. TABLA: scheduled_emails (YA EXISTE)
-- =====================================================

CREATE TYPE "public"."scheduled_email_type" AS ENUM ('lesson', 'course');
CREATE TYPE "public"."scheduled_email_status" AS ENUM ('pending', 'sent', 'cancelled', 'failed');

CREATE TABLE IF NOT EXISTS "public"."scheduled_emails" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "public"."scheduled_email_type" NOT NULL,
    "lesson_id" "uuid",
    "course_id" "uuid",
    "lesson_title" character varying(255) NOT NULL,
    "course_title" character varying(255),
    "scheduled_date" timestamp with time zone NOT NULL,
    "recipients" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "status" "public"."scheduled_email_status" DEFAULT 'pending'::"public"."scheduled_email_status" NOT NULL,
    "sent_count" integer DEFAULT 0,
    "failed_count" integer DEFAULT 0,
    "created_by" "uuid" NOT NULL,
    "sent_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "cancelled_by" "uuid",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."scheduled_emails" OWNER TO "postgres";

COMMENT ON TABLE "public"."scheduled_emails" IS 'Correos programados para recordatorios de lecciones y cursos';

-- Primary Key
ALTER TABLE ONLY "public"."scheduled_emails"
    ADD CONSTRAINT "scheduled_emails_pkey" PRIMARY KEY ("id");

-- Índices
CREATE INDEX "idx_scheduled_emails_status" ON "public"."scheduled_emails" USING "btree" ("status");
CREATE INDEX "idx_scheduled_emails_scheduled_date" ON "public"."scheduled_emails" USING "btree" ("scheduled_date");
CREATE INDEX "idx_scheduled_emails_lesson" ON "public"."scheduled_emails" USING "btree" ("lesson_id");
CREATE INDEX "idx_scheduled_emails_course" ON "public"."scheduled_emails" USING "btree" ("course_id");

-- Foreign Keys
ALTER TABLE ONLY "public"."scheduled_emails"
    ADD CONSTRAINT "scheduled_emails_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."scheduled_emails"
    ADD CONSTRAINT "scheduled_emails_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."scheduled_emails"
    ADD CONSTRAINT "scheduled_emails_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."scheduled_emails"
    ADD CONSTRAINT "scheduled_emails_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- Trigger para updated_at
CREATE TRIGGER "update_scheduled_emails_updated_at"
    BEFORE UPDATE ON "public"."scheduled_emails"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_updated_at_column"();

-- RLS Policies
ALTER TABLE "public"."scheduled_emails" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduled_emails_select_policy" ON "public"."scheduled_emails"
    FOR SELECT USING (true);

CREATE POLICY "scheduled_emails_insert_policy" ON "public"."scheduled_emails"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."users"
            WHERE id = auth.uid()
            AND role IN ('admin', 'teacher', 'superadmin')
        )
    );

CREATE POLICY "scheduled_emails_update_policy" ON "public"."scheduled_emails"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "public"."users"
            WHERE id = auth.uid()
            AND role IN ('admin', 'teacher', 'superadmin')
        )
    );


-- =====================================================
-- 2. TABLA: certificate_downloads
-- Registro de descargas de certificados
-- =====================================================

CREATE TABLE IF NOT EXISTS "public"."certificate_downloads" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "student_name" character varying(255) NOT NULL,
    "student_email" character varying(255),
    "certificate_id" "uuid",
    "downloaded_at" timestamp with time zone DEFAULT "now"(),
    "manually_marked" boolean DEFAULT false,
    "marked_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."certificate_downloads" OWNER TO "postgres";

COMMENT ON TABLE "public"."certificate_downloads" IS 'Registro de descargas de certificados por estudiantes';

-- Primary Key
ALTER TABLE ONLY "public"."certificate_downloads"
    ADD CONSTRAINT "certificate_downloads_pkey" PRIMARY KEY ("id");

-- Unique constraint (un estudiante solo puede descargar un certificado por curso una vez)
ALTER TABLE ONLY "public"."certificate_downloads"
    ADD CONSTRAINT "certificate_downloads_course_student_key" UNIQUE ("course_id", "student_id");

-- Índices
CREATE INDEX "idx_certificate_downloads_course" ON "public"."certificate_downloads" USING "btree" ("course_id");
CREATE INDEX "idx_certificate_downloads_student" ON "public"."certificate_downloads" USING "btree" ("student_id");
CREATE INDEX "idx_certificate_downloads_date" ON "public"."certificate_downloads" USING "btree" ("downloaded_at");

-- Foreign Keys
ALTER TABLE ONLY "public"."certificate_downloads"
    ADD CONSTRAINT "certificate_downloads_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."certificate_downloads"
    ADD CONSTRAINT "certificate_downloads_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."certificate_downloads"
    ADD CONSTRAINT "certificate_downloads_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."certificate_downloads"
    ADD CONSTRAINT "certificate_downloads_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- RLS Policies
ALTER TABLE "public"."certificate_downloads" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certificate_downloads_select_policy" ON "public"."certificate_downloads"
    FOR SELECT USING (true);

CREATE POLICY "certificate_downloads_insert_policy" ON "public"."certificate_downloads"
    FOR INSERT WITH CHECK (
        auth.uid() = student_id OR
        EXISTS (
            SELECT 1 FROM "public"."users"
            WHERE id = auth.uid()
            AND role IN ('admin', 'teacher', 'superadmin')
        )
    );

CREATE POLICY "certificate_downloads_delete_policy" ON "public"."certificate_downloads"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "public"."users"
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin')
        )
    );


-- =====================================================
-- 3. COLUMNAS ADICIONALES PARA PERFIL PÚBLICO EN users
-- Campos para el perfil público de usuarios/teachers
-- =====================================================

ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS "cover_image_url" "text",
ADD COLUMN IF NOT EXISTS "about_me" "text",
ADD COLUMN IF NOT EXISTS "favorite_books" "text"[] DEFAULT '{}'::"text"[],
ADD COLUMN IF NOT EXISTS "published_books" "jsonb" DEFAULT '[]'::"jsonb",
ADD COLUMN IF NOT EXISTS "external_courses" "jsonb" DEFAULT '[]'::"jsonb",
ADD COLUMN IF NOT EXISTS "achievements" "text"[] DEFAULT '{}'::"text"[],
ADD COLUMN IF NOT EXISTS "services" "text"[] DEFAULT '{}'::"text"[];

COMMENT ON COLUMN "public"."users"."cover_image_url" IS 'URL de la imagen de portada del perfil';
COMMENT ON COLUMN "public"."users"."about_me" IS 'Descripción extendida "Acerca de mí"';
COMMENT ON COLUMN "public"."users"."favorite_books" IS 'Lista de libros favoritos';
COMMENT ON COLUMN "public"."users"."published_books" IS 'Libros publicados por el usuario (JSON: title, url, year)';
COMMENT ON COLUMN "public"."users"."external_courses" IS 'Cursos externos impartidos (JSON: title, url, platform)';
COMMENT ON COLUMN "public"."users"."achievements" IS 'Lista de logros y reconocimientos';
COMMENT ON COLUMN "public"."users"."services" IS 'Lista de servicios que ofrece';


-- =====================================================
-- FIN DEL ARCHIVO DE REFERENCIA
-- =====================================================
*/
