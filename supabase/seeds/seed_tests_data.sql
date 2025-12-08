-- ============================================================================
-- SEED: Datos de prueba para Sistema de Evaluaciones de Acreditación
-- 
-- IMPORTANTE: Ejecutar DESPUÉS de la migración add_tests_tables.sql
-- 
-- Este script crea:
-- - 3 evaluaciones de prueba
-- - 10 preguntas por evaluación (varios tipos)
-- - Vinculación a cursos existentes (si hay)
-- ============================================================================

-- ============================================================================
-- FUNCIÓN AUXILIAR para obtener un usuario admin/teacher
-- ============================================================================

DO $$
DECLARE
    v_admin_id uuid;
    v_teacher_id uuid;
    v_course_id uuid;
    v_test_1_id uuid;
    v_test_2_id uuid;
    v_test_3_id uuid;
    v_course_test_1_id uuid;
BEGIN
    -- Obtener un admin o teacher existente
    SELECT id INTO v_admin_id 
    FROM public.users 
    WHERE role IN ('admin', 'superadmin', 'teacher') 
    LIMIT 1;
    
    -- Si no hay admin/teacher, usar cualquier usuario
    IF v_admin_id IS NULL THEN
        SELECT id INTO v_admin_id FROM public.users LIMIT 1;
    END IF;
    
    -- Si no hay usuarios, salir
    IF v_admin_id IS NULL THEN
        RAISE NOTICE 'No hay usuarios en la base de datos. Creando usuario de prueba...';
        -- Crear un usuario de prueba si no existe ninguno
        INSERT INTO public.users (id, email, name, role, is_verified)
        VALUES (
            extensions.uuid_generate_v4(),
            'admin.test@example.com',
            'Admin Test',
            'admin',
            true
        )
        RETURNING id INTO v_admin_id;
    END IF;
    
    RAISE NOTICE 'Usando usuario ID: %', v_admin_id;
    
    -- Obtener un curso existente (opcional)
    SELECT id INTO v_course_id FROM public.courses WHERE is_active = true LIMIT 1;
    
    RAISE NOTICE 'Curso encontrado: %', COALESCE(v_course_id::text, 'NINGUNO');

    -- ============================================================================
    -- EVALUACIÓN 1: Fundamentos de Programación
    -- ============================================================================
    
    INSERT INTO public.tests (
        id, title, description, instructions, status, time_mode, 
        time_limit_minutes, passing_score, max_attempts, 
        shuffle_questions, shuffle_options, show_results_immediately,
        show_correct_answers, allow_review, created_by, is_active
    ) VALUES (
        extensions.uuid_generate_v4(),
        'Evaluación de Acreditación: Fundamentos de Programación',
        'Esta evaluación determina si acreditas la microcredencial de Fundamentos de Programación. Debes obtener al menos 70% para aprobar.',
        'Lee cuidadosamente cada pregunta antes de responder. Tienes 60 minutos para completar la evaluación. Una vez iniciada, no podrás pausarla.',
        'published',
        'timed',
        60,
        70,
        3,
        true,
        true,
        true,
        true,
        true,
        v_admin_id,
        true
    ) RETURNING id INTO v_test_1_id;
    
    RAISE NOTICE 'Evaluación 1 creada: %', v_test_1_id;

    -- Preguntas para Evaluación 1
    INSERT INTO public.test_questions (test_id, question_type, question_text, options, correct_answer, explanation, points, "order", is_required) VALUES
    (v_test_1_id, 'multiple_choice', '¿Cuál es la salida del siguiente código?\n\nlet x = 5;\nlet y = "5";\nconsole.log(x == y);', 
     '[{"id":"a","text":"true"},{"id":"b","text":"false"},{"id":"c","text":"undefined"},{"id":"d","text":"Error"}]',
     '"a"', 'El operador == realiza coerción de tipos, por lo que 5 == "5" es true.', 10, 1, true),
    
    (v_test_1_id, 'multiple_choice', '¿Qué es una variable en programación?',
     '[{"id":"a","text":"Un valor que nunca cambia"},{"id":"b","text":"Un espacio en memoria para almacenar datos"},{"id":"c","text":"Un tipo de función"},{"id":"d","text":"Un operador matemático"}]',
     '"b"', 'Una variable es un espacio en memoria que almacena datos y puede cambiar durante la ejecución del programa.', 10, 2, true),
    
    (v_test_1_id, 'true_false', '¿En JavaScript, const significa que el valor nunca puede modificarse?',
     '[{"id":"true","text":"Verdadero"},{"id":"false","text":"Falso"}]',
     '"false"', 'const impide reasignar la referencia, pero si es un objeto o array, sus propiedades/elementos pueden modificarse.', 10, 3, true),
    
    (v_test_1_id, 'multiple_answer', '¿Cuáles de los siguientes son tipos de datos primitivos en JavaScript? (Selecciona todas las correctas)',
     '[{"id":"a","text":"string"},{"id":"b","text":"number"},{"id":"c","text":"array"},{"id":"d","text":"boolean"},{"id":"e","text":"object"}]',
     '["a","b","d"]', 'Los tipos primitivos en JavaScript son: string, number, boolean, null, undefined, symbol y bigint. Array y object son tipos de referencia.', 15, 4, true),
    
    (v_test_1_id, 'multiple_choice', '¿Qué estructura de control se usa para ejecutar código repetidamente?',
     '[{"id":"a","text":"if-else"},{"id":"b","text":"switch"},{"id":"c","text":"for/while"},{"id":"d","text":"try-catch"}]',
     '"c"', 'Los bucles for y while se utilizan para ejecutar código de forma repetitiva.', 10, 5, true),
    
    (v_test_1_id, 'reorder', 'Ordena los siguientes pasos para crear una función en JavaScript:',
     '[{"id":"1","text":"Definir parámetros"},{"id":"2","text":"Usar la palabra clave function"},{"id":"3","text":"Escribir el nombre de la función"},{"id":"4","text":"Escribir el cuerpo de la función"},{"id":"5","text":"Usar return si es necesario"}]',
     '["2","3","1","4","5"]', 'El orden correcto es: function nombreFuncion(parametros) { cuerpo; return valor; }', 15, 6, true),
    
    (v_test_1_id, 'multiple_choice', '¿Cuál es el resultado de 10 % 3?',
     '[{"id":"a","text":"3"},{"id":"b","text":"1"},{"id":"c","text":"3.33"},{"id":"d","text":"0"}]',
     '"b"', 'El operador módulo (%) devuelve el residuo de la división. 10 / 3 = 3 con residuo 1.', 10, 7, true),
    
    (v_test_1_id, 'true_false', '¿Un array puede contener elementos de diferentes tipos de datos?',
     '[{"id":"true","text":"Verdadero"},{"id":"false","text":"Falso"}]',
     '"true"', 'En JavaScript, los arrays pueden contener cualquier tipo de dato, incluso mezclados.', 10, 8, true),
    
    (v_test_1_id, 'open_ended', 'Explica brevemente qué es el alcance (scope) de una variable y los tipos que existen.',
     '[]', null, 'El scope determina dónde puede accederse a una variable. Tipos: global, local (función), y bloque (let/const).', 10, 9, true),
    
    (v_test_1_id, 'multiple_choice', '¿Qué método se usa para agregar un elemento al final de un array?',
     '[{"id":"a","text":"push()"},{"id":"b","text":"pop()"},{"id":"c","text":"shift()"},{"id":"d","text":"unshift()"}]',
     '"a"', 'push() agrega elementos al final, pop() remueve del final, shift() remueve del inicio, unshift() agrega al inicio.', 10, 10, true);

    -- ============================================================================
    -- EVALUACIÓN 2: Desarrollo Web Frontend
    -- ============================================================================
    
    INSERT INTO public.tests (
        id, title, description, instructions, status, time_mode, 
        time_limit_minutes, passing_score, max_attempts, 
        shuffle_questions, shuffle_options, show_results_immediately,
        show_correct_answers, allow_review, created_by, is_active
    ) VALUES (
        extensions.uuid_generate_v4(),
        'Evaluación de Acreditación: Desarrollo Web Frontend',
        'Examen final para acreditar la microcredencial de Desarrollo Web Frontend. Incluye HTML, CSS y JavaScript.',
        'Esta evaluación cubre los fundamentos del desarrollo web frontend. Tiempo límite: 45 minutos. Calificación mínima: 75%.',
        'published',
        'timed',
        45,
        75,
        2,
        true,
        true,
        true,
        false,
        true,
        v_admin_id,
        true
    ) RETURNING id INTO v_test_2_id;
    
    RAISE NOTICE 'Evaluación 2 creada: %', v_test_2_id;

    -- Preguntas para Evaluación 2
    INSERT INTO public.test_questions (test_id, question_type, question_text, options, correct_answer, explanation, points, "order", is_required) VALUES
    (v_test_2_id, 'multiple_choice', '¿Qué etiqueta HTML se usa para definir el título de una página?',
     '[{"id":"a","text":"<header>"},{"id":"b","text":"<title>"},{"id":"c","text":"<h1>"},{"id":"d","text":"<meta>"}]',
     '"b"', 'La etiqueta <title> define el título que aparece en la pestaña del navegador.', 10, 1, true),
    
    (v_test_2_id, 'multiple_choice', '¿Cuál propiedad CSS se usa para cambiar el color de fondo?',
     '[{"id":"a","text":"color"},{"id":"b","text":"background-color"},{"id":"c","text":"bg-color"},{"id":"d","text":"fill"}]',
     '"b"', 'background-color define el color de fondo de un elemento.', 10, 2, true),
    
    (v_test_2_id, 'multiple_answer', '¿Cuáles son selectores válidos en CSS? (Selecciona todas las correctas)',
     '[{"id":"a","text":".clase"},{"id":"b","text":"#id"},{"id":"c","text":"@elemento"},{"id":"d","text":"elemento"},{"id":"e","text":"*"}]',
     '["a","b","d","e"]', '.clase para clases, #id para IDs, elemento para etiquetas, * selector universal. @ no es un selector válido.', 15, 3, true),
    
    (v_test_2_id, 'true_false', '¿Flexbox y Grid son sistemas de layout en CSS?',
     '[{"id":"true","text":"Verdadero"},{"id":"false","text":"Falso"}]',
     '"true"', 'Flexbox y CSS Grid son sistemas de layout modernos para crear diseños responsivos.', 10, 4, true),
    
    (v_test_2_id, 'multiple_choice', '¿Qué atributo HTML hace que un enlace se abra en una nueva pestaña?',
     '[{"id":"a","text":"href=\"_blank\""},{"id":"b","text":"target=\"_blank\""},{"id":"c","text":"rel=\"new\""},{"id":"d","text":"open=\"new\""}]',
     '"b"', 'target="_blank" abre el enlace en una nueva pestaña o ventana.', 10, 5, true),
    
    (v_test_2_id, 'match', 'Empareja cada propiedad CSS con su función:',
     '{"left":[{"id":"1","text":"margin"},{"id":"2","text":"padding"},{"id":"3","text":"border"},{"id":"4","text":"display"}],"right":[{"id":"a","text":"Espacio interno"},{"id":"b","text":"Espacio externo"},{"id":"c","text":"Línea alrededor del elemento"},{"id":"d","text":"Tipo de visualización"}],"pairs":[]}',
     '{"1":"b","2":"a","3":"c","4":"d"}', 'margin = espacio externo, padding = espacio interno, border = borde, display = tipo de visualización.', 20, 6, true),
    
    (v_test_2_id, 'multiple_choice', '¿Cuál es la forma correcta de seleccionar un elemento por ID en JavaScript?',
     '[{"id":"a","text":"document.getElement(\"id\")"},{"id":"b","text":"document.getElementById(\"id\")"},{"id":"c","text":"document.querySelector(\"id\")"},{"id":"d","text":"document.select(\"#id\")"}]',
     '"b"', 'document.getElementById() selecciona un elemento por su ID. También funciona querySelector("#id").', 10, 7, true),
    
    (v_test_2_id, 'true_false', '¿HTML es un lenguaje de programación?',
     '[{"id":"true","text":"Verdadero"},{"id":"false","text":"Falso"}]',
     '"false"', 'HTML es un lenguaje de marcado (markup language), no un lenguaje de programación.', 10, 8, true),
    
    (v_test_2_id, 'open_ended', '¿Qué es el modelo de caja (box model) en CSS y cuáles son sus componentes?',
     '[]', null, 'El box model define cómo se calculan las dimensiones de un elemento: content, padding, border y margin.', 5, 9, true),
    
    (v_test_2_id, 'multiple_choice', '¿Qué significa DOM?',
     '[{"id":"a","text":"Document Object Model"},{"id":"b","text":"Data Object Management"},{"id":"c","text":"Document Oriented Markup"},{"id":"d","text":"Display Object Model"}]',
     '"a"', 'DOM = Document Object Model, es la representación estructurada del documento HTML.', 10, 10, true);

    -- ============================================================================
    -- EVALUACIÓN 3: Sin tiempo límite (práctica)
    -- ============================================================================
    
    INSERT INTO public.tests (
        id, title, description, instructions, status, time_mode, 
        time_limit_minutes, passing_score, max_attempts, 
        shuffle_questions, shuffle_options, show_results_immediately,
        show_correct_answers, allow_review, created_by, is_active
    ) VALUES (
        extensions.uuid_generate_v4(),
        'Evaluación de Acreditación: Bases de Datos',
        'Evaluación para acreditar conocimientos en bases de datos relacionales y SQL.',
        'Esta evaluación no tiene límite de tiempo. Puedes tomarte el tiempo que necesites.',
        'draft',
        'unlimited',
        null,
        65,
        5,
        false,
        false,
        true,
        true,
        true,
        v_admin_id,
        true
    ) RETURNING id INTO v_test_3_id;
    
    RAISE NOTICE 'Evaluación 3 creada: %', v_test_3_id;

    -- Preguntas para Evaluación 3
    INSERT INTO public.test_questions (test_id, question_type, question_text, options, correct_answer, explanation, points, "order", is_required) VALUES
    (v_test_3_id, 'multiple_choice', '¿Qué significa SQL?',
     '[{"id":"a","text":"Structured Query Language"},{"id":"b","text":"Simple Query Language"},{"id":"c","text":"Standard Query Logic"},{"id":"d","text":"System Query Language"}]',
     '"a"', 'SQL significa Structured Query Language (Lenguaje de Consulta Estructurado).', 10, 1, true),
    
    (v_test_3_id, 'multiple_choice', '¿Cuál comando se usa para crear una nueva tabla?',
     '[{"id":"a","text":"NEW TABLE"},{"id":"b","text":"CREATE TABLE"},{"id":"c","text":"ADD TABLE"},{"id":"d","text":"MAKE TABLE"}]',
     '"b"', 'CREATE TABLE es el comando SQL estándar para crear tablas.', 10, 2, true),
    
    (v_test_3_id, 'multiple_answer', '¿Cuáles son tipos de JOIN en SQL? (Selecciona todas las correctas)',
     '[{"id":"a","text":"INNER JOIN"},{"id":"b","text":"LEFT JOIN"},{"id":"c","text":"OUTER JOIN"},{"id":"d","text":"MIDDLE JOIN"},{"id":"e","text":"RIGHT JOIN"}]',
     '["a","b","c","e"]', 'Los tipos de JOIN son: INNER, LEFT, RIGHT, FULL OUTER. No existe MIDDLE JOIN.', 15, 3, true),
    
    (v_test_3_id, 'true_false', '¿Una PRIMARY KEY puede contener valores NULL?',
     '[{"id":"true","text":"Verdadero"},{"id":"false","text":"Falso"}]',
     '"false"', 'Una PRIMARY KEY debe ser única y no puede contener valores NULL.', 10, 4, true),
    
    (v_test_3_id, 'multiple_choice', '¿Qué cláusula se usa para filtrar resultados?',
     '[{"id":"a","text":"FILTER"},{"id":"b","text":"WHERE"},{"id":"c","text":"HAVING"},{"id":"d","text":"SELECT"}]',
     '"b"', 'WHERE filtra filas antes del agrupamiento, HAVING filtra después del GROUP BY.', 10, 5, true);

    -- ============================================================================
    -- VINCULAR EVALUACIONES A CURSOS (si hay cursos existentes)
    -- ============================================================================
    
    IF v_course_id IS NOT NULL THEN
        INSERT INTO public.course_tests (
            test_id, course_id, is_required, require_all_sections, created_by
        ) VALUES (
            v_test_1_id, v_course_id, true, true, v_admin_id
        ) RETURNING id INTO v_course_test_1_id;
        
        RAISE NOTICE 'Evaluación 1 vinculada al curso: %', v_course_id;
    END IF;
    
    -- ============================================================================
    -- RESUMEN
    -- ============================================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'DATOS DE PRUEBA CREADOS EXITOSAMENTE';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Evaluaciones creadas: 3';
    RAISE NOTICE '- Fundamentos de Programación (publicada, 60 min)';
    RAISE NOTICE '- Desarrollo Web Frontend (publicada, 45 min)';
    RAISE NOTICE '- Bases de Datos (borrador, sin límite)';
    RAISE NOTICE '';
    RAISE NOTICE 'Total de preguntas: 25';
    RAISE NOTICE '============================================';

END $$;

-- Verificar datos creados
SELECT 
    t.id,
    t.title,
    t.status,
    t.time_mode,
    t.passing_score,
    COUNT(q.id) as total_questions
FROM public.tests t
LEFT JOIN public.test_questions q ON q.test_id = t.id
GROUP BY t.id, t.title, t.status, t.time_mode, t.passing_score
ORDER BY t.created_at DESC;

