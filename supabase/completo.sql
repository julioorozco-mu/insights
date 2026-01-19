


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."certificate_availability_mode" AS ENUM (
    'hours_after_start',
    'after_course_end',
    'after_last_lesson'
);


ALTER TYPE "public"."certificate_availability_mode" OWNER TO "postgres";


CREATE TYPE "public"."certificate_element_type" AS ENUM (
    'text',
    'variable',
    'image'
);


ALTER TYPE "public"."certificate_element_type" OWNER TO "postgres";


CREATE TYPE "public"."certificate_orientation" AS ENUM (
    'portrait',
    'landscape'
);


ALTER TYPE "public"."certificate_orientation" OWNER TO "postgres";


CREATE TYPE "public"."certificate_page_size" AS ENUM (
    'letter',
    'legal'
);


ALTER TYPE "public"."certificate_page_size" OWNER TO "postgres";


CREATE TYPE "public"."certificate_variable_key" AS ENUM (
    'studentName',
    'courseTitle',
    'instructorName',
    'completionDate',
    'signatureUrl'
);


ALTER TYPE "public"."certificate_variable_key" OWNER TO "postgres";


CREATE TYPE "public"."difficulty_level" AS ENUM (
    'beginner',
    'intermediate',
    'advanced'
);


ALTER TYPE "public"."difficulty_level" OWNER TO "postgres";


CREATE TYPE "public"."enrollment_rule_type" AS ENUM (
    'before_start',
    'date_range',
    'anytime'
);


ALTER TYPE "public"."enrollment_rule_type" OWNER TO "postgres";


CREATE TYPE "public"."file_category" AS ENUM (
    'student',
    'teacher',
    'lesson',
    'course',
    'general'
);


ALTER TYPE "public"."file_category" OWNER TO "postgres";


CREATE TYPE "public"."gender_type" AS ENUM (
    'male',
    'female',
    'other'
);


ALTER TYPE "public"."gender_type" OWNER TO "postgres";


CREATE TYPE "public"."lesson_type" AS ENUM (
    'video',
    'livestream',
    'hybrid'
);


ALTER TYPE "public"."lesson_type" OWNER TO "postgres";


CREATE TYPE "public"."live_status" AS ENUM (
    'idle',
    'active',
    'ended'
);


ALTER TYPE "public"."live_status" OWNER TO "postgres";


CREATE TYPE "public"."per_lesson_mode" AS ENUM (
    'complete_all',
    'quizzes_only',
    'none'
);


ALTER TYPE "public"."per_lesson_mode" OWNER TO "postgres";


CREATE TYPE "public"."question_type" AS ENUM (
    'text',
    'short_text',
    'long_text',
    'number',
    'single_choice',
    'multiple_choice',
    'dropdown',
    'quiz',
    'file_upload',
    'image_choice',
    'video_response'
);


ALTER TYPE "public"."question_type" OWNER TO "postgres";


CREATE TYPE "public"."resource_category" AS ENUM (
    'document',
    'video',
    'image',
    'other'
);


ALTER TYPE "public"."resource_category" OWNER TO "postgres";


CREATE TYPE "public"."scheduled_email_status" AS ENUM (
    'pending',
    'sent',
    'cancelled',
    'failed'
);


ALTER TYPE "public"."scheduled_email_status" OWNER TO "postgres";


CREATE TYPE "public"."scheduled_email_type" AS ENUM (
    'lesson',
    'course'
);


ALTER TYPE "public"."scheduled_email_type" OWNER TO "postgres";


CREATE TYPE "public"."streaming_type" AS ENUM (
    'agora',
    'external_link'
);


ALTER TYPE "public"."streaming_type" OWNER TO "postgres";


CREATE TYPE "public"."survey_type" AS ENUM (
    'entry',
    'exit',
    'lesson'
);


ALTER TYPE "public"."survey_type" OWNER TO "postgres";


CREATE TYPE "public"."test_attempt_status" AS ENUM (
    'in_progress',
    'completed',
    'abandoned',
    'timed_out'
);


ALTER TYPE "public"."test_attempt_status" OWNER TO "postgres";


CREATE TYPE "public"."test_question_type" AS ENUM (
    'multiple_choice',
    'multiple_answer',
    'true_false',
    'open_ended',
    'poll',
    'reorder',
    'match',
    'drag_drop',
    'sequencing'
);


ALTER TYPE "public"."test_question_type" OWNER TO "postgres";


CREATE TYPE "public"."test_status" AS ENUM (
    'draft',
    'published',
    'archived'
);


ALTER TYPE "public"."test_status" OWNER TO "postgres";


CREATE TYPE "public"."test_time_mode" AS ENUM (
    'unlimited',
    'timed'
);


ALTER TYPE "public"."test_time_mode" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'student',
    'teacher',
    'admin',
    'support',
    'superadmin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."video_quality" AS ENUM (
    '720p',
    '1080p',
    '4k'
);


ALTER TYPE "public"."video_quality" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_signed_url"("bucket_name" "text", "file_path" "text", "expires_in_seconds" integer DEFAULT 3600) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result TEXT;
BEGIN
  -- Esta función debe ser llamada desde el backend con service_role
  -- para generar URLs firmadas de archivos privados
  SELECT storage.get_public_url(bucket_name, file_path) INTO result;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_signed_url"("bucket_name" "text", "file_path" "text", "expires_in_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'user_role'),
    'authenticated'
  )::text;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_student"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    user_role text;
BEGIN
    -- Check if the user role is student
    SELECT role INTO user_role FROM public.users WHERE id = NEW.id;
    
    IF user_role = 'student' THEN
        INSERT INTO public.students (user_id, enrollment_date, completed_courses, certificates, extra_data)
        VALUES (
            NEW.id,
            NOW(),
            '{}',
            '{}',
            '{}'
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_student"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO public.users (id, email, name, last_name, role, is_verified)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        'student',
        false
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_role_jwt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Actualizar los claims del JWT con el rol del usuario
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('user_role', NEW.role)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_role_jwt"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_course_review_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Always use server time for updated_at
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_course_review_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_course_rating_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    target_course_id uuid;
    new_avg numeric(3,2);
    new_count integer;
BEGIN
    -- Determine which course_id to update
    IF TG_OP = 'DELETE' THEN
        target_course_id := OLD.course_id;
    ELSE
        target_course_id := NEW.course_id;
    END IF;

    -- Calculate new stats
    SELECT 
        COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
        COUNT(*)::integer
    INTO new_avg, new_count
    FROM "public"."course_reviews"
    WHERE course_id = target_course_id;

    -- Update the courses table
    UPDATE "public"."courses"
    SET 
        average_rating = new_avg,
        reviews_count = new_count,
        updated_at = NOW()
    WHERE id = target_course_id;

    -- Return appropriate row
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION "public"."update_course_rating_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."_backup_courses_teacher_ids_20251214" (
    "course_id" "uuid",
    "teacher_ids" "uuid"[],
    "co_host_ids" "uuid"[],
    "updated_at" timestamp with time zone,
    "backed_up_at" timestamp with time zone
);


ALTER TABLE "public"."_backup_courses_teacher_ids_20251214" OWNER TO "postgres";


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



CREATE TABLE IF NOT EXISTS "public"."certificate_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "background_url" "text" NOT NULL,
    "elements" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "page_size" "public"."certificate_page_size" DEFAULT 'letter'::"public"."certificate_page_size",
    "orientation" "public"."certificate_orientation" DEFAULT 'landscape'::"public"."certificate_orientation",
    "design_width" integer,
    "design_height" integer,
    "signatures" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."certificate_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."certificate_templates" IS 'Plantillas editables de certificados';



CREATE TABLE IF NOT EXISTS "public"."certificates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "certificate_template_id" "uuid" NOT NULL,
    "student_name" character varying(255) NOT NULL,
    "course_title" character varying(255) NOT NULL,
    "teacher_names" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "issue_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "certificate_url" "text",
    "verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."certificates" OWNER TO "postgres";


COMMENT ON TABLE "public"."certificates" IS 'Certificados emitidos a estudiantes';



