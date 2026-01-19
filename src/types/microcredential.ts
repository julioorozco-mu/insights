/**
 * Tipos para el módulo de Microcredenciales
 * MicroCert by Marca UNACH
 */

// ============================================================================
// ENUMS
// ============================================================================

export type MicrocredentialStatus = 'in_progress' | 'completed' | 'expired';
export type AcquisitionType = 'free' | 'paid' | 'gifted' | 'promo';

// ============================================================================
// INTERFACES PRINCIPALES
// ============================================================================

/**
 * Microcredencial - Definición del producto (Hard Bundle de 2 cursos)
 */
export interface Microcredential {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  
  // Insignia/Badge
  badgeImageUrl: string;
  badgeLockedImageUrl: string | null;
  badgeColor: string | null;
  
  // Cursos vinculados
  courseLevel1Id: string;
  courseLevel2Id: string;
  
  // Pricing
  isFree: boolean;
  price: number;
  salePercentage: number;
  
  // Estado
  isPublished: boolean;
  isActive: boolean;
  displayOrder: number;
  featured: boolean;
  
  // Auditoría
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Microcredencial con cursos poblados (para vistas de catálogo/detalle)
 */
export interface MicrocredentialWithCourses extends Microcredential {
  courseLevel1?: {
    id: string;
    title: string;
    description: string | null;
    coverImageUrl: string | null;
    thumbnailUrl: string | null;
    durationMinutes: number | null;
    difficulty: string | null;
  };
  courseLevel2?: {
    id: string;
    title: string;
    description: string | null;
    coverImageUrl: string | null;
    thumbnailUrl: string | null;
    durationMinutes: number | null;
    difficulty: string | null;
  };
}

/**
 * Inscripción de estudiante a microcredencial
 */
export interface MicrocredentialEnrollment {
  id: string;
  studentId: string;
  microcredentialId: string;
  
  // Fechas
  enrolledAt: string;
  
  // Tracking de progreso
  level1Completed: boolean;
  level1CompletedAt: string | null;
  level2Unlocked: boolean;
  level2UnlockedAt: string | null;
  level2Completed: boolean;
  level2CompletedAt: string | null;
  
  // Estado
  status: MicrocredentialStatus;
  completedAt: string | null;
  
  // Badge
  badgeUnlocked: boolean;
  badgeUnlockedAt: string | null;
  badgeDownloadedAt: string | null;
  
  // Certificado
  certificateId: string | null;
  certificateIssuedAt: string | null;
  
  // Pago
  acquisitionType: AcquisitionType;
  paymentAmount: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  paymentVerifiedAt: string | null;
  paymentVerifiedBy: string | null;
  
