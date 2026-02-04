-- ============================================================================
-- Script: Insertar microcredenciales de prueba
-- Fecha: 2026-02-04
-- Descripción: Agrega 5 microcredenciales de prueba para verificar el grid
-- ============================================================================

-- Primero, obtener IDs de cursos existentes para usarlos
-- Consultar cursos disponibles:
-- SELECT id, title FROM courses WHERE is_published = true;

-- Suponiendo que tenemos estos cursos (actualiza los IDs según tu DB):
-- Necesitamos insertar usando pares de cursos existentes

-- Verificar cursos existentes primero
DO $$
DECLARE
    v_course_ids UUID[];
    v_count INT;
BEGIN
    -- Obtener IDs de cursos publicados
    SELECT ARRAY_AGG(id ORDER BY created_at)
    INTO v_course_ids
    FROM courses
    WHERE is_published = true
    LIMIT 10;
    
    v_count := COALESCE(array_length(v_course_ids, 1), 0);
    
    IF v_count < 2 THEN
        RAISE NOTICE 'Se necesitan al menos 2 cursos publicados. Cursos encontrados: %', v_count;
        RAISE EXCEPTION 'No hay suficientes cursos publicados para crear microcredenciales';
    END IF;
    
    RAISE NOTICE 'Cursos encontrados: %, IDs: %', v_count, v_course_ids;
END $$;

-- Insertar microcredenciales de prueba (usando los primeros 2 cursos como base)
-- NOTA: Ajusta los course_level_1_id y course_level_2_id según los cursos en tu DB

INSERT INTO microcredentials (
    id,
    title,
    slug,
    description,
    short_description,
    badge_image_url,
    badge_locked_image_url,
    course_level_1_id,
    course_level_2_id,
    is_free,
    price,
    sale_percentage,
    is_published,
    is_active,
    display_order,
    featured
)
SELECT 
    extensions.uuid_generate_v4(),
    mc.title,
    mc.slug,
    mc.description,
    mc.short_description,
    mc.badge_image_url,
    mc.badge_locked_image_url,
    -- Usar los primeros 2 cursos publicados
    (SELECT id FROM courses WHERE is_published = true ORDER BY created_at LIMIT 1),
    (SELECT id FROM courses WHERE is_published = true ORDER BY created_at OFFSET 1 LIMIT 1),
    mc.is_free,
    mc.price,
    mc.sale_percentage,
    true, -- is_published
    true, -- is_active
    mc.display_order,
    mc.featured
FROM (
    VALUES
    -- Microcredencial 2: Liderazgo y Gestión de Equipos
    (
        'Liderazgo y Gestión de Equipos',
        'liderazgo-gestion-equipos',
        'Desarrolla habilidades de liderazgo efectivo para dirigir equipos de alto rendimiento en entornos organizacionales dinámicos.',
        'Habilidades de liderazgo para equipos de alto rendimiento',
        'https://lhuqciwwklwbpkvxuvxs.supabase.co/storage/v1/object/public/covers/democracia_insights.png',
        'https://lhuqciwwklwbpkvxuvxs.supabase.co/storage/v1/object/public/covers/democracia_insights.png',
        false,
        1499.00,
        10,
        2,
        true
    ),
    -- Microcredencial 3: Fundamentos de Ciencia de Datos
    (
        'Fundamentos de Ciencia de Datos',
        'fundamentos-ciencia-datos',
        'Aprende las bases de análisis de datos, estadística aplicada y visualización para la toma de decisiones basada en evidencia.',
        'Bases de análisis de datos y estadística aplicada',
        'https://lhuqciwwklwbpkvxuvxs.supabase.co/storage/v1/object/public/covers/democracia_insights.png',
        'https://lhuqciwwklwbpkvxuvxs.supabase.co/storage/v1/object/public/covers/democracia_insights.png',
        false,
        1799.00,
        0,
        3,
        false
    ),
    -- Microcredencial 4: Innovación y Emprendimiento Sostenible
    (
        'Innovación y Emprendimiento Sostenible',
        'innovacion-emprendimiento-sostenible',
        'Desarrolla proyectos de emprendimiento con enfoque en innovación social y sostenibilidad ambiental.',
        'Emprendimiento con enfoque en innovación y sostenibilidad',
        'https://lhuqciwwklwbpkvxuvxs.supabase.co/storage/v1/object/public/covers/democracia_insights.png',
        'https://lhuqciwwklwbpkvxuvxs.supabase.co/storage/v1/object/public/covers/democracia_insights.png',
        true,
        0,
        0,
        4,
        true
    ),
    -- Microcredencial 5: Comunicación Digital Efectiva
    (
        'Comunicación Digital Efectiva',
        'comunicacion-digital-efectiva',
        'Domina las herramientas y estrategias de comunicación en entornos digitales para potenciar tu marca personal y profesional.',
        'Estrategias de comunicación en entornos digitales',
        'https://lhuqciwwklwbpkvxuvxs.supabase.co/storage/v1/object/public/covers/democracia_insights.png',
        'https://lhuqciwwklwbpkvxuvxs.supabase.co/storage/v1/object/public/covers/democracia_insights.png',
        false,
        999.00,
        20,
        5,
        false
    ),
    -- Microcredencial 6: Pensamiento Crítico y Resolución de Problemas
    (
        'Pensamiento Crítico y Resolución de Problemas',
        'pensamiento-critico-resolucion',
        'Fortalece tu capacidad analítica para abordar problemas complejos mediante metodologías estructuradas de pensamiento.',
        'Metodologías de análisis y resolución de problemas',
        'https://lhuqciwwklwbpkvxuvxs.supabase.co/storage/v1/object/public/covers/democracia_insights.png',
        'https://lhuqciwwklwbpkvxuvxs.supabase.co/storage/v1/object/public/covers/democracia_insights.png',
        false,
        1299.00,
        15,
        6,
        false
    )
) AS mc(title, slug, description, short_description, badge_image_url, badge_locked_image_url, is_free, price, sale_percentage, display_order, featured)
WHERE NOT EXISTS (
    SELECT 1 FROM microcredentials WHERE slug = mc.slug
);

-- Verificar inserción
SELECT id, title, slug, is_published, display_order 
FROM microcredentials 
WHERE is_published = true 
ORDER BY display_order;
