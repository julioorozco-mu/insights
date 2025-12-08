/**
 * MicroCert by Marca UNACH - Constantes de la aplicación
 */

export const APP_NAME = "MicroCert";
export const APP_NAME_FULL = "MicroCert - Plataforma de Microcredenciales";
export const APP_ORGANIZATION = "Marca UNACH";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Tablas de Supabase (PostgreSQL - snake_case)
export const TABLES = {
  USERS: "users",
  STUDENTS: "students",
  TEACHERS: "teachers",
  STUDENT_ENROLLMENTS: "student_enrollments",
  COURSES: "courses",
  LESSONS: "lessons",
  FORM_TEMPLATES: "form_templates",
  STUDENT_ANSWERS: "student_answers",
  SURVEYS: "surveys",
  SURVEY_RESPONSES: "survey_responses",
  LIVE_CHATS: "live_chats",
  LIVE_CHAT_MESSAGES: "live_chat_messages",
  LIVE_POLLS: "live_polls",
  LIVE_POLL_VOTES: "live_poll_votes",
  CERTIFICATE_TEMPLATES: "certificate_templates",
  CERTIFICATES: "certificates",
  FILE_ATTACHMENTS: "file_attachments",
  FILE_ATTACHMENTS_LESSON: "file_attachments_lesson",
  FILE_ATTACHMENTS_COURSE: "file_attachments_course",
  TEACHER_RESOURCES: "teacher_resources",
  VIDEO_RECORDINGS: "video_recordings",
  LIVE_STREAMS: "live_streams",
  LIVE_STREAM_SESSIONS: "live_stream_sessions",
  LESSON_ATTENDANCE: "lesson_attendance",
  SITE_CONFIG: "site_config",
  SCHEDULED_EMAILS: "scheduled_emails",
  CERTIFICATE_DOWNLOADS: "certificate_downloads",
  // Lesson Player (Cinema Mode)
  LESSON_NOTES: "lesson_notes",
  LESSON_QUESTIONS: "lesson_questions",
  LESSON_QUESTION_ANSWERS: "lesson_question_answers",
  LESSON_QUESTION_UPVOTES: "lesson_question_upvotes",
  // Secciones de cursos
  COURSE_SECTIONS: "course_sections",
} as const;

// Alias para compatibilidad (deprecado - usar TABLES)
export const COLLECTIONS = TABLES;

// Roles de usuario
export const USER_ROLES = {
  STUDENT: "student",
  TEACHER: "teacher",
  ADMIN: "admin",
  SUPPORT: "support",
  SUPERADMIN: "superadmin",
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Etiquetas de roles en español
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  student: "Estudiante",
  teacher: "Maestro",
  admin: "Administrador",
  support: "Soporte",
  superadmin: "Superadministrador",
};

// Configuración de archivos
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Agora
export const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || "";
export const AGORA_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || "";

// Paginación
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Colores del tema (Marca UNACH)
export const THEME_COLORS = {
  PRIMARY: "#192170",
  SECONDARY: "#3C1970",
  SUCCESS: "#10B981",
  ERROR: "#EF4444",
  BACKGROUND: "#F1F5F9",
  SURFACE: "#FFFFFF",
} as const;