  // Auditoría
  createdAt: string;
  updatedAt: string;
}

/**
 * Enrollment con microcredencial poblada (para vista "Mis Credenciales")
 */
export interface MicrocredentialEnrollmentWithDetails extends MicrocredentialEnrollment {
  microcredential?: MicrocredentialWithCourses;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * Datos para crear una nueva microcredencial
 */
export interface CreateMicrocredentialData {
  title: string;
  slug?: string; // Se autogenera si no se provee
  description?: string;
  shortDescription?: string;
  badgeImageUrl: string;
  badgeLockedImageUrl?: string;
  badgeColor?: string;
  courseLevel1Id: string;
  courseLevel2Id: string;
  isFree?: boolean;
  price?: number;
  salePercentage?: number;
  isPublished?: boolean;
  displayOrder?: number;
  featured?: boolean;
}

/**
 * Datos para actualizar una microcredencial
 */
export interface UpdateMicrocredentialData {
  title?: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  badgeImageUrl?: string;
  badgeLockedImageUrl?: string;
  badgeColor?: string;
  courseLevel1Id?: string;
  courseLevel2Id?: string;
  isFree?: boolean;
  price?: number;
  salePercentage?: number;
  isPublished?: boolean;
  isActive?: boolean;
  displayOrder?: number;
  featured?: boolean;
}

/**
 * Datos para inscribir a un estudiante
 */
export interface EnrollMicrocredentialData {
  microcredentialId: string;
  paymentReference?: string;
}

/**
 * Datos para verificar un pago
 */
export interface VerifyPaymentData {
  enrollmentId: string;
  verified: boolean;
  notes?: string;
}

// ============================================================================
// UTILIDADES DE CONVERSIÓN (snake_case <-> camelCase)
// ============================================================================

/**
 * Convierte un registro de microcredencial de base de datos a interface TypeScript
 */
export function mapMicrocredentialFromDB(row: any): Microcredential {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    shortDescription: row.short_description,
    badgeImageUrl: row.badge_image_url,
    badgeLockedImageUrl: row.badge_locked_image_url,
    badgeColor: row.badge_color,
    courseLevel1Id: row.course_level_1_id,
    courseLevel2Id: row.course_level_2_id,
    isFree: row.is_free,
    price: Number(row.price) || 0,
    salePercentage: row.sale_percentage || 0,
    isPublished: row.is_published,
    isActive: row.is_active,
    displayOrder: row.display_order || 0,
    featured: row.featured || false,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convierte un registro de enrollment de base de datos a interface TypeScript
 */
export function mapEnrollmentFromDB(row: any): MicrocredentialEnrollment {
  return {
    id: row.id,
    studentId: row.student_id,
    microcredentialId: row.microcredential_id,
    enrolledAt: row.enrolled_at,
    level1Completed: row.level_1_completed || false,
    level1CompletedAt: row.level_1_completed_at,
    level2Unlocked: row.level_2_unlocked || false,
    level2UnlockedAt: row.level_2_unlocked_at,
    level2Completed: row.level_2_completed || false,
    level2CompletedAt: row.level_2_completed_at,
    status: row.status || 'in_progress',
    completedAt: row.completed_at,
    badgeUnlocked: row.badge_unlocked || false,
    badgeUnlockedAt: row.badge_unlocked_at,
    badgeDownloadedAt: row.badge_downloaded_at,
    certificateId: row.certificate_id,
    certificateIssuedAt: row.certificate_issued_at,
    acquisitionType: row.acquisition_type || 'free',
    paymentAmount: row.payment_amount ? Number(row.payment_amount) : null,
    paymentMethod: row.payment_method,
    paymentReference: row.payment_reference,
    paymentVerifiedAt: row.payment_verified_at,
    paymentVerifiedBy: row.payment_verified_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convierte datos de creación a formato de base de datos
 */
export function mapMicrocredentialToDB(data: CreateMicrocredentialData): Record<string, any> {
  return {
    title: data.title,
    slug: data.slug,
    description: data.description,
    short_description: data.shortDescription,
    badge_image_url: data.badgeImageUrl,
    badge_locked_image_url: data.badgeLockedImageUrl,
    badge_color: data.badgeColor,
    course_level_1_id: data.courseLevel1Id,
    course_level_2_id: data.courseLevel2Id,
    is_free: data.isFree ?? false,
    price: data.price ?? 0,
    sale_percentage: data.salePercentage ?? 0,
    is_published: data.isPublished ?? false,
    display_order: data.displayOrder ?? 0,
    featured: data.featured ?? false,
  };
}

/**
 * Convierte datos de actualización a formato de base de datos
 */
export function mapMicrocredentialUpdateToDB(data: UpdateMicrocredentialData): Record<string, any> {
  const result: Record<string, any> = {};
  
  if (data.title !== undefined) result.title = data.title;
  if (data.slug !== undefined) result.slug = data.slug;
  if (data.description !== undefined) result.description = data.description;
  if (data.shortDescription !== undefined) result.short_description = data.shortDescription;
  if (data.badgeImageUrl !== undefined) result.badge_image_url = data.badgeImageUrl;
  if (data.badgeLockedImageUrl !== undefined) result.badge_locked_image_url = data.badgeLockedImageUrl;
  if (data.badgeColor !== undefined) result.badge_color = data.badgeColor;
  if (data.courseLevel1Id !== undefined) result.course_level_1_id = data.courseLevel1Id;
  if (data.courseLevel2Id !== undefined) result.course_level_2_id = data.courseLevel2Id;
  if (data.isFree !== undefined) result.is_free = data.isFree;
  if (data.price !== undefined) result.price = data.price;
  if (data.salePercentage !== undefined) result.sale_percentage = data.salePercentage;
  if (data.isPublished !== undefined) result.is_published = data.isPublished;
  if (data.isActive !== undefined) result.is_active = data.isActive;
  if (data.displayOrder !== undefined) result.display_order = data.displayOrder;
  if (data.featured !== undefined) result.featured = data.featured;
  
  return result;
}
