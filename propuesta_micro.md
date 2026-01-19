1. Propuesta de Arquitectura (El Modelo "Contenedor Maestro")
Mantendremos la tabla courses intacta. La Microcredencial funcionará como un "Contenedor Maestro" que agrupa dos cursos.

Entidad Microcredencial: Define el producto que se vende o se asigna (Título, Precio/Gratis, Insignia).

Lógica de Acceso "Llave Maestra": Al adquirir la microcredencial, el sistema no solo registra la compra del programa, sino que inyecta automáticamente los registros de inscripción en la tabla enrollments para el Nivel 1 y el Nivel 2.

2. Estructura de Navegación y UX (Sidebar)
Para dar la prioridad que requieren los dueños, el menú lateral (Sidebar) se reestructura así:

Dashboard (Resumen del alumno).

Catálogo (Grupo colapsable o sección):

Microcredenciales (⭐ Item Principal): Aquí se muestran las tarjetas grandes con las insignias. Es la vista por defecto al querer "Explorar".

Cursos (Item Secundario): Listado general de cursos para quien busca algo específico fuera de una ruta.

Mis Clases: Donde el alumno ve los cursos activos (aquí aparecerán el Nivel 1 y 2 mezclados con otros cursos, o agrupados por microcredencial según prefieras en el frontend).

Credenciales / Mis Insignias: Aquí aparece la insignia a color una vez completados ambos niveles.

3. Lógica de Negocio Ajustada
A. Inscripción Única (El "Hard Bundle")

Gratis vs. Pago: La tabla de Microcredenciales tendrá un campo price y un booleano is_free.

Acción: Cuando el usuario hace clic en "Obtener Microcredencial" (Si es gratis) o completa el pago (Stripe/MercadoPago):

El backend valida la transacción.

Se crea un registro en user_microcredentials (estado: in_progress).

Automáticamente el backend busca los ID de los 2 cursos asociados y crea 2 registros en la tabla enrollments para ese usuario.

El usuario obtiene acceso inmediato a ambos contenidos.

B. Validación de Insignia (Trigger de Progreso)

Cada vez que se completa un curso (status = 'completed' en enrollments o progress = 100), el sistema verifica:

¿Este curso pertenece a una Microcredencial activa del usuario?

Si sí -> ¿El otro curso asociado ya está completado también?

Si ambos están completados -> Actualiza el estado de la Microcredencial a completed y desbloquea la visualización de la insignia en el menú "Credenciales".

4. Flujos de Negocio (Paso a Paso)
Flujo 1: Administrador (Creación del Producto)
Crear Contenido: El Admin sube el "Curso A" (Nivel 1) y el "Curso B" (Nivel 2) en el módulo de Cursos normal.

Crear Microcredencial: Va a la sección "Gestión de Microcredenciales".

Ingresa Nombre: "Cultura de la democracia".

Sube la Imagen de la Insignia.

Define Precio (ej. $500 MXN) o marca el check de "Gratuito".

Vinculación:

Selecciona el "Curso A" como Nivel 1.

Selecciona el "Curso B" como Nivel 2.

Publicar: Activa la microcredencial para que sea visible en el Catálogo.

Flujo 2: Estudiante (Adquisición y Consumo)
Exploración: Entra al Sidebar > Catálogo > Microcredenciales. Ve la insignia y la promesa de valor.

Adquisición:

Entra al detalle. Ve que incluye "Nivel 1" y "Nivel 2".

Hace clic en "Inscribirme" (Gratis) o "Comprar" (Pago).

Activación: El sistema le confirma: "¡Felicidades! Ya tienes acceso a la ruta completa".

Estudio: Va a "Mis Clases". Ahí ve disponibles ambos cursos.

Recompensa:

Termina el Nivel 1 (La insignia sigue bloqueada/gris en su perfil).

Termina el Nivel 2.

El sistema le notifica: "Has obtenido la Microcredencial en Cultura de la Democracia".

