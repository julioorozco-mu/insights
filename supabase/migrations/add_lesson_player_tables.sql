-- ============================================
-- MIGRACIÓN: Tablas para Lesson Player (Cinema Mode)
-- Funcionalidades: Notas personales del estudiante y Q&A
-- ============================================

-- ============================================
-- 1. TABLA: lesson_notes (Notas personales del estudiante)
-- ============================================
CREATE TABLE IF NOT EXISTS "public"."lesson_notes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "video_timestamp" integer DEFAULT 0, -- Timestamp en segundos donde se creó la nota
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."lesson_notes" OWNER TO "postgres";

COMMENT ON TABLE "public"."lesson_notes" IS 'Notas personales de estudiantes para cada lección';

COMMENT ON COLUMN "public"."lesson_notes"."video_timestamp" IS 'Timestamp del video en segundos donde se creó la nota';

-- Primary key
ALTER TABLE ONLY "public"."lesson_notes"
    ADD CONSTRAINT "lesson_notes_pkey" PRIMARY KEY ("id");

-- Índices para búsqueda eficiente
CREATE INDEX "idx_lesson_notes_student_id" ON "public"."lesson_notes" USING "btree" ("student_id");
CREATE INDEX "idx_lesson_notes_lesson_id" ON "public"."lesson_notes" USING "btree" ("lesson_id");
CREATE INDEX "idx_lesson_notes_course_id" ON "public"."lesson_notes" USING "btree" ("course_id");
CREATE INDEX "idx_lesson_notes_student_lesson" ON "public"."lesson_notes" USING "btree" ("student_id", "lesson_id");

-- Foreign keys
ALTER TABLE ONLY "public"."lesson_notes"
    ADD CONSTRAINT "lesson_notes_student_id_fkey" 
    FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."lesson_notes"
    ADD CONSTRAINT "lesson_notes_lesson_id_fkey" 
    FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."lesson_notes"
    ADD CONSTRAINT "lesson_notes_course_id_fkey" 
    FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;

-- Trigger para updated_at
CREATE TRIGGER "lesson_notes_updated_at"
    BEFORE UPDATE ON "public"."lesson_notes"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_updated_at_column"();


-- ============================================
-- 2. TABLA: lesson_questions (Preguntas y Respuestas)
-- ============================================
CREATE TABLE IF NOT EXISTS "public"."lesson_questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL, -- Estudiante que pregunta
    "question_text" "text" NOT NULL,
    "video_timestamp" integer DEFAULT 0, -- Timestamp del video donde surgió la duda
    "is_resolved" boolean DEFAULT false,
    "upvotes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."lesson_questions" OWNER TO "postgres";

COMMENT ON TABLE "public"."lesson_questions" IS 'Preguntas de estudiantes sobre el contenido de las lecciones';

COMMENT ON COLUMN "public"."lesson_questions"."video_timestamp" IS 'Timestamp del video donde surgió la pregunta';

-- Primary key
ALTER TABLE ONLY "public"."lesson_questions"
    ADD CONSTRAINT "lesson_questions_pkey" PRIMARY KEY ("id");

-- Índices
CREATE INDEX "idx_lesson_questions_lesson_id" ON "public"."lesson_questions" USING "btree" ("lesson_id");
CREATE INDEX "idx_lesson_questions_course_id" ON "public"."lesson_questions" USING "btree" ("course_id");
CREATE INDEX "idx_lesson_questions_student_id" ON "public"."lesson_questions" USING "btree" ("student_id");
CREATE INDEX "idx_lesson_questions_is_resolved" ON "public"."lesson_questions" USING "btree" ("is_resolved");

-- Foreign keys
ALTER TABLE ONLY "public"."lesson_questions"
    ADD CONSTRAINT "lesson_questions_lesson_id_fkey" 
    FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."lesson_questions"
    ADD CONSTRAINT "lesson_questions_course_id_fkey" 
    FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."lesson_questions"
    ADD CONSTRAINT "lesson_questions_student_id_fkey" 
    FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;

-- Trigger para updated_at
CREATE TRIGGER "lesson_questions_updated_at"
    BEFORE UPDATE ON "public"."lesson_questions"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_updated_at_column"();


-- ============================================
-- 3. TABLA: lesson_question_answers (Respuestas a las preguntas)
-- ============================================
CREATE TABLE IF NOT EXISTS "public"."lesson_question_answers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL, -- Puede ser maestro o estudiante
    "user_role" "public"."user_role" NOT NULL,
    "answer_text" "text" NOT NULL,
    "is_instructor_answer" boolean DEFAULT false, -- Marcar si es respuesta oficial del instructor
    "is_accepted" boolean DEFAULT false, -- Marcar como respuesta aceptada
    "upvotes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."lesson_question_answers" OWNER TO "postgres";