CREATE TABLE IF NOT EXISTS "public"."course_accreditations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "test_attempt_id" "uuid",
    "final_score" numeric(5,2),
    "accredited_at" timestamp with time zone DEFAULT "now"(),
    "certificate_issued" boolean DEFAULT false,
    "certificate_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."course_accreditations" OWNER TO "postgres";


COMMENT ON TABLE "public"."course_accreditations" IS 'Registro de acreditaciones de microcredenciales';



CREATE TABLE IF NOT EXISTS "public"."course_favorites" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."course_favorites" OWNER TO "postgres";


COMMENT ON TABLE "public"."course_favorites" IS 'Cursos marcados como favoritos por usuarios';



CREATE TABLE IF NOT EXISTS "public"."course_reviews" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "course_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."course_reviews" OWNER TO "postgres";


COMMENT ON TABLE "public"."course_reviews" IS 'Calificaciones y reseñas de cursos por estudiantes';



COMMENT ON COLUMN "public"."course_reviews"."rating" IS 'Calificación de 1 a 5 estrellas';



COMMENT ON COLUMN "public"."course_reviews"."comment" IS 'Reseña opcional del estudiante';



CREATE TABLE IF NOT EXISTS "public"."course_sections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "order" integer DEFAULT 0 NOT NULL,
    "is_expanded" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."course_sections" OWNER TO "postgres";


COMMENT ON TABLE "public"."course_sections" IS 'Secciones de cursos para agrupar lecciones (ej: Week 1, Module A)';



CREATE TABLE IF NOT EXISTS "public"."course_tests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "test_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "is_required" boolean DEFAULT true,
    "require_all_sections" boolean DEFAULT true,
    "available_from" timestamp with time zone,
    "available_until" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."course_tests" OWNER TO "postgres";


COMMENT ON TABLE "public"."course_tests" IS 'Vincula evaluaciones de acreditación a cursos/microcredenciales';



CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "cover_image_url" "text",
    "thumbnail_url" "text",
    "teacher_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "co_host_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "lesson_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "duration_minutes" integer,
    "difficulty" "public"."difficulty_level",
    "entry_survey_id" "uuid",
    "exit_survey_id" "uuid",
    "certificate_template_id" "uuid",
    "form_template_id" "uuid",
    "is_live" boolean DEFAULT false,
    "live_playback_id" character varying(255),
    "enrollment_start_date" timestamp with time zone,
    "enrollment_end_date" timestamp with time zone,
    "unlimited_enrollment" boolean DEFAULT false,
    "enrollment_rules" "jsonb" DEFAULT '{"type": "anytime"}'::"jsonb",
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "certificate_rules" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "price" numeric(10,2) DEFAULT 0,
    "sale_percentage" integer DEFAULT 0,
    "is_published" boolean DEFAULT false,
    "is_hidden" boolean DEFAULT false,
    "university" "text",
    "specialization" "text",
    "average_rating" numeric(3,2) DEFAULT 0,
    "reviews_count" integer DEFAULT 0
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


COMMENT ON TABLE "public"."courses" IS 'Cursos y microcredenciales';



COMMENT ON COLUMN "public"."courses"."price" IS 'Precio base del curso en USD';



COMMENT ON COLUMN "public"."courses"."sale_percentage" IS 'Porcentaje de descuento (0-100)';



COMMENT ON COLUMN "public"."courses"."is_published" IS 'Si el curso está publicado y visible para estudiantes';



COMMENT ON COLUMN "public"."courses"."is_hidden" IS 'Si el curso está oculto temporalmente';



COMMENT ON COLUMN "public"."courses"."university" IS 'Universidad asociada al curso';



COMMENT ON COLUMN "public"."courses"."specialization" IS 'Especialización o programa del curso';



COMMENT ON COLUMN "public"."courses"."average_rating" IS 'Promedio de calificaciones cacheado (1.00-5.00)';



COMMENT ON COLUMN "public"."courses"."reviews_count" IS 'Cantidad total de reseñas cacheado';



CREATE TABLE IF NOT EXISTS "public"."file_attachments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "file_type" character varying(100) NOT NULL,
    "url" "text" NOT NULL,
    "size_kb" integer,
    "category" "public"."file_category" DEFAULT 'general'::"public"."file_category",
    "related_id" "uuid",
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."file_attachments" OWNER TO "postgres";


COMMENT ON TABLE "public"."file_attachments" IS 'Archivos adjuntos genéricos';



CREATE TABLE IF NOT EXISTS "public"."file_attachments_course" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "file_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."file_attachments_course" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."file_attachments_lesson" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "file_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."file_attachments_lesson" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."form_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "course_id" "uuid",
    "lesson_id" "uuid",
    "questions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."form_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."form_templates" IS 'Plantillas de formularios y quizzes';



CREATE TABLE IF NOT EXISTS "public"."lesson_attendance" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "joined_live_at" timestamp with time zone,
    "left_live_at" timestamp with time zone,
    "total_live_minutes" integer DEFAULT 0,
    "attended_live" boolean DEFAULT false,
    "completed_entry_survey" boolean DEFAULT false,
    "completed_exit_survey" boolean DEFAULT false,
    "live_polls_answered" integer DEFAULT 0,
    "total_live_polls" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lesson_attendance" OWNER TO "postgres";


COMMENT ON TABLE "public"."lesson_attendance" IS 'Registro de asistencia a lecciones en vivo';



CREATE TABLE IF NOT EXISTS "public"."lesson_notes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "video_timestamp" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lesson_notes" OWNER TO "postgres";


COMMENT ON TABLE "public"."lesson_notes" IS 'Notas personales de estudiantes para cada lección';



COMMENT ON COLUMN "public"."lesson_notes"."video_timestamp" IS 'Timestamp del video en segundos donde se creó la nota';



CREATE TABLE IF NOT EXISTS "public"."lesson_question_answers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_role" "public"."user_role" NOT NULL,
    "answer_text" "text" NOT NULL,
    "is_instructor_answer" boolean DEFAULT false,
    "is_accepted" boolean DEFAULT false,
    "upvotes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lesson_question_answers" OWNER TO "postgres";


COMMENT ON TABLE "public"."lesson_question_answers" IS 'Respuestas a las preguntas de lecciones';



CREATE TABLE IF NOT EXISTS "public"."lesson_question_upvotes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lesson_question_upvotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "video_timestamp" integer DEFAULT 0,
    "is_resolved" boolean DEFAULT false,
    "upvotes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lesson_questions" OWNER TO "postgres";


COMMENT ON TABLE "public"."lesson_questions" IS 'Preguntas de estudiantes sobre el contenido de las lecciones';



COMMENT ON COLUMN "public"."lesson_questions"."video_timestamp" IS 'Timestamp del video donde surgió la pregunta';



CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "content" "text",
    "order" integer DEFAULT 0 NOT NULL,
    "type" "public"."lesson_type" DEFAULT 'video'::"public"."lesson_type",
    "video_url" "text",
    "video_playback_id" character varying(255),
    "video_recording_id" "uuid",
    "is_live" boolean DEFAULT false,
    "live_stream_id" character varying(255),
    "live_stream_key" character varying(255),
    "live_playback_id" character varying(255),
    "live_status" "public"."live_status" DEFAULT 'idle'::"public"."live_status",
    "scheduled_start_time" timestamp with time zone,
    "actual_start_time" timestamp with time zone,
    "actual_end_time" timestamp with time zone,
    "streaming_type" "public"."streaming_type" DEFAULT 'agora'::"public"."streaming_type",
    "live_stream_url" "text",
    "recorded_video_url" "text",
    "agora_channel" character varying(255),
    "agora_app_id" character varying(255),
    "attachment_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "resource_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "form_template_id" "uuid",
    "survey_id" "uuid",
    "entry_survey_id" "uuid",
    "exit_survey_id" "uuid",
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "duration_minutes" integer,
    "created_by" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_published" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "section_id" "uuid"
);


ALTER TABLE "public"."lessons" OWNER TO "postgres";


COMMENT ON TABLE "public"."lessons" IS 'Lecciones/módulos de cada curso';



COMMENT ON COLUMN "public"."lessons"."section_id" IS 'Sección a la que pertenece la lección (opcional)';



