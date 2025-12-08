-- ============================================================================
-- ARCHIVO DE EJECUCIÓN COMPLETO
-- 
-- INSTRUCCIONES:
-- 1. Abre el SQL Editor en tu proyecto de Supabase
-- 2. Copia y pega TODO el contenido de este archivo
-- 3. Ejecuta
-- 4. Verifica que no haya errores
-- 5. Recarga la página /dashboard/tests
--
-- Este archivo incluye:
-- - Migración completa de tablas para evaluaciones
-- - Datos de prueba (3 evaluaciones con 25 preguntas)
-- ============================================================================

-- ============================================================================
-- PARTE 1: MIGRACIÓN - Tablas del Sistema de Evaluaciones
-- ============================================================================

-- ENUMS
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

-- TABLA: tests
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

-- TABLA: test_questions
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

-- TABLA: course_tests
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

-- TABLA: test_attempts
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

-- TABLA: test_answers
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

-- TABLA: course_accreditations
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

-- ÍNDICES
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

-- TRIGGERS
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

-- ROW LEVEL SECURITY
ALTER TABLE "public"."tests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."test_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."course_tests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."test_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."test_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."course_accreditations" ENABLE ROW LEVEL SECURITY;

-- POLICIES
DROP POLICY IF EXISTS "tests_admin_teacher_manage" ON "public"."tests";
CREATE POLICY "tests_admin_teacher_manage" ON "public"."tests"
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM "public"."users" WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    )
    WITH CHECK (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM "public"."users" WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

DROP POLICY IF EXISTS "tests_view_published" ON "public"."tests";
CREATE POLICY "tests_view_published" ON "public"."tests"
    FOR SELECT USING (status = 'published' AND is_active = true);

DROP POLICY IF EXISTS "test_questions_manage" ON "public"."test_questions";
CREATE POLICY "test_questions_manage" ON "public"."test_questions"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "public"."tests" t
            WHERE t.id = test_id AND (
                t.created_by = auth.uid() OR
                EXISTS (SELECT 1 FROM "public"."users" WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
            )
        )
    );

DROP POLICY IF EXISTS "test_questions_view" ON "public"."test_questions";
CREATE POLICY "test_questions_view" ON "public"."test_questions"
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM "public"."tests" t WHERE t.id = test_id AND t.status = 'published' AND t.is_active = true)
    );

DROP POLICY IF EXISTS "course_tests_manage" ON "public"."course_tests";
CREATE POLICY "course_tests_manage" ON "public"."course_tests"
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM "public"."courses" c WHERE c.id = course_id AND auth.uid() = ANY(c.teacher_ids)) OR
        EXISTS (SELECT 1 FROM "public"."users" WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

DROP POLICY IF EXISTS "course_tests_view" ON "public"."course_tests";
CREATE POLICY "course_tests_view" ON "public"."course_tests" FOR SELECT USING (true);

DROP POLICY IF EXISTS "test_attempts_student_own" ON "public"."test_attempts";
CREATE POLICY "test_attempts_student_own" ON "public"."test_attempts"
    FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "test_attempts_admin_view" ON "public"."test_attempts";
CREATE POLICY "test_attempts_admin_view" ON "public"."test_attempts"
    FOR SELECT USING (EXISTS (SELECT 1 FROM "public"."users" WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'teacher')));

DROP POLICY IF EXISTS "test_answers_student_own" ON "public"."test_answers";
CREATE POLICY "test_answers_student_own" ON "public"."test_answers"
    FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "test_answers_admin_view" ON "public"."test_answers";
CREATE POLICY "test_answers_admin_view" ON "public"."test_answers"
    FOR SELECT USING (EXISTS (SELECT 1 FROM "public"."users" WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'teacher')));

DROP POLICY IF EXISTS "course_accreditations_student_own" ON "public"."course_accreditations";
CREATE POLICY "course_accreditations_student_own" ON "public"."course_accreditations"
    FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "course_accreditations_admin_manage" ON "public"."course_accreditations";
CREATE POLICY "course_accreditations_admin_manage" ON "public"."course_accreditations"
    FOR ALL USING (EXISTS (SELECT 1 FROM "public"."users" WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'teacher')));

-- GRANTS
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

-- ============================================================================
-- PARTE 2: DATOS DE PRUEBA
-- ============================================================================

DO $$
DECLARE
    v_admin_id uuid;
    v_course_id uuid;
    v_test_1_id uuid;
    v_test_2_id uuid;
    v_test_3_id uuid;