La insignia aparece a todo color en la sección "Credenciales".

5. Implementación SQL (Base de Datos)
Dado tu archivo completo.sql, estas son las tablas nuevas que debes agregar para soportar esta lógica sin romper lo existente. Copia y pega esto en tu editor SQL de Supabase:

SQL
--------------------------------------------------------------
-- 1. Tabla de Definición de Microcredenciales (El Producto)
--------------------------------------------------------------
CREATE TABLE public.microcredentials (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    badge_image_url TEXT NOT NULL, -- La imagen dorada
    is_free BOOLEAN DEFAULT false,
    price NUMERIC(10, 2) DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT microcredentials_pkey PRIMARY KEY (id)
);

--------------------------------------------------------------
-- 2. Tabla de Vinculación (Qué cursos forman la Microcredencial)
--------------------------------------------------------------
CREATE TABLE public.microcredential_items (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    microcredential_id UUID NOT NULL,
    course_id UUID NOT NULL,
    level_order INTEGER NOT NULL, -- 1 o 2 (Para saber el orden)
    
    CONSTRAINT microcredential_items_pkey PRIMARY KEY (id),
    CONSTRAINT fk_micro_parent FOREIGN KEY (microcredential_id) REFERENCES public.microcredentials (id) ON DELETE CASCADE,
    CONSTRAINT fk_course_child FOREIGN KEY (course_id) REFERENCES public.courses (id) ON DELETE CASCADE,
    CONSTRAINT unique_course_in_micro UNIQUE (microcredential_id, course_id) -- Evita duplicar el mismo curso en la misma micro
);

--------------------------------------------------------------
-- 3. Tabla de Progreso/Propiedad del Usuario (Enrollment a la Micro)
--------------------------------------------------------------
CREATE TABLE public.user_microcredentials (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    microcredential_id UUID NOT NULL,
    status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed'
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT user_microcredentials_pkey PRIMARY KEY (id),
    CONSTRAINT fk_user_owner FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_micro_ref FOREIGN KEY (microcredential_id) REFERENCES public.microcredentials (id) ON DELETE CASCADE,
    CONSTRAINT unique_user_micro UNIQUE (user_id, microcredential_id)
);

--------------------------------------------------------------
-- 4. Permisos Básicos (RLS - Row Level Security)
--------------------------------------------------------------
-- Habilitar seguridad
ALTER TABLE public.microcredentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.microcredential_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_microcredentials ENABLE ROW LEVEL SECURITY;

-- Políticas (Policies)
-- Todo el mundo puede ver las microcredenciales publicadas (Catalogo)
CREATE POLICY "Microcredentials public view" ON public.microcredentials
    FOR SELECT USING (is_published = true);

-- Todo el mundo puede ver qué cursos las componen
CREATE POLICY "Microcredential items public view" ON public.microcredential_items
    FOR SELECT USING (true);

-- El usuario solo puede ver sus propias microcredenciales adquiridas
CREATE POLICY "User view own microcredentials" ON public.user_microcredentials
    FOR SELECT USING (auth.uid() = user_id);

-- El usuario puede adquirir (insertar) si la lógica de negocio (backend) lo permite
CREATE POLICY "User acquire microcredential" ON public.user_microcredentials
    FOR INSERT WITH CHECK (auth.uid() = user_id);
----------

Resumen de Cambios Técnicos Necesarios en el Backend
API de Compra/Inscripción: Cuando el endpoint /api/enroll-microcredential recibe una solicitud:

Inserta en user_microcredentials.

Hace un SELECT course_id FROM microcredential_items WHERE microcredential_id = X.

Recorre esos IDs e inserta en la tabla enrollments (o course_users según tu esquema actual) para dar acceso a los cursos.

Visualización: En el frontend, la vista de "Catálogo > Microcredenciales" hace un fetch a la tabla microcredentials. La vista de "Credenciales" hace un fetch a user_microcredentials filtrando donde status = 'completed'.