COMMENT ON TABLE "public"."lesson_question_answers" IS 'Respuestas a las preguntas de lecciones';

-- Primary key
ALTER TABLE ONLY "public"."lesson_question_answers"
    ADD CONSTRAINT "lesson_question_answers_pkey" PRIMARY KEY ("id");

-- Índices
CREATE INDEX "idx_lesson_question_answers_question_id" ON "public"."lesson_question_answers" USING "btree" ("question_id");
CREATE INDEX "idx_lesson_question_answers_user_id" ON "public"."lesson_question_answers" USING "btree" ("user_id");

-- Foreign keys
ALTER TABLE ONLY "public"."lesson_question_answers"
    ADD CONSTRAINT "lesson_question_answers_question_id_fkey" 
    FOREIGN KEY ("question_id") REFERENCES "public"."lesson_questions"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."lesson_question_answers"
    ADD CONSTRAINT "lesson_question_answers_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- Trigger para updated_at
CREATE TRIGGER "lesson_question_answers_updated_at"
    BEFORE UPDATE ON "public"."lesson_question_answers"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_updated_at_column"();


-- ============================================
-- 4. TABLA: lesson_question_upvotes (Votos en preguntas)
-- ============================================
CREATE TABLE IF NOT EXISTS "public"."lesson_question_upvotes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."lesson_question_upvotes" OWNER TO "postgres";

-- Primary key
ALTER TABLE ONLY "public"."lesson_question_upvotes"
    ADD CONSTRAINT "lesson_question_upvotes_pkey" PRIMARY KEY ("id");

-- Restricción única (un usuario solo puede votar una vez por pregunta)
ALTER TABLE ONLY "public"."lesson_question_upvotes"
    ADD CONSTRAINT "lesson_question_upvotes_unique" UNIQUE ("question_id", "user_id");

-- Foreign keys
ALTER TABLE ONLY "public"."lesson_question_upvotes"
    ADD CONSTRAINT "lesson_question_upvotes_question_id_fkey" 
    FOREIGN KEY ("question_id") REFERENCES "public"."lesson_questions"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."lesson_question_upvotes"
    ADD CONSTRAINT "lesson_question_upvotes_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


-- ============================================
-- 5. RLS Policies
-- ============================================

-- Habilitar RLS
ALTER TABLE "public"."lesson_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."lesson_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."lesson_question_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."lesson_question_upvotes" ENABLE ROW LEVEL SECURITY;

-- Políticas para lesson_notes (solo el estudiante puede ver/editar sus propias notas)
CREATE POLICY "lesson_notes_select_own" ON "public"."lesson_notes"
    FOR SELECT USING (
        student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    );

CREATE POLICY "lesson_notes_insert_own" ON "public"."lesson_notes"
    FOR INSERT WITH CHECK (
        student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    );

CREATE POLICY "lesson_notes_update_own" ON "public"."lesson_notes"
    FOR UPDATE USING (
        student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    );

CREATE POLICY "lesson_notes_delete_own" ON "public"."lesson_notes"
    FOR DELETE USING (
        student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    );

-- Políticas para lesson_questions (todos pueden ver, solo el autor puede editar)
CREATE POLICY "lesson_questions_select_all" ON "public"."lesson_questions"
    FOR SELECT USING (true);

CREATE POLICY "lesson_questions_insert_authenticated" ON "public"."lesson_questions"
    FOR INSERT WITH CHECK (
        student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    );

CREATE POLICY "lesson_questions_update_own" ON "public"."lesson_questions"
    FOR UPDATE USING (
        student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    );

CREATE POLICY "lesson_questions_delete_own" ON "public"."lesson_questions"
    FOR DELETE USING (
        student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    );

-- Políticas para lesson_question_answers (todos pueden ver, autenticados pueden responder)
CREATE POLICY "lesson_question_answers_select_all" ON "public"."lesson_question_answers"
    FOR SELECT USING (true);

CREATE POLICY "lesson_question_answers_insert_authenticated" ON "public"."lesson_question_answers"
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

CREATE POLICY "lesson_question_answers_update_own" ON "public"."lesson_question_answers"
    FOR UPDATE USING (
        user_id = auth.uid()
    );

CREATE POLICY "lesson_question_answers_delete_own" ON "public"."lesson_question_answers"
    FOR DELETE USING (
        user_id = auth.uid()
    );

-- Políticas para upvotes
CREATE POLICY "lesson_question_upvotes_select_all" ON "public"."lesson_question_upvotes"
    FOR SELECT USING (true);

CREATE POLICY "lesson_question_upvotes_insert_authenticated" ON "public"."lesson_question_upvotes"
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

CREATE POLICY "lesson_question_upvotes_delete_own" ON "public"."lesson_question_upvotes"
    FOR DELETE USING (
        user_id = auth.uid()
    );
