/**
 * Repository para Microcredenciales
 * MicroCert by Marca UNACH
 */

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { TABLES } from '@/utils/constants';
import {
    Microcredential,
    MicrocredentialWithCourses,
    MicrocredentialEnrollment,
    MicrocredentialEnrollmentWithDetails,
    CreateMicrocredentialData,
    UpdateMicrocredentialData,
    mapMicrocredentialFromDB,
    mapEnrollmentFromDB,
    mapMicrocredentialToDB,
    mapMicrocredentialUpdateToDB,
} from '@/types/microcredential';

// ============================================================================
// SLUG UTILITIES
// ============================================================================

/**
 * Genera un slug a partir del título
 */
function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
        .replace(/\s+/g, '-') // Espacios a guiones
        .replace(/-+/g, '-') // Múltiples guiones a uno
        .trim();
}

// ============================================================================
// MICROCREDENTIAL QUERIES
// ============================================================================

/**
 * Obtiene todas las microcredenciales publicadas (para catálogo público)
 */
async function findAllPublished(): Promise<MicrocredentialWithCourses[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from(TABLES.MICROCREDENTIALS)
        .select(`
      *,
      courseLevel1:courses!microcredentials_course_level_1_id_fkey(id, title, description, cover_image_url, thumbnail_url, duration_minutes, difficulty),
      courseLevel2:courses!microcredentials_course_level_2_id_fkey(id, title, description, cover_image_url, thumbnail_url, duration_minutes, difficulty)
    `)
        .eq('is_published', true)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

    if (error) {
        console.error('[microcredentialRepository] Error finding published:', error);
        throw error;
    }

    return (data || []).map((row: any) => ({
        ...mapMicrocredentialFromDB(row),
        courseLevel1: row.courseLevel1 ? {
            id: row.courseLevel1.id,
            title: row.courseLevel1.title,
            description: row.courseLevel1.description,
            coverImageUrl: row.courseLevel1.cover_image_url,
            thumbnailUrl: row.courseLevel1.thumbnail_url,
            durationMinutes: row.courseLevel1.duration_minutes,
            difficulty: row.courseLevel1.difficulty,
        } : undefined,
        courseLevel2: row.courseLevel2 ? {
            id: row.courseLevel2.id,
            title: row.courseLevel2.title,
            description: row.courseLevel2.description,
            coverImageUrl: row.courseLevel2.cover_image_url,
            thumbnailUrl: row.courseLevel2.thumbnail_url,
            durationMinutes: row.courseLevel2.duration_minutes,
            difficulty: row.courseLevel2.difficulty,
        } : undefined,
    }));
}

/**
 * Obtiene todas las microcredenciales (para admin)
 */
