-- ============================================================================
-- MIGRACIÓN: Sistema de Evaluaciones de Acreditación
-- 
-- ESTRUCTURA:
-- - CUESTIONARIOS (existentes): Por nivel, NO impactan calificación
-- - EVALUACIONES (nuevas): Examen final para ACREDITAR la microcredencial
--
-- Microcredencial (Curso)
--   ├── Nivel 1 → Lecciones + Cuestionario (sin calificación)
--   ├── Nivel 2 → Lecciones + Cuestionario (sin calificación)
--   └── EVALUACIÓN FINAL → Determina acreditación de la microcredencial
--
-- Requisito: Completar todos los niveles antes de presentar la evaluación
-- ============================================================================

-- ============================================================================
-- ENUMS PARA EVALUACIONES
-- ============================================================================

DO $$ BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."test_status" AS ENUM (
        'draft',
        'published',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."test_time_mode" AS ENUM (
        'unlimited',
        'timed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."test_attempt_status" AS ENUM (
        'in_progress',
        'completed',
        'abandoned',
        'timed_out'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLA: tests (Evaluaciones de Acreditación)
-- Exámenes finales para acreditar microcredenciales
-- ============================================================================

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
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."tests" OWNER TO "postgres";

COMMENT ON TABLE "public"."tests" IS 'Evaluaciones de acreditación - Exámenes finales de microcredenciales';
COMMENT ON COLUMN "public"."tests"."passing_score" IS 'Porcentaje mínimo para ACREDITAR la microcredencial (0-100)';

-- ============================================================================
-- TABLA: test_questions (Preguntas de evaluaciones)
-- ============================================================================

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
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "test_questions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "test_questions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."test_questions" OWNER TO "postgres";

COMMENT ON TABLE "public"."test_questions" IS 'Preguntas de las evaluaciones de acreditación';

-- ============================================================================
-- TABLA: course_tests (Vinculación de evaluaciones a CURSOS/Microcredenciales)
-- Una evaluación por microcredencial para determinar la acreditación
-- ============================================================================

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
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "course_tests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "course_tests_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE CASCADE,
    CONSTRAINT "course_tests_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE,
    CONSTRAINT "course_tests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "course_tests_unique" UNIQUE ("test_id", "course_id")
);

ALTER TABLE "public"."course_tests" OWNER TO "postgres";

COMMENT ON TABLE "public"."course_tests" IS 'Vincula evaluaciones de acreditación a cursos/microcredenciales';
COMMENT ON COLUMN "public"."course_tests"."require_all_sections" IS 'Si true, requiere completar todos los niveles antes de presentar';
COMMENT ON COLUMN "public"."course_tests"."is_required" IS 'Si es obligatoria para acreditar la microcredencial';

-- ============================================================================
-- TABLA: test_attempts (Intentos de evaluación por estudiantes)
-- ============================================================================

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
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "test_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "test_attempts_course_test_id_fkey" FOREIGN KEY ("course_test_id") REFERENCES "public"."course_tests"("id") ON DELETE CASCADE,
    CONSTRAINT "test_attempts_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE CASCADE,
    CONSTRAINT "test_attempts_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE,
    CONSTRAINT "test_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."test_attempts" OWNER TO "postgres";

COMMENT ON TABLE "public"."test_attempts" IS 'Intentos de evaluaciones de acreditación por estudiantes';
COMMENT ON COLUMN "public"."test_attempts"."accredited" IS 'Si aprobó y ACREDITÓ la microcredencial con este intento';

-- ============================================================================
-- TABLA: test_answers (Respuestas de estudiantes)
-- ============================================================================

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
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "test_answers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "test_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE CASCADE,
    CONSTRAINT "test_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."test_questions"("id") ON DELETE CASCADE,
    CONSTRAINT "test_answers_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."test_answers" OWNER TO "postgres";

COMMENT ON TABLE "public"."test_answers" IS 'Respuestas de estudiantes a preguntas de evaluación';

-- ============================================================================
-- TABLA: course_accreditations (Acreditaciones de microcredenciales)
-- Registro de estudiantes que acreditaron una microcredencial
-- ============================================================================

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
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "course_accreditations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "course_accreditations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "course_accreditations_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE,
    CONSTRAINT "course_accreditations_test_attempt_id_fkey" FOREIGN KEY ("test_attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE SET NULL,
    CONSTRAINT "course_accreditations_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE SET NULL,
    CONSTRAINT "course_accreditations_unique" UNIQUE ("student_id", "course_id")
);

ALTER TABLE "public"."course_accreditations" OWNER TO "postgres";

COMMENT ON TABLE "public"."course_accreditations" IS 'Registro de acreditaciones de microcredenciales';
COMMENT ON COLUMN "public"."course_accreditations"."final_score" IS 'Calificación final del examen de acreditación';

-- ============================================================================
-- ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS "idx_tests_created_by" ON "public"."tests" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_tests_status" ON "public"."tests" ("status");
CREATE INDEX IF NOT EXISTS "idx_tests_is_active" ON "public"."tests" ("is_active");

CREATE INDEX IF NOT EXISTS "idx_test_questions_test_id" ON "public"."test_questions" ("test_id");
CREATE INDEX IF NOT EXISTS "idx_test_questions_order" ON "public"."test_questions" ("test_id", "order");

CREATE INDEX IF NOT EXISTS "idx_course_tests_test_id" ON "public"."course_tests" ("test_id");
CREATE INDEX IF NOT EXISTS "idx_course_tests_course_id" ON "public"."course_tests" ("course_id");

CREATE INDEX IF NOT EXISTS "idx_test_attempts_student_id" ON "public"."test_attempts" ("student_id");
CREATE INDEX IF NOT EXISTS "idx_test_attempts_course_test_id" ON "public"."test_attempts" ("course_test_id");
CREATE INDEX IF NOT EXISTS "idx_test_attempts_course_id" ON "public"."test_attempts" ("course_id");
CREATE INDEX IF NOT EXISTS "idx_test_attempts_status" ON "public"."test_attempts" ("status");

CREATE INDEX IF NOT EXISTS "idx_test_answers_attempt_id" ON "public"."test_answers" ("attempt_id");
CREATE INDEX IF NOT EXISTS "idx_test_answers_question_id" ON "public"."test_answers" ("question_id");
CREATE INDEX IF NOT EXISTS "idx_test_answers_student_id" ON "public"."test_answers" ("student_id");

CREATE INDEX IF NOT EXISTS "idx_course_accreditations_student_id" ON "public"."course_accreditations" ("student_id");
CREATE INDEX IF NOT EXISTS "idx_course_accreditations_course_id" ON "public"."course_accreditations" ("course_id");

-- Índice único para evitar múltiples intentos activos
CREATE UNIQUE INDEX IF NOT EXISTS "test_attempts_active_idx" 
    ON "public"."test_attempts" ("course_test_id", "student_id") 
    WHERE (status = 'in_progress');

-- ============================================================================
-- TRIGGERS para updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS "update_tests_updated_at" ON "public"."tests";
CREATE TRIGGER "update_tests_updated_at" 
    BEFORE UPDATE ON "public"."tests" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

DROP TRIGGER IF EXISTS "update_test_questions_updated_at" ON "public"."test_questions";
CREATE TRIGGER "update_test_questions_updated_at" 
    BEFORE UPDATE ON "public"."test_questions" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

DROP TRIGGER IF EXISTS "update_course_tests_updated_at" ON "public"."course_tests";
CREATE TRIGGER "update_course_tests_updated_at" 
    BEFORE UPDATE ON "public"."course_tests" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

DROP TRIGGER IF EXISTS "update_test_attempts_updated_at" ON "public"."test_attempts";
CREATE TRIGGER "update_test_attempts_updated_at" 
    BEFORE UPDATE ON "public"."test_attempts" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

DROP TRIGGER IF EXISTS "update_course_accreditations_updated_at" ON "public"."course_accreditations";
CREATE TRIGGER "update_course_accreditations_updated_at" 
    BEFORE UPDATE ON "public"."course_accreditations" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE "public"."tests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."test_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."course_tests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."test_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."test_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."course_accreditations" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICIES para tests
-- ============================================================================

DROP POLICY IF EXISTS "tests_admin_teacher_manage" ON "public"."tests";
CREATE POLICY "tests_admin_teacher_manage" ON "public"."tests"
    FOR ALL
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM "public"."users" 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
    )
    WITH CHECK (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM "public"."users" 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
    );