CREATE TABLE IF NOT EXISTS "public"."live_chat_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "live_chat_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_name" character varying(255) NOT NULL,
    "user_avatar" "text",
    "user_role" "public"."user_role" NOT NULL,
    "message" "text" NOT NULL,
    "is_highlighted" boolean DEFAULT false,
    "is_pinned" boolean DEFAULT false,
    "is_question" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."live_chat_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."live_chat_messages" IS 'Mensajes individuales del chat en vivo';



CREATE TABLE IF NOT EXISTS "public"."live_chats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."live_chats" OWNER TO "postgres";


COMMENT ON TABLE "public"."live_chats" IS 'Sesiones de chat en vivo por lección';



CREATE TABLE IF NOT EXISTS "public"."live_poll_votes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "poll_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "option_id" character varying(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."live_poll_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_polls" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "question" "text" NOT NULL,
    "options" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "duration" integer DEFAULT 30 NOT NULL,
    "created_by" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true,
    "total_votes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."live_polls" OWNER TO "postgres";


COMMENT ON TABLE "public"."live_polls" IS 'Encuestas rápidas durante transmisiones en vivo';



CREATE TABLE IF NOT EXISTS "public"."live_stream_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "left_at" timestamp with time zone,
    "duration_minutes" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."live_stream_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_streams" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "instructor_id" "uuid" NOT NULL,
    "instructor_name" character varying(255),
    "agora_channel" character varying(255) NOT NULL,
    "agora_app_id" character varying(255) NOT NULL,
    "active" boolean DEFAULT false,
    "start_at" timestamp with time zone,
    "end_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."live_streams" OWNER TO "postgres";


COMMENT ON TABLE "public"."live_streams" IS 'Configuración de transmisiones en vivo';



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



CREATE TABLE IF NOT EXISTS "public"."site_config" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "key" character varying(100) NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."site_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."site_config" IS 'Configuración global de MicroCert by Marca UNACH';



CREATE TABLE IF NOT EXISTS "public"."student_answers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "form_template_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "lesson_id" "uuid",
    "answer" "jsonb",
    "file_url" "text",
    "score" numeric(5,2),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."student_answers" OWNER TO "postgres";


COMMENT ON TABLE "public"."student_answers" IS 'Respuestas de estudiantes a formularios/quizzes';



CREATE TABLE IF NOT EXISTS "public"."student_enrollments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "enrolled_at" timestamp with time zone DEFAULT "now"(),
    "progress" integer DEFAULT 0,
    "completed_lessons" "uuid"[] DEFAULT '{}'::"uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_lesson_id" "uuid",
    "subsection_progress" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "student_enrollments_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100)))
);


ALTER TABLE "public"."student_enrollments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."student_enrollments"."last_accessed_lesson_id" IS 'UUID of the last lesson the student accessed - used for "resume course" functionality';



COMMENT ON COLUMN "public"."student_enrollments"."subsection_progress" IS 'JSONB map of lesson_id -> highest_completed_subsection_index for granular progress tracking';



CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "enrollment_date" timestamp with time zone DEFAULT "now"(),
    "completed_courses" "uuid"[] DEFAULT '{}'::"uuid"[],
    "certificates" "uuid"[] DEFAULT '{}'::"uuid"[],
    "extra_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."students" OWNER TO "postgres";


COMMENT ON TABLE "public"."students" IS 'Perfil extendido para estudiantes';



CREATE TABLE IF NOT EXISTS "public"."survey_responses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "survey_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_name" character varying(255) NOT NULL,
    "course_id" "uuid",
    "lesson_id" "uuid",
    "answers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."survey_responses" OWNER TO "postgres";


COMMENT ON TABLE "public"."survey_responses" IS 'Respuestas a encuestas';



CREATE TABLE IF NOT EXISTS "public"."surveys" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "type" "public"."survey_type" NOT NULL,
    "course_id" "uuid",
    "lesson_id" "uuid",
    "questions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."surveys" OWNER TO "postgres";


COMMENT ON TABLE "public"."surveys" IS 'Encuestas de entrada/salida';



CREATE TABLE IF NOT EXISTS "public"."teacher_resources" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "file_type" character varying(100) NOT NULL,
    "url" "text" NOT NULL,
    "size_kb" integer,
    "category" "public"."resource_category" DEFAULT 'document'::"public"."resource_category",
    "assigned_courses" "uuid"[] DEFAULT '{}'::"uuid"[],
    "description" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teacher_resources" OWNER TO "postgres";


COMMENT ON TABLE "public"."teacher_resources" IS 'Recursos y materiales de maestros (antes speakerResources)';



CREATE TABLE IF NOT EXISTS "public"."teachers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "expertise" "text"[] DEFAULT '{}'::"text"[],
    "resume_url" "text",
    "signature_url" "text",
    "events" "uuid"[] DEFAULT '{}'::"uuid"[],
    "extra_data" "jsonb" DEFAULT '{}'::"jsonb",
    "cover_image_url" "text",
    "about_me" "text",
    "favorite_books" "text"[] DEFAULT '{}'::"text"[],
    "published_books" "jsonb" DEFAULT '[]'::"jsonb",
    "external_courses" "jsonb" DEFAULT '[]'::"jsonb",
    "achievements" "text"[] DEFAULT '{}'::"text"[],
    "services" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teachers" OWNER TO "postgres";


COMMENT ON TABLE "public"."teachers" IS 'Perfil extendido para maestros/instructores (antes speakers)';



CREATE TABLE IF NOT EXISTS "public"."test_answers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "answer" "jsonb",
    "is_correct" boolean,
    "points_earned" numeric(5,2) DEFAULT 0,
    "time_spent_seconds" integer,
    "answered_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."test_answers" OWNER TO "postgres";


COMMENT ON TABLE "public"."test_answers" IS 'Respuestas de estudiantes a preguntas de evaluación';



CREATE TABLE IF NOT EXISTS "public"."test_attempts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_test_id" "uuid" NOT NULL,
    "test_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "status" "public"."test_attempt_status" DEFAULT 'in_progress'::"public"."test_attempt_status" NOT NULL,
    "score" numeric(5,2),
    "max_score" numeric(5,2),
    "percentage" numeric(5,2),
    "passed" boolean,
    "accredited" boolean DEFAULT false,
    "start_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_time" timestamp with time zone,
    "time_spent_seconds" integer,
    "ip_address" character varying(45),
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."test_attempts" OWNER TO "postgres";


COMMENT ON TABLE "public"."test_attempts" IS 'Intentos de evaluaciones de acreditación por estudiantes';



CREATE TABLE IF NOT EXISTS "public"."test_questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "test_id" "uuid" NOT NULL,
    "question_type" "public"."test_question_type" NOT NULL,
    "question_text" "text" NOT NULL,
    "question_media_url" "text",
    "options" "jsonb" DEFAULT '[]'::"jsonb",
    "correct_answer" "jsonb",
    "explanation" "text",
    "points" numeric(5,2) DEFAULT 1,
    "time_limit_seconds" integer,
    "order" integer DEFAULT 0 NOT NULL,
    "is_required" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."test_questions" OWNER TO "postgres";


COMMENT ON TABLE "public"."test_questions" IS 'Preguntas de las evaluaciones de acreditación';



CREATE TABLE IF NOT EXISTS "public"."tests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "instructions" "text",
    "cover_image_url" "text",
    "status" "public"."test_status" DEFAULT 'draft'::"public"."test_status" NOT NULL,
    "time_mode" "public"."test_time_mode" DEFAULT 'unlimited'::"public"."test_time_mode" NOT NULL,
    "time_limit_minutes" integer,
    "passing_score" numeric(5,2) DEFAULT 60,
    "max_attempts" integer DEFAULT 1,
    "shuffle_questions" boolean DEFAULT false,
    "shuffle_options" boolean DEFAULT false,
    "show_results_immediately" boolean DEFAULT true,
    "show_correct_answers" boolean DEFAULT true,
    "allow_review" boolean DEFAULT true,
    "created_by" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tests" OWNER TO "postgres";


COMMENT ON TABLE "public"."tests" IS 'Evaluaciones de acreditación - Exámenes finales de microcredenciales';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "last_name" character varying(255),
    "role" "public"."user_role" DEFAULT 'student'::"public"."user_role" NOT NULL,
    "phone" character varying(50),
    "username" character varying(100),
    "date_of_birth" "date",
    "gender" "public"."gender_type",
    "state" character varying(100),
    "avatar_url" "text",
    "bio" "text",
    "social_links" "jsonb" DEFAULT '{}'::"jsonb",
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "municipality" character varying(255)
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'Usuarios base del sistema MicroCert';



