export type UserRole = "student" | "speaker" | "admin";

// Colección: users
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

// Colección: students
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
  extraData?: Record<string, any>;
}

// Colección: speakers
export interface Speaker extends User {
  role: "speaker";
  expertise: string[];
  resumeUrl?: string;
  signatureUrl?: string; // para certificados
  events?: string[]; // IDs de cursos o sesiones impartidas
  extraData?: Record<string, any>;
}

export interface CreateUserData {
  name: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  username: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  state: string;
  role?: UserRole;
  bio?: string;
  expertise?: string[]; // para speakers
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
  expertise?: string[]; // para speakers
  resumeUrl?: string; // para speakers
  signatureUrl?: string; // para speakers
  // Campos adicionales para perfil público
  coverImageUrl?: string; // Imagen de portada
  aboutMe?: string; // Semblanza/Acerca de
  favoriteBooks?: string[]; // Libros favoritos
  publishedBooks?: { title: string; url?: string; year?: string }[]; // Libros publicados
  externalCourses?: { title: string; url: string; platform?: string }[]; // Cursos externos
  achievements?: string[]; // Logros destacados
  services?: string[]; // Servicios que ofrece
}