DROP POLICY IF EXISTS "tests_view_published" ON "public"."tests";
CREATE POLICY "tests_view_published" ON "public"."tests"
    FOR SELECT
    USING (status = 'published' AND is_active = true);

-- Policies para test_questions
DROP POLICY IF EXISTS "test_questions_manage" ON "public"."test_questions";
CREATE POLICY "test_questions_manage" ON "public"."test_questions"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "public"."tests" t
            WHERE t.id = test_id 
            AND (
                t.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM "public"."users" 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'superadmin')
                )
            )
        )
    );

DROP POLICY IF EXISTS "test_questions_view" ON "public"."test_questions";
CREATE POLICY "test_questions_view" ON "public"."test_questions"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "public"."tests" t
            WHERE t.id = test_id 
            AND t.status = 'published' 
            AND t.is_active = true
        )
    );

-- Policies para course_tests
DROP POLICY IF EXISTS "course_tests_manage" ON "public"."course_tests";
CREATE POLICY "course_tests_manage" ON "public"."course_tests"
    FOR ALL
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM "public"."courses" c
            WHERE c.id = course_id 
            AND auth.uid() = ANY(c.teacher_ids)
        ) OR
        EXISTS (
            SELECT 1 FROM "public"."users" 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
    );

DROP POLICY IF EXISTS "course_tests_view" ON "public"."course_tests";
CREATE POLICY "course_tests_view" ON "public"."course_tests"
    FOR SELECT
    USING (true);