CREATE TABLE IF NOT EXISTS "public"."video_recordings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "asset_id" character varying(255) NOT NULL,
    "playback_id" character varying(255) NOT NULL,
    "course_id" "uuid" NOT NULL,
    "lesson_id" "uuid",
    "duration_seconds" integer,
    "quality" "public"."video_quality",
    "url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."video_recordings" OWNER TO "postgres";


COMMENT ON TABLE "public"."video_recordings" IS 'Grabaciones de video de sesiones';



ALTER TABLE ONLY "public"."certificate_downloads"
    ADD CONSTRAINT "certificate_downloads_course_student_key" UNIQUE ("course_id", "student_id");



ALTER TABLE ONLY "public"."certificate_downloads"
    ADD CONSTRAINT "certificate_downloads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificate_templates"
    ADD CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_student_id_course_id_key" UNIQUE ("student_id", "course_id");



ALTER TABLE ONLY "public"."course_accreditations"
    ADD CONSTRAINT "course_accreditations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_accreditations"
    ADD CONSTRAINT "course_accreditations_unique" UNIQUE ("student_id", "course_id");



ALTER TABLE ONLY "public"."course_favorites"
    ADD CONSTRAINT "course_favorites_course_user_unique" UNIQUE ("course_id", "user_id");



ALTER TABLE ONLY "public"."course_favorites"
    ADD CONSTRAINT "course_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_reviews"
    ADD CONSTRAINT "course_reviews_course_student_unique" UNIQUE ("course_id", "student_id");



