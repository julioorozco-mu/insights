# 🎓 Plataforma de Cursos - Modelo de Datos y Tipos TypeScript (Firestore + Firebase)

Este documento define la **estructura de colecciones Firestore** y **tipos TypeScript** base para la plataforma de cursos con video en vivo (Mux), chat en tiempo real (Firestore), formularios dinámicos, encuestas, certificados y archivos adjuntos.

---

## 🔖 Convenciones Generales

- Todos los documentos incluyen:
  - `id: string`
  - `createdAt: Timestamp`
  - `updatedAt: Timestamp`
  - `isActive?: boolean`
- Los campos con `?` son opcionales para permitir extensibilidad futura.
- Las relaciones son **por ID** (no referencias directas) para mayor flexibilidad y evitar problemas de seguridad o sincronización.

---

## 👤 Users

Colección: `users`

```ts
//Colección: users
export interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "speaker" | "admin";
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

//Colección: students
export interface Student extends User {
  enrollmentDate: string;
  completedCourses?: string[];
  certificates?: string[];
  extraData?: Record<string, any>;
}

//Colección: speakers
export interface Speaker extends User {
  expertise: string[];
  resumeUrl?: string;
  signatureUrl?: string; // para certificados
  events?: string[]; // IDs de cursos o sesiones impartidas
  extraData?: Record<string, any>;
}

//Colección: courses
export interface Course {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  speakerIds: string[]; // relación con speakers
  lessonIds: string[];
  tags?: string[];
  durationMinutes?: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
  entrySurveyId?: string;
  exitSurveyId?: string;
  certificateTemplateId?: string;
  formTemplateId?: string; // formulario principal
  isLive?: boolean;
  livePlaybackId?: string; // de Mux
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
}


//Colección: lessons
export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  videoPlaybackId?: string; // de Mux (grabación o stream)
  videoRecordingId?: string;
  attachmentsIds?: string[];
  formTemplateId?: string; // formulario individual
  surveyId?: string; // encuesta de la lección
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
}

//Colección: formTemplates


export interface FormTemplate {
  id: string;
  title: string;
  description?: string;
  courseId?: string;
  lessonId?: string;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
}

export interface Question {
  id: string;
  type: "text" | "file_upload" | "multiple_choice" | "checkbox" | "image_choice" | "video_response";
  questionText: string;
  options?: {
    label: string;
    value: string;
    imageUrl?: string;
  }[];
  allowMultiple?: boolean;
  isRequired?: boolean;
  media?: {
    type: "image" | "video" | "audio";
    url: string;
  };
  order: number;
}


//Colección: studentAnswers
export interface StudentAnswer {
  id: string;
  studentId: string;
  courseId: string;
  formTemplateId: string;
  questionId: string;
  lessonId?: string;
  answer?: string | string[]; // texto o múltiples opciones
  fileUrl?: string; // si la respuesta es un archivo
  score?: number;
  createdAt: string;
}


//Colección: surveys
export interface Survey {
  id: string;
  title: string;
  description?: string;
  type: "entry" | "exit" | "lesson";
  courseId?: string;
  lessonId?: string;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}


//Colección: courseLiveChats/{courseId}/messages
export interface CourseChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
  isPinned?: boolean;
  isQuestion?: boolean;
}


//Colección: surveyLiveChats/{courseId}/polls
export interface SurveyLiveChat {
  id: string;
  courseId: string;
  question: string;
  options: {
    label: string;
    value: string;
  }[];
  responses: {
    userId: string;
    answer: string;
  }[];
  createdAt: string;
  isActive: boolean;
}

//Colección: certificateTemplates

export interface CertificateTemplate {
  id: string;
  title: string;
  backgroundUrl: string;
  signatureUrls?: string[]; // URLs de firmas de ponentes
  style?: {
    fontFamily?: string;
    colorPrimary?: string;
    positionMap?: Record<string, { x: number; y: number }>; // para nombres, fechas, etc.
  };
  createdAt: string;
  updatedAt: string;
}


//Colección: certificates
export interface Certificate {
  id: string;
  studentId: string;
  courseId: string;
  certificateTemplateId: string;
  studentName: string;
  courseTitle: string;
  speakerNames: string[];
  issueDate: string;
  certificateUrl?: string; // URL del PDF o imagen generada
  createdAt: string;
  verified?: boolean;
}


//Colección: fileAttachments
export interface FileAttachment {
  id: string;
  ownerId: string;
  fileName: string;
  fileType: string;
  url: string;
  sizeKB?: number;
  category?: "student" | "speaker" | "lesson" | "course" | "general";
  relatedId?: string; // puede ser courseId, lessonId, etc.
  isDeleted?: boolean;
  createdAt: string;
}


//Colección: fileAttachmentsLesson
export interface FileAttachmentLesson {
  id: string;
  lessonId: string;
  fileIds: string[];
  createdAt: string;
}


//Colección: fileAttachmentsCourse
export interface FileAttachmentCourse {
  id: string;
  courseId: string;
  fileIds: string[];
  createdAt: string;
}


//Colección: videoRecordings
export interface VideoRecording {
  id: string;
  muxAssetId: string;
  muxPlaybackId: string;
  courseId: string;
  lessonId?: string;
  durationSeconds?: number;
  quality?: "720p" | "1080p" | "4k";
  createdAt: string;
  url?: string; // opcional si se descarga o convierte
}


🧠 Relaciones principales (resumen visual)

users
├── students
└── speakers

courses
 ├── lessons
 │    ├── fileAttachmentsLesson
 │    ├── formTemplates
 │    └── surveys
 ├── fileAttachmentsCourse
 ├── courseLiveChats
 ├── surveyLiveChats
 ├── certificateTemplates
 └── certificates


Buenas prácticas implementadas

🔁 DRY: todos los documentos comparten campos comunes (id, createdAt, updatedAt, isActive).

⚙️ Extensibilidad: todos los modelos admiten extraData?: Record<string, any>.

📦 Normalización: relaciones por ID (fácil indexación y sincronización).

🧱 Escalabilidad: cada subcolección está pensada para carga progresiva (liveChats, polls, studentAnswers).

🔒 Seguridad: Firestore Rules deben restringir lectura/escritura por rol (student/speaker/admin).


Implementar los repositorios base:

/lib/firebase/
  ├── coursesRepository.ts
  ├── lessonsRepository.ts
  ├── formsRepository.ts
  ├── chatsRepository.ts
  └── certificatesRepository.ts


Cada uno debe exponer métodos CRUD usando firebase/firestore SDK.


El password no se debe guardar en users, se debe usar el servicio de auth de firebase.


Roles de usuarios y lista de permisos:

student: 
- puede ver todos los cursos
- puede inscribirse a cursos
- puede ver sus cursos inscritos
- puede ver sus certificados
- puede ver sus respuestas a encuestas
- Puede ver las grabaciones de sesiones de transmisión finalizadas
- Puede ver las grabaciones de sesiones de transmisión en curso


speaker:
- puede ver sus cursos asignados
- puede subir archivos complementarios por curso o lección
- puede ver los alumnos de sus cursos
- Puede iniciar sesiones de transmisión
- Puede ver el chat en tiempo real
- Puede hacer encuestas en tiempo real
- Puede ver las respuestas a encuestas en tiempo real en porcentajes
- Puede finalizar sesiones de transmisión
- Puede ver las grabaciones de sesiones de transmisión


admin:
- puede ver todos los cursos
- puede editar todos los cursos
- puede eliminar todos los cursos
- puede ver todos los alumnos
- puede editar todos los alumnos
- puede eliminar todos los alumnos
- puede ver todos los ponentes
- puede editar todos los ponentes
- puede eliminar todos los ponentes
- puede ver todos los formatos de certificados
- puede editar todos los formatos de certificados
- puede eliminar todos los formatos de certificados
- puede ver todos los archivos
- puede editar todos los archivos
- puede eliminar todos los archivos
- puede ver todos los videos
- puede editar todos los videos
- puede eliminar todos los videos
- puede ver todos los formularios
- puede editar todos los formularios
- puede eliminar todos los formularios
- puede ver todos los encuestas
- puede editar todos los encuestas
- puede eliminar todos los encuestas
- Puede asignar ponentes a cursos
- Puede crear encuestas
- Puede asignar encuestas a cursos
- Puede asignar encuestas a lecciones
- Puede crear formatos de certificados a cursos
- Puede asignar formatos de certificados a cursos
- Puede crear archivos complementarios por curso o lección
- Puede asignar archivos complementarios por curso o lección