BEGIN
    -- Obtener un admin o teacher existente
    SELECT id INTO v_admin_id 
    FROM public.users 
    WHERE role IN ('admin', 'superadmin', 'teacher') 
    LIMIT 1;
    
    IF v_admin_id IS NULL THEN
        SELECT id INTO v_admin_id FROM public.users LIMIT 1;
    END IF;
    
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'No hay usuarios en la base de datos. Crea al menos un usuario primero.';
    END IF;
    
    RAISE NOTICE 'Usando usuario ID: %', v_admin_id;
    
    -- Obtener un curso existente
    SELECT id INTO v_course_id FROM public.courses WHERE is_active = true LIMIT 1;

    -- EVALUACIÓN 1: Fundamentos de Programación (publicada, 60 min)
    INSERT INTO public.tests (
        title, description, instructions, status, time_mode, 
        time_limit_minutes, passing_score, max_attempts, 
        shuffle_questions, shuffle_options, show_results_immediately,
        show_correct_answers, allow_review, created_by, is_active
    ) VALUES (
        'Evaluación: Fundamentos de Programación',
        'Examen final para acreditar la microcredencial de Fundamentos de Programación. Calificación mínima: 70%.',
        'Lee cuidadosamente cada pregunta. Tienes 60 minutos para completar la evaluación.',
        'published', 'timed', 60, 70, 3, true, true, true, true, true, v_admin_id, true
    ) RETURNING id INTO v_test_1_id;

    -- Preguntas Evaluación 1
    INSERT INTO public.test_questions (test_id, question_type, question_text, options, correct_answer, explanation, points, "order", is_required) VALUES
    (v_test_1_id, 'multiple_choice', '¿Cuál es la salida de: let x = 5; let y = "5"; console.log(x == y);', 
     '[{"id":"a","text":"true"},{"id":"b","text":"false"},{"id":"c","text":"undefined"},{"id":"d","text":"Error"}]',
     '"a"', 'El operador == realiza coerción de tipos.', 10, 1, true),
    (v_test_1_id, 'multiple_choice', '¿Qué es una variable en programación?',
     '[{"id":"a","text":"Un valor que nunca cambia"},{"id":"b","text":"Un espacio en memoria para almacenar datos"},{"id":"c","text":"Un tipo de función"},{"id":"d","text":"Un operador matemático"}]',
     '"b"', 'Una variable almacena datos en memoria.', 10, 2, true),
    (v_test_1_id, 'true_false', '¿const en JavaScript significa que el valor nunca puede modificarse?',
     '[{"id":"true","text":"Verdadero"},{"id":"false","text":"Falso"}]',
     '"false"', 'const impide reasignar la referencia, pero objetos/arrays pueden modificarse internamente.', 10, 3, true),
    (v_test_1_id, 'multiple_answer', '¿Cuáles son tipos de datos primitivos en JavaScript?',
     '[{"id":"a","text":"string"},{"id":"b","text":"number"},{"id":"c","text":"array"},{"id":"d","text":"boolean"},{"id":"e","text":"object"}]',
     '["a","b","d"]', 'Los primitivos son: string, number, boolean, null, undefined, symbol, bigint.', 15, 4, true),
    (v_test_1_id, 'multiple_choice', '¿Qué estructura se usa para ejecutar código repetidamente?',
     '[{"id":"a","text":"if-else"},{"id":"b","text":"switch"},{"id":"c","text":"for/while"},{"id":"d","text":"try-catch"}]',
     '"c"', 'Los bucles for y while ejecutan código repetitivamente.', 10, 5, true),
    (v_test_1_id, 'multiple_choice', '¿Cuál es el resultado de 10 % 3?',
     '[{"id":"a","text":"3"},{"id":"b","text":"1"},{"id":"c","text":"3.33"},{"id":"d","text":"0"}]',
     '"b"', 'El módulo devuelve el residuo: 10/3 = 3 resto 1.', 10, 6, true),
    (v_test_1_id, 'true_false', '¿Un array puede contener elementos de diferentes tipos?',
     '[{"id":"true","text":"Verdadero"},{"id":"false","text":"Falso"}]',
     '"true"', 'Los arrays en JavaScript pueden contener cualquier tipo.', 10, 7, true),
    (v_test_1_id, 'multiple_choice', '¿Qué método agrega un elemento al final de un array?',
     '[{"id":"a","text":"push()"},{"id":"b","text":"pop()"},{"id":"c","text":"shift()"},{"id":"d","text":"unshift()"}]',
     '"a"', 'push() agrega al final, pop() remueve del final.', 10, 8, true),
    (v_test_1_id, 'open_ended', 'Explica qué es el scope de una variable.',
     '[]', null, 'El scope determina dónde puede accederse a una variable.', 15, 9, true),
    (v_test_1_id, 'multiple_choice', '¿Qué valor tiene una variable declarada pero no inicializada?',
     '[{"id":"a","text":"null"},{"id":"b","text":"undefined"},{"id":"c","text":"0"},{"id":"d","text":"empty"}]',
     '"b"', 'Las variables declaradas sin valor son undefined.', 10, 10, true);

    -- EVALUACIÓN 2: Desarrollo Web (publicada, 45 min)
    INSERT INTO public.tests (
        title, description, instructions, status, time_mode, 
        time_limit_minutes, passing_score, max_attempts, 
        shuffle_questions, shuffle_options, show_results_immediately,
        show_correct_answers, allow_review, created_by, is_active
    ) VALUES (
        'Evaluación: Desarrollo Web Frontend',
        'Examen para acreditar conocimientos de HTML, CSS y JavaScript básico.',
        'Tiempo límite: 45 minutos. Calificación mínima: 75%.',
        'published', 'timed', 45, 75, 2, true, true, true, false, true, v_admin_id, true
    ) RETURNING id INTO v_test_2_id;

    -- Preguntas Evaluación 2
    INSERT INTO public.test_questions (test_id, question_type, question_text, options, correct_answer, explanation, points, "order", is_required) VALUES
    (v_test_2_id, 'multiple_choice', '¿Qué etiqueta HTML define el título de la página?',
     '[{"id":"a","text":"<header>"},{"id":"b","text":"<title>"},{"id":"c","text":"<h1>"},{"id":"d","text":"<meta>"}]',
     '"b"', '<title> define el título en la pestaña del navegador.', 10, 1, true),
    (v_test_2_id, 'multiple_choice', '¿Qué propiedad CSS cambia el color de fondo?',
     '[{"id":"a","text":"color"},{"id":"b","text":"background-color"},{"id":"c","text":"bg-color"},{"id":"d","text":"fill"}]',
     '"b"', 'background-color define el color de fondo.', 10, 2, true),
    (v_test_2_id, 'multiple_answer', '¿Cuáles son selectores válidos en CSS?',
     '[{"id":"a","text":".clase"},{"id":"b","text":"#id"},{"id":"c","text":"@elemento"},{"id":"d","text":"elemento"},{"id":"e","text":"*"}]',
     '["a","b","d","e"]', '.clase, #id, elemento, * son válidos. @ no es selector.', 15, 3, true),
    (v_test_2_id, 'true_false', '¿Flexbox y Grid son sistemas de layout en CSS?',
     '[{"id":"true","text":"Verdadero"},{"id":"false","text":"Falso"}]',
     '"true"', 'Flexbox y CSS Grid son sistemas de layout modernos.', 10, 4, true),
    (v_test_2_id, 'multiple_choice', '¿Qué atributo abre un enlace en nueva pestaña?',
     '[{"id":"a","text":"href=\"_blank\""},{"id":"b","text":"target=\"_blank\""},{"id":"c","text":"rel=\"new\""},{"id":"d","text":"open=\"new\""}]',
     '"b"', 'target="_blank" abre en nueva pestaña.', 10, 5, true),
    (v_test_2_id, 'multiple_choice', '¿Cómo seleccionar un elemento por ID en JavaScript?',
     '[{"id":"a","text":"document.getElement(\"id\")"},{"id":"b","text":"document.getElementById(\"id\")"},{"id":"c","text":"document.querySelector(\"id\")"},{"id":"d","text":"document.select(\"#id\")"}]',
     '"b"', 'getElementById() selecciona por ID.', 10, 6, true),
    (v_test_2_id, 'true_false', '¿HTML es un lenguaje de programación?',
     '[{"id":"true","text":"Verdadero"},{"id":"false","text":"Falso"}]',
     '"false"', 'HTML es un lenguaje de marcado, no de programación.', 10, 7, true),
    (v_test_2_id, 'multiple_choice', '¿Qué significa DOM?',
     '[{"id":"a","text":"Document Object Model"},{"id":"b","text":"Data Object Management"},{"id":"c","text":"Document Oriented Markup"},{"id":"d","text":"Display Object Model"}]',
     '"a"', 'DOM = Document Object Model.', 10, 8, true),
    (v_test_2_id, 'open_ended', '¿Qué es el box model en CSS?',
     '[]', null, 'El box model define: content, padding, border y margin.', 10, 9, true),
    (v_test_2_id, 'multiple_choice', '¿Qué propiedad centra elementos horizontalmente con Flexbox?',
     '[{"id":"a","text":"align-items: center"},{"id":"b","text":"justify-content: center"},{"id":"c","text":"text-align: center"},{"id":"d","text":"margin: auto"}]',
     '"b"', 'justify-content: center centra en el eje principal.', 15, 10, true);

    -- EVALUACIÓN 3: Bases de Datos (borrador, sin tiempo)
    INSERT INTO public.tests (
        title, description, instructions, status, time_mode, 
        time_limit_minutes, passing_score, max_attempts, 
        shuffle_questions, shuffle_options, show_results_immediately,
        show_correct_answers, allow_review, created_by, is_active
    ) VALUES (
        'Evaluación: Bases de Datos SQL',
        'Evaluación para acreditar conocimientos en bases de datos relacionales.',
        'Sin límite de tiempo. Tómate el tiempo que necesites.',
        'draft', 'unlimited', null, 65, 5, false, false, true, true, true, v_admin_id, true
    ) RETURNING id INTO v_test_3_id;

    -- Preguntas Evaluación 3
    INSERT INTO public.test_questions (test_id, question_type, question_text, options, correct_answer, explanation, points, "order", is_required) VALUES
    (v_test_3_id, 'multiple_choice', '¿Qué significa SQL?',
     '[{"id":"a","text":"Structured Query Language"},{"id":"b","text":"Simple Query Language"},{"id":"c","text":"Standard Query Logic"},{"id":"d","text":"System Query Language"}]',
     '"a"', 'SQL = Structured Query Language.', 10, 1, true),
    (v_test_3_id, 'multiple_choice', '¿Qué comando crea una nueva tabla?',
     '[{"id":"a","text":"NEW TABLE"},{"id":"b","text":"CREATE TABLE"},{"id":"c","text":"ADD TABLE"},{"id":"d","text":"MAKE TABLE"}]',
     '"b"', 'CREATE TABLE es el comando estándar.', 10, 2, true),
    (v_test_3_id, 'multiple_answer', '¿Cuáles son tipos de JOIN en SQL?',
     '[{"id":"a","text":"INNER JOIN"},{"id":"b","text":"LEFT JOIN"},{"id":"c","text":"OUTER JOIN"},{"id":"d","text":"MIDDLE JOIN"},{"id":"e","text":"RIGHT JOIN"}]',
     '["a","b","c","e"]', 'INNER, LEFT, RIGHT, FULL OUTER. No existe MIDDLE.', 15, 3, true),
    (v_test_3_id, 'true_false', '¿Una PRIMARY KEY puede contener NULL?',
     '[{"id":"true","text":"Verdadero"},{"id":"false","text":"Falso"}]',
     '"false"', 'PRIMARY KEY debe ser única y NOT NULL.', 10, 4, true),
    (v_test_3_id, 'multiple_choice', '¿Qué cláusula filtra resultados?',
     '[{"id":"a","text":"FILTER"},{"id":"b","text":"WHERE"},{"id":"c","text":"HAVING"},{"id":"d","text":"SELECT"}]',
     '"b"', 'WHERE filtra filas antes del agrupamiento.', 10, 5, true);

    -- Vincular primera evaluación a un curso si existe
    IF v_course_id IS NOT NULL THEN
        INSERT INTO public.course_tests (test_id, course_id, is_required, require_all_sections, created_by)
        VALUES (v_test_1_id, v_course_id, true, true, v_admin_id);
        RAISE NOTICE 'Evaluación vinculada al curso: %', v_course_id;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'MIGRACIÓN Y DATOS COMPLETADOS';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Tablas creadas: 6';
    RAISE NOTICE 'Evaluaciones creadas: 3';
    RAISE NOTICE 'Preguntas creadas: 25';
    RAISE NOTICE '';
    RAISE NOTICE 'Ahora recarga /dashboard/tests';
    RAISE NOTICE '==========================================';
END $$;

-- Mostrar resumen de datos creados
SELECT 
    t.title as "Evaluación",
    t.status as "Estado",
    CASE WHEN t.time_mode = 'timed' THEN t.time_limit_minutes || ' min' ELSE 'Sin límite' END as "Tiempo",
    t.passing_score || '%' as "Aprobación",
    COUNT(q.id) as "Preguntas"
FROM public.tests t
LEFT JOIN public.test_questions q ON q.test_id = t.id
GROUP BY t.id
ORDER BY t.created_at DESC;