ALTER TABLE ONLY "public"."course_reviews"
    ADD CONSTRAINT "course_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_sections"
    ADD CONSTRAINT "course_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_tests"
    ADD CONSTRAINT "course_tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_tests"
    ADD CONSTRAINT "course_tests_unique" UNIQUE ("test_id", "course_id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."file_attachments_course"
    ADD CONSTRAINT "file_attachments_course_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."file_attachments_lesson"
    ADD CONSTRAINT "file_attachments_lesson_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."file_attachments"
    ADD CONSTRAINT "file_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_templates"
    ADD CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_attendance"
    ADD CONSTRAINT "lesson_attendance_lesson_id_student_id_key" UNIQUE ("lesson_id", "student_id");



ALTER TABLE ONLY "public"."lesson_attendance"
    ADD CONSTRAINT "lesson_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_notes"
    ADD CONSTRAINT "lesson_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_question_answers"
    ADD CONSTRAINT "lesson_question_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_question_upvotes"
    ADD CONSTRAINT "lesson_question_upvotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_question_upvotes"
    ADD CONSTRAINT "lesson_question_upvotes_unique" UNIQUE ("question_id", "user_id");



ALTER TABLE ONLY "public"."lesson_questions"
    ADD CONSTRAINT "lesson_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_chat_messages"
    ADD CONSTRAINT "live_chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_chats"
    ADD CONSTRAINT "live_chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_poll_votes"
    ADD CONSTRAINT "live_poll_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_poll_votes"
    ADD CONSTRAINT "live_poll_votes_poll_id_user_id_key" UNIQUE ("poll_id", "user_id");



ALTER TABLE ONLY "public"."live_polls"
    ADD CONSTRAINT "live_polls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_stream_sessions"
    ADD CONSTRAINT "live_stream_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_streams"
    ADD CONSTRAINT "live_streams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_emails"
    ADD CONSTRAINT "scheduled_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_config"
    ADD CONSTRAINT "site_config_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."site_config"
    ADD CONSTRAINT "site_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_answers"
    ADD CONSTRAINT "student_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_enrollments"
    ADD CONSTRAINT "student_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_enrollments"
    ADD CONSTRAINT "student_enrollments_student_id_course_id_key" UNIQUE ("student_id", "course_id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_resources"
    ADD CONSTRAINT "teacher_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."test_answers"
    ADD CONSTRAINT "test_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_attempts"
    ADD CONSTRAINT "test_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_questions"
    ADD CONSTRAINT "test_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tests"
    ADD CONSTRAINT "tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."video_recordings"
    ADD CONSTRAINT "video_recordings_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_certificate_downloads_course" ON "public"."certificate_downloads" USING "btree" ("course_id");



CREATE INDEX "idx_certificate_downloads_date" ON "public"."certificate_downloads" USING "btree" ("downloaded_at");



CREATE INDEX "idx_certificate_downloads_student" ON "public"."certificate_downloads" USING "btree" ("student_id");



CREATE INDEX "idx_certificates_course" ON "public"."certificates" USING "btree" ("course_id");



CREATE INDEX "idx_certificates_student" ON "public"."certificates" USING "btree" ("student_id");



CREATE INDEX "idx_course_accreditations_course_id" ON "public"."course_accreditations" USING "btree" ("course_id");



CREATE INDEX "idx_course_accreditations_student_id" ON "public"."course_accreditations" USING "btree" ("student_id");



CREATE INDEX "idx_course_favorites_course_id" ON "public"."course_favorites" USING "btree" ("course_id");



CREATE INDEX "idx_course_favorites_created_at" ON "public"."course_favorites" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_course_favorites_user_id" ON "public"."course_favorites" USING "btree" ("user_id");



CREATE INDEX "idx_course_reviews_course_id" ON "public"."course_reviews" USING "btree" ("course_id");



CREATE INDEX "idx_course_reviews_created_at" ON "public"."course_reviews" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_course_reviews_rating" ON "public"."course_reviews" USING "btree" ("rating");



CREATE INDEX "idx_course_reviews_student_id" ON "public"."course_reviews" USING "btree" ("student_id");



CREATE INDEX "idx_course_sections_course_id" ON "public"."course_sections" USING "btree" ("course_id");



CREATE INDEX "idx_course_sections_order" ON "public"."course_sections" USING "btree" ("course_id", "order");



CREATE INDEX "idx_course_tests_course_id" ON "public"."course_tests" USING "btree" ("course_id");



CREATE INDEX "idx_course_tests_test_id" ON "public"."course_tests" USING "btree" ("test_id");



CREATE INDEX "idx_courses_average_rating" ON "public"."courses" USING "btree" ("average_rating" DESC NULLS LAST);



CREATE INDEX "idx_courses_difficulty" ON "public"."courses" USING "btree" ("difficulty");



CREATE INDEX "idx_courses_is_active" ON "public"."courses" USING "btree" ("is_active");



CREATE INDEX "idx_courses_is_published" ON "public"."courses" USING "btree" ("is_published");



CREATE INDEX "idx_courses_price" ON "public"."courses" USING "btree" ("price");



CREATE INDEX "idx_courses_specialization" ON "public"."courses" USING "btree" ("specialization");



CREATE INDEX "idx_courses_start_date" ON "public"."courses" USING "btree" ("start_date");



CREATE INDEX "idx_courses_university" ON "public"."courses" USING "btree" ("university");



CREATE INDEX "idx_file_attachments_category" ON "public"."file_attachments" USING "btree" ("category");



CREATE INDEX "idx_file_attachments_owner" ON "public"."file_attachments" USING "btree" ("owner_id");



CREATE INDEX "idx_form_templates_course" ON "public"."form_templates" USING "btree" ("course_id");



CREATE INDEX "idx_form_templates_lesson" ON "public"."form_templates" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_attendance_lesson" ON "public"."lesson_attendance" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_attendance_student" ON "public"."lesson_attendance" USING "btree" ("student_id");



CREATE INDEX "idx_lesson_notes_course_id" ON "public"."lesson_notes" USING "btree" ("course_id");



CREATE INDEX "idx_lesson_notes_lesson_id" ON "public"."lesson_notes" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_notes_student_id" ON "public"."lesson_notes" USING "btree" ("student_id");



CREATE INDEX "idx_lesson_notes_student_lesson" ON "public"."lesson_notes" USING "btree" ("student_id", "lesson_id");



CREATE INDEX "idx_lesson_question_answers_question_id" ON "public"."lesson_question_answers" USING "btree" ("question_id");



CREATE INDEX "idx_lesson_question_answers_user_id" ON "public"."lesson_question_answers" USING "btree" ("user_id");



CREATE INDEX "idx_lesson_questions_course_id" ON "public"."lesson_questions" USING "btree" ("course_id");



CREATE INDEX "idx_lesson_questions_is_resolved" ON "public"."lesson_questions" USING "btree" ("is_resolved");



CREATE INDEX "idx_lesson_questions_lesson_id" ON "public"."lesson_questions" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_questions_student_id" ON "public"."lesson_questions" USING "btree" ("student_id");



CREATE INDEX "idx_lessons_course_id" ON "public"."lessons" USING "btree" ("course_id");



CREATE INDEX "idx_lessons_is_live" ON "public"."lessons" USING "btree" ("is_live");



CREATE INDEX "idx_lessons_order" ON "public"."lessons" USING "btree" ("course_id", "order");



CREATE INDEX "idx_lessons_section_id" ON "public"."lessons" USING "btree" ("section_id");



CREATE INDEX "idx_live_chat_messages_chat" ON "public"."live_chat_messages" USING "btree" ("live_chat_id");



CREATE INDEX "idx_live_chat_messages_created" ON "public"."live_chat_messages" USING "btree" ("created_at");



CREATE INDEX "idx_live_polls_active" ON "public"."live_polls" USING "btree" ("is_active");



CREATE INDEX "idx_live_polls_lesson" ON "public"."live_polls" USING "btree" ("lesson_id");



CREATE INDEX "idx_scheduled_emails_course" ON "public"."scheduled_emails" USING "btree" ("course_id");



CREATE INDEX "idx_scheduled_emails_lesson" ON "public"."scheduled_emails" USING "btree" ("lesson_id");



CREATE INDEX "idx_scheduled_emails_scheduled_date" ON "public"."scheduled_emails" USING "btree" ("scheduled_date");



CREATE INDEX "idx_scheduled_emails_status" ON "public"."scheduled_emails" USING "btree" ("status");



CREATE INDEX "idx_student_answers_course" ON "public"."student_answers" USING "btree" ("course_id");



CREATE INDEX "idx_student_answers_form" ON "public"."student_answers" USING "btree" ("form_template_id");



CREATE INDEX "idx_student_answers_student" ON "public"."student_answers" USING "btree" ("student_id");



CREATE INDEX "idx_student_enrollments_course" ON "public"."student_enrollments" USING "btree" ("course_id");



CREATE INDEX "idx_student_enrollments_last_accessed" ON "public"."student_enrollments" USING "btree" ("last_accessed_lesson_id");



CREATE INDEX "idx_student_enrollments_student" ON "public"."student_enrollments" USING "btree" ("student_id");



CREATE INDEX "idx_student_enrollments_subsection_progress" ON "public"."student_enrollments" USING "gin" ("subsection_progress");



CREATE INDEX "idx_students_user_id" ON "public"."students" USING "btree" ("user_id");



CREATE INDEX "idx_survey_responses_survey" ON "public"."survey_responses" USING "btree" ("survey_id");



CREATE INDEX "idx_survey_responses_user" ON "public"."survey_responses" USING "btree" ("user_id");



CREATE INDEX "idx_surveys_course" ON "public"."surveys" USING "btree" ("course_id");



CREATE INDEX "idx_surveys_type" ON "public"."surveys" USING "btree" ("type");



CREATE INDEX "idx_teacher_resources_deleted" ON "public"."teacher_resources" USING "btree" ("is_deleted");



CREATE INDEX "idx_teacher_resources_owner" ON "public"."teacher_resources" USING "btree" ("owner_id");



CREATE INDEX "idx_teachers_user_id" ON "public"."teachers" USING "btree" ("user_id");



CREATE INDEX "idx_test_answers_attempt_id" ON "public"."test_answers" USING "btree" ("attempt_id");



CREATE INDEX "idx_test_answers_question_id" ON "public"."test_answers" USING "btree" ("question_id");



CREATE INDEX "idx_test_answers_student_id" ON "public"."test_answers" USING "btree" ("student_id");



CREATE INDEX "idx_test_attempts_course_id" ON "public"."test_attempts" USING "btree" ("course_id");



CREATE INDEX "idx_test_attempts_course_test_id" ON "public"."test_attempts" USING "btree" ("course_test_id");



CREATE INDEX "idx_test_attempts_status" ON "public"."test_attempts" USING "btree" ("status");



CREATE INDEX "idx_test_attempts_student_id" ON "public"."test_attempts" USING "btree" ("student_id");



CREATE INDEX "idx_test_questions_order" ON "public"."test_questions" USING "btree" ("test_id", "order");



CREATE INDEX "idx_test_questions_test_id" ON "public"."test_questions" USING "btree" ("test_id");



CREATE INDEX "idx_tests_created_by" ON "public"."tests" USING "btree" ("created_by");



CREATE INDEX "idx_tests_is_active" ON "public"."tests" USING "btree" ("is_active");



CREATE INDEX "idx_tests_status" ON "public"."tests" USING "btree" ("status");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_users_username" ON "public"."users" USING "btree" ("username");



CREATE INDEX "idx_video_recordings_course" ON "public"."video_recordings" USING "btree" ("course_id");



CREATE INDEX "idx_video_recordings_lesson" ON "public"."video_recordings" USING "btree" ("lesson_id");



CREATE OR REPLACE TRIGGER "lesson_notes_updated_at" BEFORE UPDATE ON "public"."lesson_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "lesson_question_answers_updated_at" BEFORE UPDATE ON "public"."lesson_question_answers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "lesson_questions_updated_at" BEFORE UPDATE ON "public"."lesson_questions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "on_user_created_create_student" AFTER INSERT ON "public"."users" FOR EACH ROW WHEN (("new"."role" = 'student'::"public"."user_role")) EXECUTE FUNCTION "public"."handle_new_student"();



CREATE OR REPLACE TRIGGER "on_user_role_change" AFTER INSERT OR UPDATE OF "role" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_user_role_jwt"();



CREATE OR REPLACE TRIGGER "update_certificate_templates_updated_at" BEFORE UPDATE ON "public"."certificate_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_course_accreditations_updated_at" BEFORE UPDATE ON "public"."course_accreditations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_course_rating_stats_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."course_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_course_rating_stats"();



CREATE OR REPLACE TRIGGER "update_course_reviews_updated_at" BEFORE INSERT OR UPDATE ON "public"."course_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."set_course_review_updated_at"();



CREATE OR REPLACE TRIGGER "update_course_sections_updated_at" BEFORE UPDATE ON "public"."course_sections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_course_tests_updated_at" BEFORE UPDATE ON "public"."course_tests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_courses_updated_at" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_form_templates_updated_at" BEFORE UPDATE ON "public"."form_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_lesson_attendance_updated_at" BEFORE UPDATE ON "public"."lesson_attendance" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_lessons_updated_at" BEFORE UPDATE ON "public"."lessons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_live_chats_updated_at" BEFORE UPDATE ON "public"."live_chats" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_live_streams_updated_at" BEFORE UPDATE ON "public"."live_streams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_scheduled_emails_updated_at" BEFORE UPDATE ON "public"."scheduled_emails" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_site_config_updated_at" BEFORE UPDATE ON "public"."site_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_student_enrollments_updated_at" BEFORE UPDATE ON "public"."student_enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_students_updated_at" BEFORE UPDATE ON "public"."students" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_surveys_updated_at" BEFORE UPDATE ON "public"."surveys" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_teacher_resources_updated_at" BEFORE UPDATE ON "public"."teacher_resources" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_teachers_updated_at" BEFORE UPDATE ON "public"."teachers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_test_attempts_updated_at" BEFORE UPDATE ON "public"."test_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_test_questions_updated_at" BEFORE UPDATE ON "public"."test_questions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tests_updated_at" BEFORE UPDATE ON "public"."tests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."certificate_downloads"
    ADD CONSTRAINT "certificate_downloads_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."certificate_downloads"
    ADD CONSTRAINT "certificate_downloads_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificate_downloads"
    ADD CONSTRAINT "certificate_downloads_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."certificate_downloads"
    ADD CONSTRAINT "certificate_downloads_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificate_templates"
    ADD CONSTRAINT "certificate_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_certificate_template_id_fkey" FOREIGN KEY ("certificate_template_id") REFERENCES "public"."certificate_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_accreditations"
    ADD CONSTRAINT "course_accreditations_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."course_accreditations"
    ADD CONSTRAINT "course_accreditations_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_accreditations"
    ADD CONSTRAINT "course_accreditations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_accreditations"
    ADD CONSTRAINT "course_accreditations_test_attempt_id_fkey" FOREIGN KEY ("test_attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."course_favorites"
    ADD CONSTRAINT "course_favorites_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_favorites"
    ADD CONSTRAINT "course_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_reviews"
    ADD CONSTRAINT "course_reviews_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_reviews"
    ADD CONSTRAINT "course_reviews_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_sections"
    ADD CONSTRAINT "course_sections_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_tests"
    ADD CONSTRAINT "course_tests_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_tests"
    ADD CONSTRAINT "course_tests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_tests"
    ADD CONSTRAINT "course_tests_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."file_attachments_course"
    ADD CONSTRAINT "file_attachments_course_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."file_attachments_lesson"
    ADD CONSTRAINT "file_attachments_lesson_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."file_attachments"
    ADD CONSTRAINT "file_attachments_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."form_templates"
    ADD CONSTRAINT "form_templates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."form_templates"
    ADD CONSTRAINT "form_templates_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lesson_attendance"
    ADD CONSTRAINT "lesson_attendance_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_attendance"
    ADD CONSTRAINT "lesson_attendance_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_attendance"
    ADD CONSTRAINT "lesson_attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_notes"
    ADD CONSTRAINT "lesson_notes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_notes"
    ADD CONSTRAINT "lesson_notes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_notes"
    ADD CONSTRAINT "lesson_notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_question_answers"
    ADD CONSTRAINT "lesson_question_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."lesson_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_question_answers"
    ADD CONSTRAINT "lesson_question_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_question_upvotes"
    ADD CONSTRAINT "lesson_question_upvotes_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."lesson_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_question_upvotes"
    ADD CONSTRAINT "lesson_question_upvotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_questions"
    ADD CONSTRAINT "lesson_questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_questions"
    ADD CONSTRAINT "lesson_questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_questions"
    ADD CONSTRAINT "lesson_questions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."course_sections"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."live_chat_messages"
    ADD CONSTRAINT "live_chat_messages_live_chat_id_fkey" FOREIGN KEY ("live_chat_id") REFERENCES "public"."live_chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_chat_messages"
    ADD CONSTRAINT "live_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_chats"
    ADD CONSTRAINT "live_chats_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_poll_votes"
    ADD CONSTRAINT "live_poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "public"."live_polls"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_poll_votes"
    ADD CONSTRAINT "live_poll_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_polls"
    ADD CONSTRAINT "live_polls_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_polls"
    ADD CONSTRAINT "live_polls_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_stream_sessions"
    ADD CONSTRAINT "live_stream_sessions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_stream_sessions"
    ADD CONSTRAINT "live_stream_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_streams"
    ADD CONSTRAINT "live_streams_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_emails"
    ADD CONSTRAINT "scheduled_emails_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scheduled_emails"
    ADD CONSTRAINT "scheduled_emails_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scheduled_emails"
    ADD CONSTRAINT "scheduled_emails_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scheduled_emails"
    ADD CONSTRAINT "scheduled_emails_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."site_config"
    ADD CONSTRAINT "site_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."student_answers"
    ADD CONSTRAINT "student_answers_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_answers"
    ADD CONSTRAINT "student_answers_form_template_id_fkey" FOREIGN KEY ("form_template_id") REFERENCES "public"."form_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_answers"
    ADD CONSTRAINT "student_answers_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."student_answers"
    ADD CONSTRAINT "student_answers_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_enrollments"
    ADD CONSTRAINT "student_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_enrollments"
    ADD CONSTRAINT "student_enrollments_last_accessed_lesson_id_fkey" FOREIGN KEY ("last_accessed_lesson_id") REFERENCES "public"."lessons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."student_enrollments"
    ADD CONSTRAINT "student_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teacher_resources"
    ADD CONSTRAINT "teacher_resources_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_answers"
    ADD CONSTRAINT "test_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_answers"
    ADD CONSTRAINT "test_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."test_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_answers"
    ADD CONSTRAINT "test_answers_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_attempts"
    ADD CONSTRAINT "test_attempts_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_attempts"
    ADD CONSTRAINT "test_attempts_course_test_id_fkey" FOREIGN KEY ("course_test_id") REFERENCES "public"."course_tests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_attempts"
    ADD CONSTRAINT "test_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_attempts"
    ADD CONSTRAINT "test_attempts_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_questions"
    ADD CONSTRAINT "test_questions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tests"
    ADD CONSTRAINT "tests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_recordings"
    ADD CONSTRAINT "video_recordings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_recordings"
    ADD CONSTRAINT "video_recordings_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE SET NULL;



CREATE POLICY "Admins can manage courses" ON "public"."courses" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"]))))));



CREATE POLICY "Anyone can view active courses" ON "public"."courses" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Students can create own answers" ON "public"."student_answers" FOR INSERT WITH CHECK (("student_id" IN ( SELECT "students"."id"
   FROM "public"."students"
  WHERE ("students"."user_id" = "auth"."uid"()))));