-- Policies para test_attempts
DROP POLICY IF EXISTS "test_attempts_student_own" ON "public"."test_attempts";
CREATE POLICY "test_attempts_student_own" ON "public"."test_attempts"
    FOR ALL
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "test_attempts_admin_view" ON "public"."test_attempts";
CREATE POLICY "test_attempts_admin_view" ON "public"."test_attempts"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "public"."users" 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'teacher')
        )
    );

-- Policies para test_answers
DROP POLICY IF EXISTS "test_answers_student_own" ON "public"."test_answers";
CREATE POLICY "test_answers_student_own" ON "public"."test_answers"
    FOR ALL
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "test_answers_admin_view" ON "public"."test_answers";
CREATE POLICY "test_answers_admin_view" ON "public"."test_answers"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "public"."users" 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'teacher')
        )
    );

-- Policies para course_accreditations
DROP POLICY IF EXISTS "course_accreditations_student_own" ON "public"."course_accreditations";
CREATE POLICY "course_accreditations_student_own" ON "public"."course_accreditations"
    FOR SELECT
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "course_accreditations_admin_manage" ON "public"."course_accreditations";
CREATE POLICY "course_accreditations_admin_manage" ON "public"."course_accreditations"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "public"."users" 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'teacher')
        )
    );

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON TABLE "public"."tests" TO "anon";
GRANT ALL ON TABLE "public"."tests" TO "authenticated";
GRANT ALL ON TABLE "public"."tests" TO "service_role";

GRANT ALL ON TABLE "public"."test_questions" TO "anon";
GRANT ALL ON TABLE "public"."test_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."test_questions" TO "service_role";

GRANT ALL ON TABLE "public"."course_tests" TO "anon";
GRANT ALL ON TABLE "public"."course_tests" TO "authenticated";
GRANT ALL ON TABLE "public"."course_tests" TO "service_role";

GRANT ALL ON TABLE "public"."test_attempts" TO "anon";
GRANT ALL ON TABLE "public"."test_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."test_attempts" TO "service_role";

GRANT ALL ON TABLE "public"."test_answers" TO "anon";
GRANT ALL ON TABLE "public"."test_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."test_answers" TO "service_role";

GRANT ALL ON TABLE "public"."course_accreditations" TO "anon";
GRANT ALL ON TABLE "public"."course_accreditations" TO "authenticated";
GRANT ALL ON TABLE "public"."course_accreditations" TO "service_role";