async function findAll(): Promise<MicrocredentialWithCourses[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from(TABLES.MICROCREDENTIALS)
        .select(`
      *,
      courseLevel1:courses!microcredentials_course_level_1_id_fkey(id, title, description, cover_image_url, thumbnail_url),
      courseLevel2:courses!microcredentials_course_level_2_id_fkey(id, title, description, cover_image_url, thumbnail_url)
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[microcredentialRepository] Error finding all:', error);
        throw error;
    }

    return (data || []).map((row: any) => ({
        ...mapMicrocredentialFromDB(row),
        courseLevel1: row.courseLevel1 ? {
            id: row.courseLevel1.id,
            title: row.courseLevel1.title,
            description: row.courseLevel1.description,
            coverImageUrl: row.courseLevel1.cover_image_url,
            thumbnailUrl: row.courseLevel1.thumbnail_url,
            durationMinutes: null,
            difficulty: null,
        } : undefined,
        courseLevel2: row.courseLevel2 ? {
            id: row.courseLevel2.id,
            title: row.courseLevel2.title,
            description: row.courseLevel2.description,
            coverImageUrl: row.courseLevel2.cover_image_url,
            thumbnailUrl: row.courseLevel2.thumbnail_url,
            durationMinutes: null,
            difficulty: null,
        } : undefined,
    }));
}

/**
 * Busca una microcredencial por ID
 */
async function findById(id: string): Promise<MicrocredentialWithCourses | null> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from(TABLES.MICROCREDENTIALS)
        .select(`
      *,
      courseLevel1:courses!microcredentials_course_level_1_id_fkey(id, title, description, cover_image_url, thumbnail_url, duration_minutes, difficulty),
      courseLevel2:courses!microcredentials_course_level_2_id_fkey(id, title, description, cover_image_url, thumbnail_url, duration_minutes, difficulty)
    `)
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('[microcredentialRepository] Error finding by id:', error);
        throw error;
    }

    if (!data) return null;

    return {
        ...mapMicrocredentialFromDB(data),
        courseLevel1: data.courseLevel1 ? {
            id: data.courseLevel1.id,
            title: data.courseLevel1.title,
            description: data.courseLevel1.description,
            coverImageUrl: data.courseLevel1.cover_image_url,
            thumbnailUrl: data.courseLevel1.thumbnail_url,
            durationMinutes: data.courseLevel1.duration_minutes,
            difficulty: data.courseLevel1.difficulty,
        } : undefined,
        courseLevel2: data.courseLevel2 ? {
            id: data.courseLevel2.id,
            title: data.courseLevel2.title,
            description: data.courseLevel2.description,
            coverImageUrl: data.courseLevel2.cover_image_url,
            thumbnailUrl: data.courseLevel2.thumbnail_url,
            durationMinutes: data.courseLevel2.duration_minutes,
            difficulty: data.courseLevel2.difficulty,
        } : undefined,
    };
}

/**
 * Busca una microcredencial por slug
 */
async function findBySlug(slug: string): Promise<MicrocredentialWithCourses | null> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from(TABLES.MICROCREDENTIALS)
        .select(`
      *,
      courseLevel1:courses!microcredentials_course_level_1_id_fkey(id, title, description, cover_image_url, thumbnail_url, duration_minutes, difficulty),
      courseLevel2:courses!microcredentials_course_level_2_id_fkey(id, title, description, cover_image_url, thumbnail_url, duration_minutes, difficulty)
    `)
        .eq('slug', slug)
        .maybeSingle();

    if (error) {
        console.error('[microcredentialRepository] Error finding by slug:', error);
        throw error;
    }

    if (!data) return null;

    return {
        ...mapMicrocredentialFromDB(data),
        courseLevel1: data.courseLevel1 ? {
            id: data.courseLevel1.id,
            title: data.courseLevel1.title,
            description: data.courseLevel1.description,
            coverImageUrl: data.courseLevel1.cover_image_url,
            thumbnailUrl: data.courseLevel1.thumbnail_url,
            durationMinutes: data.courseLevel1.duration_minutes,
            difficulty: data.courseLevel1.difficulty,
        } : undefined,
        courseLevel2: data.courseLevel2 ? {
            id: data.courseLevel2.id,
            title: data.courseLevel2.title,
            description: data.courseLevel2.description,
            coverImageUrl: data.courseLevel2.cover_image_url,
            thumbnailUrl: data.courseLevel2.thumbnail_url,
            durationMinutes: data.courseLevel2.duration_minutes,
            difficulty: data.courseLevel2.difficulty,
        } : undefined,
    };
}

/**
 * Crea una nueva microcredencial
 */
async function create(data: CreateMicrocredentialData, createdBy: string): Promise<Microcredential> {
    const supabase = getSupabaseAdmin();

    // Generar slug si no se provee
    const slug = data.slug || generateSlug(data.title);

    // Verificar que el slug sea único
    let finalSlug = slug;
    let counter = 1;
    while (true) {
        const { data: existing } = await supabase
            .from(TABLES.MICROCREDENTIALS)
            .select('id')
            .eq('slug', finalSlug)
            .maybeSingle();

        if (!existing) break;
        finalSlug = `${slug}-${counter}`;
        counter++;
    }

    const insertData = {
        ...mapMicrocredentialToDB({ ...data, slug: finalSlug }),
        created_by: createdBy,
    };

    const { data: created, error } = await supabase
        .from(TABLES.MICROCREDENTIALS)
        .insert(insertData)
        .select()
        .single();

    if (error) {
        console.error('[microcredentialRepository] Error creating:', error);
        throw error;
    }

    return mapMicrocredentialFromDB(created);
}

/**
 * Actualiza una microcredencial
 */
async function update(id: string, data: UpdateMicrocredentialData): Promise<Microcredential> {
    const supabase = getSupabaseAdmin();

    const updateData = mapMicrocredentialUpdateToDB(data);

    const { data: updated, error } = await supabase
        .from(TABLES.MICROCREDENTIALS)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[microcredentialRepository] Error updating:', error);
        throw error;
    }

    return mapMicrocredentialFromDB(updated);
}

/**
 * Elimina (desactiva) una microcredencial
 */
async function remove(id: string): Promise<void> {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from(TABLES.MICROCREDENTIALS)
        .update({ is_active: false, is_published: false })
        .eq('id', id);

    if (error) {
        console.error('[microcredentialRepository] Error removing:', error);
        throw error;
    }
}

// ============================================================================
// ENROLLMENT QUERIES
// ============================================================================

/**
 * Obtiene la inscripción de un estudiante a una microcredencial
 */
async function getEnrollment(studentId: string, microcredentialId: string): Promise<MicrocredentialEnrollment | null> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from(TABLES.MICROCREDENTIAL_ENROLLMENTS)
        .select('*')
        .eq('student_id', studentId)
        .eq('microcredential_id', microcredentialId)
        .maybeSingle();

    if (error) {
        console.error('[microcredentialRepository] Error getting enrollment:', error);
        throw error;
    }

    return data ? mapEnrollmentFromDB(data) : null;
}

/**
 * Obtiene todas las inscripciones de un estudiante
 */
async function getStudentEnrollments(studentId: string): Promise<MicrocredentialEnrollmentWithDetails[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from(TABLES.MICROCREDENTIAL_ENROLLMENTS)
        .select(`
      *,
      microcredential:microcredentials(
        *,
        courseLevel1:courses!microcredentials_course_level_1_id_fkey(id, title, cover_image_url),
        courseLevel2:courses!microcredentials_course_level_2_id_fkey(id, title, cover_image_url)
      )
    `)
        .eq('student_id', studentId)
        .order('enrolled_at', { ascending: false });

    if (error) {
        console.error('[microcredentialRepository] Error getting student enrollments:', error);
        throw error;
    }

    return (data || []).map((row: any) => ({
        ...mapEnrollmentFromDB(row),
        microcredential: row.microcredential ? {
            ...mapMicrocredentialFromDB(row.microcredential),
            courseLevel1: row.microcredential.courseLevel1 ? {
                id: row.microcredential.courseLevel1.id,
                title: row.microcredential.courseLevel1.title,
                description: null,
                coverImageUrl: row.microcredential.courseLevel1.cover_image_url,
                thumbnailUrl: null,
                durationMinutes: null,
                difficulty: null,
            } : undefined,
            courseLevel2: row.microcredential.courseLevel2 ? {
                id: row.microcredential.courseLevel2.id,
                title: row.microcredential.courseLevel2.title,
                description: null,
                coverImageUrl: row.microcredential.courseLevel2.cover_image_url,
                thumbnailUrl: null,
                durationMinutes: null,
                difficulty: null,
            } : undefined,
        } : undefined,
    }));
}

/**
 * Inscribe a un estudiante en una microcredencial
 */
async function enrollStudent(
    studentId: string,
    microcredentialId: string,
    isFree: boolean,
    paymentReference?: string
): Promise<MicrocredentialEnrollment> {
    const supabase = getSupabaseAdmin();

    // Obtener la microcredencial para el precio
    const { data: micro } = await supabase
        .from(TABLES.MICROCREDENTIALS)
        .select('price, is_free')
        .eq('id', microcredentialId)
        .single();

    const insertData = {
        student_id: studentId,
        microcredential_id: microcredentialId,
        acquisition_type: isFree ? 'free' : 'paid',
        payment_amount: isFree ? null : micro?.price,
        payment_reference: paymentReference || null,
        payment_verified_at: isFree ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
        .from(TABLES.MICROCREDENTIAL_ENROLLMENTS)
        .insert(insertData)
        .select()
        .single();

    if (error) {
        console.error('[microcredentialRepository] Error enrolling student:', error);
        throw error;
    }

    return mapEnrollmentFromDB(data);
}

/**
 * Verifica el pago de una inscripción
 */
async function verifyPayment(enrollmentId: string, verifiedBy: string): Promise<MicrocredentialEnrollment> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from(TABLES.MICROCREDENTIAL_ENROLLMENTS)
        .update({
            payment_verified_at: new Date().toISOString(),
            payment_verified_by: verifiedBy,
        })
        .eq('id', enrollmentId)
        .select()
        .single();

    if (error) {
        console.error('[microcredentialRepository] Error verifying payment:', error);
        throw error;
    }

    return mapEnrollmentFromDB(data);
}

/**
 * Obtiene enrollments pendientes de verificación de pago (para admin)
 */
async function getPendingPayments(): Promise<MicrocredentialEnrollmentWithDetails[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from(TABLES.MICROCREDENTIAL_ENROLLMENTS)
        .select(`
      *,
      microcredential:microcredentials(id, title, badge_image_url, price),
      student:students(
        id,
        user:users(id, name, email)
      )
    `)
        .eq('acquisition_type', 'paid')
        .is('payment_verified_at', null)
        .order('enrolled_at', { ascending: true });

    if (error) {
        console.error('[microcredentialRepository] Error getting pending payments:', error);
        throw error;
    }

    return (data || []).map((row: any) => ({
        ...mapEnrollmentFromDB(row),
        microcredential: row.microcredential ? mapMicrocredentialFromDB(row.microcredential) : undefined,
    }));
}

/**
 * Verifica si un curso pertenece a una microcredencial del estudiante
 * y retorna el estado de acceso (útil para lógica secuencial L1 -> L2)
 */
async function checkCourseAccessForStudent(
    studentId: string,
    courseId: string
): Promise<{ isMicrocredentialCourse: boolean; isLevel2Locked: boolean; microcredentialId?: string }> {
    const supabase = getSupabaseAdmin();

    // Buscar microcredenciales donde el estudiante esté inscrito
    // y el curso sea level_1 o level_2
    const { data, error } = await supabase
        .from(TABLES.MICROCREDENTIAL_ENROLLMENTS)
        .select(`
      id,
      microcredential_id,
      level_1_completed,
      level_2_unlocked,
      microcredential:microcredentials(id, course_level_1_id, course_level_2_id)
    `)
        .eq('student_id', studentId);

    if (error) {
        console.error('[microcredentialRepository] Error checking course access:', error);
        return { isMicrocredentialCourse: false, isLevel2Locked: false };
    }

    for (const enrollment of data || []) {
        const micro = enrollment.microcredential as any;
        if (!micro) continue;

        // ¿Es el Nivel 1?
        if (micro.course_level_1_id === courseId) {
            return {
                isMicrocredentialCourse: true,
                isLevel2Locked: false, // L1 siempre accesible
                microcredentialId: micro.id,
            };
        }

        // ¿Es el Nivel 2?
        if (micro.course_level_2_id === courseId) {
            return {
                isMicrocredentialCourse: true,
                isLevel2Locked: !enrollment.level_2_unlocked, // Bloqueado si L1 no completado
                microcredentialId: micro.id,
            };
        }
    }

    return { isMicrocredentialCourse: false, isLevel2Locked: false };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const microcredentialRepository = {
    // Microcredentials
    findAllPublished,
    findAll,
    findById,
    findBySlug,
    create,
    update,
    remove,

    // Enrollments
    getEnrollment,
    getStudentEnrollments,
    enrollStudent,
    verifyPayment,
    getPendingPayments,
    checkCourseAccessForStudent,
};