CREATE POLICY "Students can view own answers" ON "public"."student_answers" FOR SELECT USING (("student_id" IN ( SELECT "students"."id"
   FROM "public"."students"
  WHERE ("students"."user_id" = "auth"."uid"()))));



CREATE POLICY "Teachers can create courses" ON "public"."courses" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['teacher'::"public"."user_role", 'admin'::"public"."user_role", 'superadmin'::"public"."user_role"]))))) AND ("auth"."uid"() = ANY ("teacher_ids"))));



CREATE POLICY "Teachers can create lessons" ON "public"."lessons" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['teacher'::"public"."user_role", 'admin'::"public"."user_role", 'superadmin'::"public"."user_role"]))))) AND (("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "lessons"."course_id") AND ("auth"."uid"() = ANY ("courses"."teacher_ids"))))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"]))))))));



CREATE POLICY "Teachers can create resources" ON "public"."teacher_resources" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['teacher'::"public"."user_role", 'admin'::"public"."user_role", 'superadmin'::"public"."user_role"]))))) AND ("owner_id" = "auth"."uid"())));



CREATE POLICY "Teachers can delete own courses" ON "public"."courses" FOR DELETE USING ((("auth"."uid"() = ANY ("teacher_ids")) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"])))))));



CREATE POLICY "Teachers can delete own lessons" ON "public"."lessons" FOR DELETE USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "lessons"."course_id") AND ("auth"."uid"() = ANY ("courses"."teacher_ids"))))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"])))))));



CREATE POLICY "Teachers can delete own resources" ON "public"."teacher_resources" FOR DELETE USING ((("owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"])))))));



CREATE POLICY "Teachers can update own courses" ON "public"."courses" FOR UPDATE USING ((("auth"."uid"() = ANY ("teacher_ids")) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"])))))));



CREATE POLICY "Teachers can update own lessons" ON "public"."lessons" FOR UPDATE USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "lessons"."course_id") AND ("auth"."uid"() = ANY ("courses"."teacher_ids"))))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"]))))))) WITH CHECK ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "lessons"."course_id") AND ("auth"."uid"() = ANY ("courses"."teacher_ids"))))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"])))))));



CREATE POLICY "Teachers can update own resources" ON "public"."teacher_resources" FOR UPDATE USING ((("owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"]))))))) WITH CHECK ((("owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"])))))));



CREATE POLICY "Teachers can view lessons from their courses" ON "public"."lessons" FOR SELECT USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "lessons"."course_id") AND ("auth"."uid"() = ANY ("courses"."teacher_ids"))))) OR (EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "lessons"."course_id") AND ("auth"."uid"() = ANY ("courses"."co_host_ids"))))) OR (("is_published" = true) AND (EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "lessons"."course_id") AND ("courses"."is_active" = true))))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"])))))));



