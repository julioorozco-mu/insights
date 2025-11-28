export const APP_NAME = "epolítica";
export const APP_NAME_FULL = "epolítica - Capacitación Política";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Firebase Collections
export const COLLECTIONS = {
  USERS: "users",
  STUDENTS: "students",
  SPEAKERS: "speakers",
  COURSES: "courses",
  LESSONS: "lessons",
  FORM_TEMPLATES: "formTemplates",
  STUDENT_ANSWERS: "studentAnswers",
  SURVEYS: "surveys",
  SURVEY_RESPONSES: "surveyResponses",
  COURSE_LIVE_CHATS: "courseLiveChats",
  SURVEY_LIVE_CHATS: "surveyLiveChats",
  LIVE_CHATS: "liveChats",
  MESSAGES: "messages",
  POLLS: "polls",
  CERTIFICATE_TEMPLATES: "certificateTemplates",
  CERTIFICATES: "certificates",
  FILE_ATTACHMENTS: "fileAttachments",
  FILE_ATTACHMENTS_LESSON: "fileAttachmentsLesson",
  FILE_ATTACHMENTS_COURSE: "fileAttachmentsCourse",
  VIDEO_RECORDINGS: "videoRecordings",
  LIVE_STREAMS: "liveStreams",
  SITE_CONFIG: "siteConfig",
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: "admin",
  SPEAKER: "speaker",
  STUDENT: "student",
} as const;

// File Upload
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "application/msword"];

// Agora
export const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || "";
export const AGORA_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || "";

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
