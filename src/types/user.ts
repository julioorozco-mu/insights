/**
 * MicroCert - Tipos de Usuario
 */

export type UserRole = "student" | "teacher" | "admin" | "support" | "superadmin";

// Tabla: users
export interface User {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  role: UserRole;
  phone?: string;
  username?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  state?: string;
  avatarUrl?: string;
  bio?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tabla: students
export interface Student extends User {
  role: "student";
  enrollmentDate: string;
  enrolledCourses: {
    courseId: string;
    enrolledAt: string;
    progress?: number;
    completedLessons?: string[];
  }[];
  completedCourses?: string[];
  certificates?: string[];
  extraData?: Record<string, unknown>;
}

// Tabla: teachers (antes speakers)
export interface Teacher extends User {
  role: "teacher";
  expertise: string[];
  resumeUrl?: string;
  signatureUrl?: string; // para certificados
  events?: string[]; // IDs de cursos impartidos
  extraData?: Record<string, unknown>;
}

// Alias para compatibilidad (deprecado)
export type Speaker = Teacher;

export interface CreateUserData {
  name: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  username?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  state?: string;
  role?: UserRole;
  bio?: string;
  expertise?: string[]; // para teachers
}

export interface UpdateUserData {
  name?: string;
  avatarUrl?: string;
  bio?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  expertise?: string[]; // para teachers
  resumeUrl?: string; // para teachers
  signatureUrl?: string; // para teachers
  // Campos adicionales para perfil público
  coverImageUrl?: string;
  aboutMe?: string;
  favoriteBooks?: string[];
  publishedBooks?: { title: string; url?: string; year?: string }[];
  externalCourses?: { title: string; url: string; platform?: string }[];
  achievements?: string[];
  services?: string[];
}