CREATE POLICY "Teachers can view own courses" ON "public"."courses" FOR SELECT USING ((("auth"."uid"() = ANY ("teacher_ids")) OR ("auth"."uid"() = ANY ("co_host_ids"))));



CREATE POLICY "Teachers can view own resources" ON "public"."teacher_resources" FOR SELECT USING ((("owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"])))))));



CREATE POLICY "Users can create attachments" ON "public"."file_attachments" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) AND ("owner_id" = "auth"."uid"())));



CREATE POLICY "Users can delete own attachments" ON "public"."file_attachments" FOR DELETE USING ((("owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"])))))));



CREATE POLICY "Users can update own attachments" ON "public"."file_attachments" FOR UPDATE USING ((("owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"]))))))) WITH CHECK ((("owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"])))))));



CREATE POLICY "Users can view own attachments" ON "public"."file_attachments" FOR SELECT USING ((("owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role", 'teacher'::"public"."user_role"])))))));



CREATE POLICY "allow_users_insert_own_profile" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."certificate_downloads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "certificate_downloads_delete_policy" ON "public"."certificate_downloads" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"]))))));



CREATE POLICY "certificate_downloads_insert_policy" ON "public"."certificate_downloads" FOR INSERT WITH CHECK ((("auth"."uid"() = "student_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role", 'superadmin'::"public"."user_role"])))))));



CREATE POLICY "certificate_downloads_select_policy" ON "public"."certificate_downloads" FOR SELECT USING (true);



ALTER TABLE "public"."certificate_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."certificates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_accreditations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_accreditations_admin_manage" ON "public"."course_accreditations" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role", 'teacher'::"public"."user_role"]))))));



CREATE POLICY "course_accreditations_student_own" ON "public"."course_accreditations" FOR SELECT USING (("student_id" = "auth"."uid"()));



ALTER TABLE "public"."course_favorites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_favorites_delete_own" ON "public"."course_favorites" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "course_favorites_insert_own" ON "public"."course_favorites" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "course_favorites_select_own" ON "public"."course_favorites" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."course_reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_reviews_delete_own_or_admin" ON "public"."course_reviews" FOR DELETE USING ((("auth"."uid"() = "student_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"])))))));



CREATE POLICY "course_reviews_insert_own" ON "public"."course_reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "student_id"));



CREATE POLICY "course_reviews_select_public" ON "public"."course_reviews" FOR SELECT USING (true);



CREATE POLICY "course_reviews_update_own" ON "public"."course_reviews" FOR UPDATE USING (("auth"."uid"() = "student_id")) WITH CHECK (("auth"."uid"() = "student_id"));



ALTER TABLE "public"."course_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_sections_admin_all" ON "public"."course_sections" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"]))))));



CREATE POLICY "course_sections_manage_authenticated" ON "public"."course_sections" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "course_sections_manage_teacher" ON "public"."course_sections" USING ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_sections"."course_id") AND ("auth"."uid"() = ANY ("c"."teacher_ids")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_sections"."course_id") AND ("auth"."uid"() = ANY ("c"."teacher_ids"))))));



CREATE POLICY "course_sections_select_all" ON "public"."course_sections" FOR SELECT USING (true);



CREATE POLICY "course_sections_select_published" ON "public"."course_sections" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_sections"."course_id") AND ("c"."is_published" = true)))));



ALTER TABLE "public"."course_tests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_tests_manage" ON "public"."course_tests" USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_tests"."course_id") AND ("auth"."uid"() = ANY ("c"."teacher_ids"))))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"])))))));



CREATE POLICY "course_tests_view" ON "public"."course_tests" FOR SELECT USING (true);



ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."file_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."form_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lesson_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lesson_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lesson_notes_delete_own" ON "public"."lesson_notes" FOR DELETE USING (("student_id" IN ( SELECT "students"."id"
   FROM "public"."students"
  WHERE ("students"."user_id" = "auth"."uid"()))));



CREATE POLICY "lesson_notes_insert_own" ON "public"."lesson_notes" FOR INSERT WITH CHECK (("student_id" IN ( SELECT "students"."id"
   FROM "public"."students"
  WHERE ("students"."user_id" = "auth"."uid"()))));



CREATE POLICY "lesson_notes_select_own" ON "public"."lesson_notes" FOR SELECT USING (("student_id" IN ( SELECT "students"."id"
   FROM "public"."students"
  WHERE ("students"."user_id" = "auth"."uid"()))));



CREATE POLICY "lesson_notes_update_own" ON "public"."lesson_notes" FOR UPDATE USING (("student_id" IN ( SELECT "students"."id"
   FROM "public"."students"
  WHERE ("students"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."lesson_question_answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lesson_question_answers_delete_own" ON "public"."lesson_question_answers" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "lesson_question_answers_insert_authenticated" ON "public"."lesson_question_answers" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "lesson_question_answers_select_all" ON "public"."lesson_question_answers" FOR SELECT USING (true);



CREATE POLICY "lesson_question_answers_update_own" ON "public"."lesson_question_answers" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."lesson_question_upvotes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lesson_question_upvotes_delete_own" ON "public"."lesson_question_upvotes" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "lesson_question_upvotes_insert_authenticated" ON "public"."lesson_question_upvotes" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "lesson_question_upvotes_select_all" ON "public"."lesson_question_upvotes" FOR SELECT USING (true);



ALTER TABLE "public"."lesson_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lesson_questions_delete_own" ON "public"."lesson_questions" FOR DELETE USING (("student_id" IN ( SELECT "students"."id"
   FROM "public"."students"
  WHERE ("students"."user_id" = "auth"."uid"()))));



CREATE POLICY "lesson_questions_insert_authenticated" ON "public"."lesson_questions" FOR INSERT WITH CHECK (("student_id" IN ( SELECT "students"."id"
   FROM "public"."students"
  WHERE ("students"."user_id" = "auth"."uid"()))));



CREATE POLICY "lesson_questions_select_all" ON "public"."lesson_questions" FOR SELECT USING (true);



CREATE POLICY "lesson_questions_update_own" ON "public"."lesson_questions" FOR UPDATE USING (("student_id" IN ( SELECT "students"."id"
   FROM "public"."students"
  WHERE ("students"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."lessons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_chats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_poll_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_polls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_stream_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_streams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduled_emails" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scheduled_emails_insert_policy" ON "public"."scheduled_emails" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role", 'superadmin'::"public"."user_role"]))))));



CREATE POLICY "scheduled_emails_select_policy" ON "public"."scheduled_emails" FOR SELECT USING (true);



CREATE POLICY "scheduled_emails_update_policy" ON "public"."scheduled_emails" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role", 'superadmin'::"public"."user_role"]))))));



ALTER TABLE "public"."site_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "site_config_public_read" ON "public"."site_config" FOR SELECT USING (true);



CREATE POLICY "site_config_superadmin_manage" ON "public"."site_config" TO "authenticated" USING (("public"."get_user_role"() = 'superadmin'::"text")) WITH CHECK (("public"."get_user_role"() = 'superadmin'::"text"));



ALTER TABLE "public"."student_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "students_insert_own" ON "public"."students" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "students_select_own" ON "public"."students" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "students_update_own" ON "public"."students" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."survey_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."surveys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teacher_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teachers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teachers_admin_manage" ON "public"."teachers" TO "authenticated" USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))) WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'superadmin'::"text"])));



CREATE POLICY "teachers_public_read" ON "public"."teachers" FOR SELECT USING (true);



CREATE POLICY "teachers_update_own_profile" ON "public"."teachers" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."test_answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "test_answers_admin_view" ON "public"."test_answers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role", 'teacher'::"public"."user_role"]))))));



CREATE POLICY "test_answers_student_own" ON "public"."test_answers" USING (("student_id" = "auth"."uid"())) WITH CHECK (("student_id" = "auth"."uid"()));



ALTER TABLE "public"."test_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "test_attempts_admin_view" ON "public"."test_attempts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role", 'teacher'::"public"."user_role"]))))));



CREATE POLICY "test_attempts_student_own" ON "public"."test_attempts" USING (("student_id" = "auth"."uid"())) WITH CHECK (("student_id" = "auth"."uid"()));



