-- Actualizar URLs de imágenes de las microcredenciales de prueba
UPDATE microcredentials 
SET 
    badge_image_url = 'https://lhuqciwwklwbpkvxuvxs.supabase.co/storage/v1/object/public/covers/democracia_insights.png',
    badge_locked_image_url = 'https://lhuqciwwklwbpkvxuvxs.supabase.co/storage/v1/object/public/covers/democracia_insights.png'
WHERE slug IN (
    'liderazgo-gestion-equipos',
    'fundamentos-ciencia-datos',
    'innovacion-emprendimiento-sostenible',
    'comunicacion-digital-efectiva',
    'pensamiento-critico-resolucion'
);

-- Verificar la actualización
SELECT title, slug, badge_image_url FROM microcredentials WHERE is_published = true;
