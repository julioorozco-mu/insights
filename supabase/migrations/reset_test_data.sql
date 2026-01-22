-- ============================================================================
-- RESET COMPLETO: Eliminar TODOS los datos de estudiantes (A prueba de fallos)
-- ⚠️ SOLO EJECUTAR EN AMBIENTE DE PRUEBAS
-- ⚠️ Los estudiantes quedarán como usuarios nuevos sin ninguna actividad
-- ============================================================================

-- Función auxiliar para limpiar tabla si existe (evita errores si no existe)
-- No se puede declarar funciones en scripts simples a veces, así que usaremos bloques DO

-- Paso 1: Eliminar reseñas y calificaciones de cursos
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_reviews') THEN
        DELETE FROM public.course_reviews;
    END IF;
END $$;

-- Paso 2: Eliminar cursos favoritos
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_favorites') THEN
        DELETE FROM public.course_favorites;
    END IF;
END $$;

-- Paso 3: Eliminar acreditaciones de cursos
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_accreditations') THEN
        DELETE FROM public.course_accreditations;
    END IF;
END $$;

-- Paso 4: Eliminar respuestas a evaluaciones finales
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'test_answers') THEN
        DELETE FROM public.test_answers;
    END IF;
END $$;

-- Paso 5: Eliminar intentos de evaluaciones finales
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'test_attempts') THEN
        DELETE FROM public.test_attempts;
    END IF;
END $$;

-- Paso 6: Eliminar respuestas a formularios/quizzes de lecciones
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_answers') THEN
        DELETE FROM public.student_answers;
    END IF;
END $$;

-- Paso 7: Eliminar asistencia a lecciones (encuestas, polls, tiempo en vivo)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lesson_attendance') THEN
        DELETE FROM public.lesson_attendance;
    END IF;
END $$;

-- Paso 8: Eliminar notas de lecciones
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lesson_notes') THEN
        DELETE FROM public.lesson_notes;
    END IF;
END $$;

-- Paso 9: Eliminar preguntas de estudiantes en lecciones
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lesson_question_upvotes') THEN
        DELETE FROM public.lesson_question_upvotes;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lesson_question_answers') THEN
        DELETE FROM public.lesson_question_answers;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lesson_questions') THEN
        DELETE FROM public.lesson_questions;
    END IF;
END $$;

-- Paso 10: Eliminar respuestas a encuestas (entry/exit surveys)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'survey_responses') THEN
        DELETE FROM public.survey_responses;
    END IF;
END $$;

-- Paso 11: Eliminar inscripciones a microcredenciales
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'microcredential_enrollments') THEN
        DELETE FROM public.microcredential_enrollments;
    END IF;
END $$;

-- Paso 12: Eliminar inscripciones a cursos individuales
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_enrollments') THEN
        DELETE FROM public.student_enrollments;
    END IF;
END $$;

-- Paso 13: Resetear tabla de estudiantes (si existe)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
        UPDATE public.students
        SET 
            completed_courses = '{}',
            certificates = '{}',
            extra_data = '{}',
            updated_at = NOW();
    END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
-- Nota: La verificación fallará si las tablas no existen, así que usamos un SELECT simple con una advertencia
SELECT '✅ Reset intentado en todas las tablas detectadas' as status;