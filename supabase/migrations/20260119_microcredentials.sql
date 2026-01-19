-- ============================================================================
-- MIGRACIÓN: Módulo de Microcredenciales
-- Fecha: 2026-01-19
-- Descripción: Tablas, triggers y RLS para el sistema de microcredenciales
-- ============================================================================

--------------------------------------------------------------
-- ENUM: Estado de microcredencial del estudiante
--------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.microcredential_status AS ENUM ('in_progress', 'completed', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.acquisition_type AS ENUM ('free', 'paid', 'gifted', 'promo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

--------------------------------------------------------------
-- TABLA 1: microcredentials (Definición del Producto)
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.microcredentials (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Información básica
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    
    -- Insignia/Badge
    badge_image_url TEXT NOT NULL,
    badge_locked_image_url TEXT,
    badge_color VARCHAR(20),
    
    -- Vinculación con cursos (siempre 2 niveles)
    course_level_1_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    course_level_2_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    
    -- Pricing
    is_free BOOLEAN DEFAULT false,
    price DECIMAL(10,2) DEFAULT 0,
    sale_percentage INTEGER DEFAULT 0 CHECK (sale_percentage >= 0 AND sale_percentage <= 100),
    
    -- Metadatos de catálogo
    is_published BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT false,
    
    -- Auditoría
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Restricción: Los cursos deben ser diferentes
    CONSTRAINT microcredentials_different_courses CHECK (course_level_1_id != course_level_2_id)
);

-- Comentarios
COMMENT ON TABLE public.microcredentials IS 'Definición de microcredenciales (Hard Bundle de 2 cursos)';
COMMENT ON COLUMN public.microcredentials.slug IS 'URL amigable para SEO';
COMMENT ON COLUMN public.microcredentials.course_level_1_id IS 'Curso requerido como Nivel 1 (debe completarse primero)';
COMMENT ON COLUMN public.microcredentials.course_level_2_id IS 'Curso requerido como Nivel 2 (se desbloquea al completar Nivel 1)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_microcredentials_slug ON public.microcredentials(slug);
CREATE INDEX IF NOT EXISTS idx_microcredentials_published ON public.microcredentials(is_published, is_active);
CREATE INDEX IF NOT EXISTS idx_microcredentials_featured ON public.microcredentials(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_microcredentials_level_1 ON public.microcredentials(course_level_1_id);
CREATE INDEX IF NOT EXISTS idx_microcredentials_level_2 ON public.microcredentials(course_level_2_id);

--------------------------------------------------------------
-- TABLA 2: microcredential_enrollments (Inscripción del Estudiante)
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.microcredential_enrollments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Relaciones
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    microcredential_id UUID NOT NULL REFERENCES public.microcredentials(id) ON DELETE CASCADE,
    
    -- Fechas de inscripción
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Tracking de progreso por nivel
    level_1_completed BOOLEAN DEFAULT false,
    level_1_completed_at TIMESTAMPTZ,
    level_2_unlocked BOOLEAN DEFAULT false,
    level_2_unlocked_at TIMESTAMPTZ,
    level_2_completed BOOLEAN DEFAULT false,
    level_2_completed_at TIMESTAMPTZ,
    
    -- Estado de la microcredencial
    status public.microcredential_status DEFAULT 'in_progress',
    completed_at TIMESTAMPTZ,
    
    -- Badge
    badge_unlocked BOOLEAN DEFAULT false,
    badge_unlocked_at TIMESTAMPTZ,
    badge_downloaded_at TIMESTAMPTZ,
    
    -- Certificado
    certificate_id UUID REFERENCES public.certificates(id),
    certificate_issued_at TIMESTAMPTZ,
    
    -- Datos de pago/adquisición
    acquisition_type public.acquisition_type DEFAULT 'free',
    payment_amount DECIMAL(10,2),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    payment_verified_at TIMESTAMPTZ,
    payment_verified_by UUID REFERENCES public.users(id),
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Restricción única
    CONSTRAINT unique_student_microcredential UNIQUE (student_id, microcredential_id)
);

-- Comentarios
COMMENT ON TABLE public.microcredential_enrollments IS 'Inscripciones de estudiantes a microcredenciales';
COMMENT ON COLUMN public.microcredential_enrollments.level_2_unlocked IS 'Se activa automáticamente al completar Nivel 1';
COMMENT ON COLUMN public.microcredential_enrollments.acquisition_type IS 'Tipo de adquisición: free, paid, gifted (regalo), promo';

-- Índices
CREATE INDEX IF NOT EXISTS idx_mc_enrollments_student ON public.microcredential_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_mc_enrollments_micro ON public.microcredential_enrollments(microcredential_id);
CREATE INDEX IF NOT EXISTS idx_mc_enrollments_status ON public.microcredential_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_mc_enrollments_badge ON public.microcredential_enrollments(badge_unlocked) WHERE badge_unlocked = true;
CREATE INDEX IF NOT EXISTS idx_mc_enrollments_payment ON public.microcredential_enrollments(payment_verified_at) WHERE acquisition_type = 'paid';

--------------------------------------------------------------
-- TRIGGER 1: Auto-inscribir en cursos al adquirir microcredencial
--------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_microcredential_enrollment()
RETURNS TRIGGER AS $$
DECLARE
    v_course_level_1_id UUID;
    v_course_level_2_id UUID;
BEGIN
    -- Obtener los IDs de cursos de la microcredencial
    SELECT course_level_1_id, course_level_2_id 
    INTO v_course_level_1_id, v_course_level_2_id
    FROM public.microcredentials 
    WHERE id = NEW.microcredential_id;
    
    -- Inscribir en Nivel 1 (acceso inmediato)
    INSERT INTO public.student_enrollments (student_id, course_id, progress, completed_lessons)
    VALUES (NEW.student_id, v_course_level_1_id, 0, '{}')
    ON CONFLICT (student_id, course_id) DO NOTHING;
    
    -- Inscribir en Nivel 2 (el acceso se controlará en el frontend)
    INSERT INTO public.student_enrollments (student_id, course_id, progress, completed_lessons)
    VALUES (NEW.student_id, v_course_level_2_id, 0, '{}')
    ON CONFLICT (student_id, course_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_microcredential_enrolled ON public.microcredential_enrollments;
CREATE TRIGGER on_microcredential_enrolled
    AFTER INSERT ON public.microcredential_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_microcredential_enrollment();

--------------------------------------------------------------
-- TRIGGER 2: Detectar completitud de cursos y actualizar microcredencial
--------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_microcredential_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_micro RECORD;
BEGIN
    -- Solo procesar si el progreso cambió a 100
    IF NEW.progress = 100 AND (OLD.progress IS NULL OR OLD.progress < 100) THEN
        
        -- Buscar microcredenciales donde este curso es nivel 1 o nivel 2
        FOR v_micro IN 
            SELECT 
                mc.id as micro_id,
                mc.course_level_1_id,
                mc.course_level_2_id,
                me.id as enrollment_id,
                me.level_1_completed,
                me.level_2_completed
            FROM public.microcredentials mc
            INNER JOIN public.microcredential_enrollments me 
                ON me.microcredential_id = mc.id
            WHERE me.student_id = NEW.student_id
            AND (mc.course_level_1_id = NEW.course_id OR mc.course_level_2_id = NEW.course_id)
        LOOP
            -- Si completó el Nivel 1
            IF v_micro.course_level_1_id = NEW.course_id AND NOT v_micro.level_1_completed THEN
                UPDATE public.microcredential_enrollments
                SET 
                    level_1_completed = true,
                    level_1_completed_at = NOW(),
                    level_2_unlocked = true,
                    level_2_unlocked_at = NOW(),
                    updated_at = NOW()
                WHERE id = v_micro.enrollment_id;
            END IF;
            
            -- Si completó el Nivel 2
            IF v_micro.course_level_2_id = NEW.course_id AND NOT v_micro.level_2_completed THEN
                UPDATE public.microcredential_enrollments
                SET 
                    level_2_completed = true,
                    level_2_completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = v_micro.enrollment_id;
            END IF;
            
            -- Verificar si ambos niveles están completos → desbloquear badge
            UPDATE public.microcredential_enrollments
            SET 
                status = 'completed',
                completed_at = NOW(),
                badge_unlocked = true,
                badge_unlocked_at = NOW(),
                updated_at = NOW()
            WHERE id = v_micro.enrollment_id
            AND level_1_completed = true
            AND level_2_completed = true
            AND badge_unlocked = false;
            
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_course_progress_for_microcredential ON public.student_enrollments;
CREATE TRIGGER on_course_progress_for_microcredential
    AFTER UPDATE OF progress ON public.student_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.check_microcredential_progress();

--------------------------------------------------------------
-- TRIGGER 3: Actualizar updated_at automáticamente
--------------------------------------------------------------
DROP TRIGGER IF EXISTS update_microcredentials_updated_at ON public.microcredentials;
CREATE TRIGGER update_microcredentials_updated_at
    BEFORE UPDATE ON public.microcredentials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_mc_enrollments_updated_at ON public.microcredential_enrollments;
CREATE TRIGGER update_mc_enrollments_updated_at
    BEFORE UPDATE ON public.microcredential_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

--------------------------------------------------------------
-- RLS: Row Level Security
--------------------------------------------------------------

-- Habilitar RLS
ALTER TABLE public.microcredentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.microcredential_enrollments ENABLE ROW LEVEL SECURITY;

-- Políticas para microcredentials
DROP POLICY IF EXISTS "microcredentials_public_read" ON public.microcredentials;
CREATE POLICY "microcredentials_public_read" ON public.microcredentials
    FOR SELECT
    USING (is_published = true AND is_active = true);

DROP POLICY IF EXISTS "microcredentials_admin_all" ON public.microcredentials;
CREATE POLICY "microcredentials_admin_all" ON public.microcredentials
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
    );

-- Políticas para microcredential_enrollments
DROP POLICY IF EXISTS "mc_enrollments_student_read" ON public.microcredential_enrollments;
CREATE POLICY "mc_enrollments_student_read" ON public.microcredential_enrollments
    FOR SELECT
    USING (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "mc_enrollments_student_insert" ON public.microcredential_enrollments;
CREATE POLICY "mc_enrollments_student_insert" ON public.microcredential_enrollments
    FOR INSERT
    WITH CHECK (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "mc_enrollments_admin_all" ON public.microcredential_enrollments;
CREATE POLICY "mc_enrollments_admin_all" ON public.microcredential_enrollments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
    );

--------------------------------------------------------------
-- FIN DE LA MIGRACIÓN
--------------------------------------------------------------