ALTER TABLE "public"."test_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "test_questions_manage" ON "public"."test_questions" USING ((EXISTS ( SELECT 1
   FROM "public"."tests" "t"
  WHERE (("t"."id" = "test_questions"."test_id") AND (("t"."created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"]))))))))));



CREATE POLICY "test_questions_view" ON "public"."test_questions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tests" "t"
  WHERE (("t"."id" = "test_questions"."test_id") AND ("t"."status" = 'published'::"public"."test_status") AND ("t"."is_active" = true)))));



ALTER TABLE "public"."tests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tests_admin_teacher_manage" ON "public"."tests" USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"]))))))) WITH CHECK ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'superadmin'::"public"."user_role"])))))));



CREATE POLICY "tests_view_published" ON "public"."tests" FOR SELECT USING ((("status" = 'published'::"public"."test_status") AND ("is_active" = true)));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_admin_delete" ON "public"."users" FOR DELETE TO "authenticated" USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'superadmin'::"text"])));



CREATE POLICY "users_admin_read_all" ON "public"."users" FOR SELECT TO "authenticated" USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'superadmin'::"text"])));



CREATE POLICY "users_admin_update_all" ON "public"."users" FOR UPDATE TO "authenticated" USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))) WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'superadmin'::"text"])));



CREATE POLICY "users_public_read_teachers" ON "public"."users" FOR SELECT USING (("role" = 'teacher'::"public"."user_role"));



CREATE POLICY "users_public_read_verified" ON "public"."users" FOR SELECT USING (("is_verified" = true));



CREATE POLICY "users_read_own_profile" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "users_superadmin_insert" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_user_role"() = 'superadmin'::"text"));



CREATE POLICY "users_update_own_profile" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."video_recordings" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";

























































































































































GRANT ALL ON FUNCTION "public"."get_signed_url"("bucket_name" "text", "file_path" "text", "expires_in_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_signed_url"("bucket_name" "text", "file_path" "text", "expires_in_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_signed_url"("bucket_name" "text", "file_path" "text", "expires_in_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_student"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_student"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_student"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_role_jwt"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_role_jwt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_role_jwt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_course_review_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_course_review_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_course_review_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_course_rating_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_course_rating_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_course_rating_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."_backup_courses_teacher_ids_20251214" TO "anon";
GRANT ALL ON TABLE "public"."_backup_courses_teacher_ids_20251214" TO "authenticated";
GRANT ALL ON TABLE "public"."_backup_courses_teacher_ids_20251214" TO "service_role";



GRANT ALL ON TABLE "public"."certificate_downloads" TO "anon";
GRANT ALL ON TABLE "public"."certificate_downloads" TO "authenticated";
GRANT ALL ON TABLE "public"."certificate_downloads" TO "service_role";



GRANT ALL ON TABLE "public"."certificate_templates" TO "anon";
GRANT ALL ON TABLE "public"."certificate_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."certificate_templates" TO "service_role";



GRANT ALL ON TABLE "public"."certificates" TO "anon";
GRANT ALL ON TABLE "public"."certificates" TO "authenticated";
GRANT ALL ON TABLE "public"."certificates" TO "service_role";



GRANT ALL ON TABLE "public"."course_accreditations" TO "anon";
GRANT ALL ON TABLE "public"."course_accreditations" TO "authenticated";
GRANT ALL ON TABLE "public"."course_accreditations" TO "service_role";



GRANT ALL ON TABLE "public"."course_favorites" TO "anon";
GRANT ALL ON TABLE "public"."course_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."course_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."course_reviews" TO "anon";
GRANT ALL ON TABLE "public"."course_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."course_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."course_sections" TO "anon";
GRANT ALL ON TABLE "public"."course_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."course_sections" TO "service_role";



GRANT ALL ON TABLE "public"."course_tests" TO "anon";
GRANT ALL ON TABLE "public"."course_tests" TO "authenticated";
GRANT ALL ON TABLE "public"."course_tests" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."file_attachments" TO "anon";
GRANT ALL ON TABLE "public"."file_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."file_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."file_attachments_course" TO "anon";
GRANT ALL ON TABLE "public"."file_attachments_course" TO "authenticated";
GRANT ALL ON TABLE "public"."file_attachments_course" TO "service_role";



GRANT ALL ON TABLE "public"."file_attachments_lesson" TO "anon";
GRANT ALL ON TABLE "public"."file_attachments_lesson" TO "authenticated";
GRANT ALL ON TABLE "public"."file_attachments_lesson" TO "service_role";



GRANT ALL ON TABLE "public"."form_templates" TO "anon";
GRANT ALL ON TABLE "public"."form_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."form_templates" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_attendance" TO "anon";
GRANT ALL ON TABLE "public"."lesson_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_attendance" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_notes" TO "anon";
GRANT ALL ON TABLE "public"."lesson_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_notes" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_question_answers" TO "anon";
GRANT ALL ON TABLE "public"."lesson_question_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_question_answers" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_question_upvotes" TO "anon";
GRANT ALL ON TABLE "public"."lesson_question_upvotes" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_question_upvotes" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_questions" TO "anon";
GRANT ALL ON TABLE "public"."lesson_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_questions" TO "service_role";



GRANT ALL ON TABLE "public"."lessons" TO "anon";
GRANT ALL ON TABLE "public"."lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons" TO "service_role";



GRANT ALL ON TABLE "public"."live_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."live_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."live_chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."live_chats" TO "anon";
GRANT ALL ON TABLE "public"."live_chats" TO "authenticated";
GRANT ALL ON TABLE "public"."live_chats" TO "service_role";



GRANT ALL ON TABLE "public"."live_poll_votes" TO "anon";
GRANT ALL ON TABLE "public"."live_poll_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."live_poll_votes" TO "service_role";



GRANT ALL ON TABLE "public"."live_polls" TO "anon";
GRANT ALL ON TABLE "public"."live_polls" TO "authenticated";
GRANT ALL ON TABLE "public"."live_polls" TO "service_role";



GRANT ALL ON TABLE "public"."live_stream_sessions" TO "anon";
GRANT ALL ON TABLE "public"."live_stream_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."live_stream_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."live_streams" TO "anon";
GRANT ALL ON TABLE "public"."live_streams" TO "authenticated";
GRANT ALL ON TABLE "public"."live_streams" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_emails" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_emails" TO "service_role";



GRANT ALL ON TABLE "public"."site_config" TO "anon";
GRANT ALL ON TABLE "public"."site_config" TO "authenticated";
GRANT ALL ON TABLE "public"."site_config" TO "service_role";



GRANT ALL ON TABLE "public"."student_answers" TO "anon";
GRANT ALL ON TABLE "public"."student_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."student_answers" TO "service_role";



GRANT ALL ON TABLE "public"."student_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."student_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."student_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";
GRANT INSERT,UPDATE ON TABLE "public"."students" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."survey_responses" TO "anon";
GRANT ALL ON TABLE "public"."survey_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_responses" TO "service_role";



GRANT ALL ON TABLE "public"."surveys" TO "anon";
GRANT ALL ON TABLE "public"."surveys" TO "authenticated";
GRANT ALL ON TABLE "public"."surveys" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_resources" TO "anon";
GRANT ALL ON TABLE "public"."teacher_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_resources" TO "service_role";



GRANT ALL ON TABLE "public"."teachers" TO "anon";
GRANT ALL ON TABLE "public"."teachers" TO "authenticated";
GRANT ALL ON TABLE "public"."teachers" TO "service_role";



GRANT ALL ON TABLE "public"."test_answers" TO "anon";
GRANT ALL ON TABLE "public"."test_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."test_answers" TO "service_role";



GRANT ALL ON TABLE "public"."test_attempts" TO "anon";
GRANT ALL ON TABLE "public"."test_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."test_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."test_questions" TO "anon";
GRANT ALL ON TABLE "public"."test_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."test_questions" TO "service_role";



GRANT ALL ON TABLE "public"."tests" TO "anon";
GRANT ALL ON TABLE "public"."tests" TO "authenticated";
GRANT ALL ON TABLE "public"."tests" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT INSERT,UPDATE ON TABLE "public"."users" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."video_recordings" TO "anon";
GRANT ALL ON TABLE "public"."video_recordings" TO "authenticated";
GRANT ALL ON TABLE "public"."video_recordings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































