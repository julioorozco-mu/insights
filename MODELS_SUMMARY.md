# 📊 Resumen de Modelos Implementados

Este documento resume todos los modelos TypeScript creados según las especificaciones de MODELS.md.

## 🗂️ Colecciones de Firestore

### 👤 Usuarios

#### `users` - Usuario Base
```typescript
interface User {
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
```

#### `students` - Estudiantes
```typescript
interface Student extends User {
  role: "student";
  enrollmentDate: string;
  completedCourses?: string[];
  certificates?: string[];
  extraData?: Record<string, any>;
}
```

#### `speakers` - Ponentes/Instructores
```typescript
interface Speaker extends User {
  role: "speaker";
  expertise: string[];
  resumeUrl?: string;
  signatureUrl?: string;
  events?: string[];
  extraData?: Record<string, any>;
}
```

---

### 📚 Cursos y Lecciones

#### `courses` - Cursos
```typescript
interface Course {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  speakerIds: string[];
  lessonIds: string[];
  tags?: string[];
  durationMinutes?: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
  entrySurveyId?: string;
  exitSurveyId?: string;
  certificateTemplateId?: string;
  formTemplateId?: string;
  isLive?: boolean;
  livePlaybackId?: string;
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
}
```

#### `lessons` - Lecciones
```typescript
interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  videoPlaybackId?: string;
  videoRecordingId?: string;
  attachmentsIds?: string[];
  formTemplateId?: string;
  surveyId?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
}
```

---

### 📝 Formularios y Encuestas

#### `formTemplates` - Plantillas de Formularios
```typescript
interface FormTemplate {
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

interface Question {
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
```

#### `studentAnswers` - Respuestas de Estudiantes
```typescript
interface StudentAnswer {
  id: string;
  studentId: string;
  courseId: string;
  formTemplateId: string;
  questionId: string;
  lessonId?: string;
  answer?: string | string[];
  fileUrl?: string;
  score?: number;
  createdAt: string;
}
```

#### `surveys` - Encuestas
```typescript
interface Survey {
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
```

---

### 💬 Chat y Encuestas en Vivo

#### `courseLiveChats/{courseId}/messages` - Mensajes de Chat
```typescript
interface CourseChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
  isPinned?: boolean;
  isQuestion?: boolean;
}
```

#### `surveyLiveChats/{courseId}/polls` - Encuestas en Vivo
```typescript
interface SurveyLiveChat {
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
```

---

### 🎓 Certificados

#### `certificateTemplates` - Plantillas de Certificados
```typescript
interface CertificateTemplate {
  id: string;
  title: string;
  backgroundUrl: string;
  signatureUrls?: string[];
  style?: {
    fontFamily?: string;
    colorPrimary?: string;
    positionMap?: Record<string, { x: number; y: number }>;
  };
  createdAt: string;
  updatedAt: string;
}
```

#### `certificates` - Certificados Emitidos
```typescript
interface Certificate {
  id: string;
  studentId: string;
  courseId: string;
  certificateTemplateId: string;
  studentName: string;
  courseTitle: string;
  speakerNames: string[];
  issueDate: string;
  certificateUrl?: string;
  createdAt: string;
  verified?: boolean;
}
```

---

### 📁 Archivos y Videos

#### `fileAttachments` - Archivos Adjuntos
```typescript
interface FileAttachment {
  id: string;
  ownerId: string;
  fileName: string;
  fileType: string;
  url: string;
  sizeKB?: number;
  category?: "student" | "speaker" | "lesson" | "course" | "general";
  relatedId?: string;
  isDeleted?: boolean;
  createdAt: string;
}
```

#### `fileAttachmentsLesson` - Archivos por Lección
```typescript
interface FileAttachmentLesson {
  id: string;
  lessonId: string;
  fileIds: string[];
  createdAt: string;
}
```

#### `fileAttachmentsCourse` - Archivos por Curso
```typescript
interface FileAttachmentCourse {
  id: string;
  courseId: string;
  fileIds: string[];
  createdAt: string;
}
```

#### `videoRecordings` - Grabaciones de Video
```typescript
interface VideoRecording {
  id: string;
  muxAssetId: string;
  muxPlaybackId: string;
  courseId: string;
  lessonId?: string;
  durationSeconds?: number;
  quality?: "720p" | "1080p" | "4k";
  createdAt: string;
  url?: string;
}
```

---

## 🔐 Roles y Permisos

### 👨‍🎓 Student (Estudiante)
- ✅ Ver todos los cursos
- ✅ Inscribirse a cursos
- ✅ Ver sus cursos inscritos
- ✅ Ver sus certificados
- ✅ Ver sus respuestas a encuestas
- ✅ Ver grabaciones de sesiones de transmisión

### 👨‍🏫 Speaker (Ponente/Instructor)
- ✅ Ver sus cursos asignados
- ✅ Subir archivos complementarios por curso o lección
- ✅ Ver los alumnos de sus cursos
- ✅ Iniciar sesiones de transmisión
- ✅ Ver el chat en tiempo real
- ✅ Hacer encuestas en tiempo real
- ✅ Ver las respuestas a encuestas en tiempo real en porcentajes
- ✅ Finalizar sesiones de transmisión
- ✅ Ver las grabaciones de sesiones de transmisión

### 👨‍💼 Admin (Administrador)
- ✅ CRUD completo de cursos
- ✅ CRUD completo de alumnos
- ✅ CRUD completo de ponentes
- ✅ CRUD completo de formatos de certificados
- ✅ CRUD completo de archivos
- ✅ CRUD completo de videos
- ✅ CRUD completo de formularios
- ✅ CRUD completo de encuestas
- ✅ Asignar ponentes a cursos
- ✅ Crear y asignar encuestas a cursos/lecciones
- ✅ Crear y asignar formatos de certificados a cursos
- ✅ Crear y asignar archivos complementarios por curso o lección

---

## 📂 Estructura de Archivos

```
src/types/
├── user.ts              # User, Student, Speaker
├── course.ts            # Course
├── lesson.ts            # Lesson
├── form.ts              # FormTemplate, Question, StudentAnswer
├── survey.ts            # Survey, SurveyResponse, SurveyStats
├── chat.ts              # CourseChatMessage, SurveyLiveChat
├── certificate.ts       # CertificateTemplate, Certificate
├── attachment.ts        # FileAttachment, VideoRecording
└── live.ts              # LiveStream (Mux)
```

---

## 🔗 Relaciones Principales

```
users
├── students (extends User)
└── speakers (extends User)

courses
 ├── lessons
 │    ├── fileAttachmentsLesson
 │    ├── formTemplates
 │    └── surveys
 ├── fileAttachmentsCourse
 ├── courseLiveChats/{courseId}/messages
 ├── surveyLiveChats/{courseId}/polls
 ├── certificateTemplates
 └── certificates

fileAttachments
 ├── category: "student" | "speaker" | "lesson" | "course" | "general"
 └── relatedId: courseId | lessonId

videoRecordings
 ├── courseId
 └── lessonId (opcional)
```

---

## ✅ Buenas Prácticas Implementadas

1. **DRY**: Todos los documentos comparten campos comunes (`id`, `createdAt`, `updatedAt`, `isActive`)
2. **Extensibilidad**: Modelos admiten `extraData?: Record<string, any>`
3. **Normalización**: Relaciones por ID (fácil indexación y sincronización)
4. **Escalabilidad**: Subcolecciones para carga progresiva
5. **Seguridad**: Firestore Rules deben restringir lectura/escritura por rol
6. **Tipos estrictos**: TypeScript con interfaces bien definidas
7. **Fechas como strings**: Compatible con Firestore Timestamp
8. **Campos opcionales**: Flexibilidad para extensión futura

---

## 🔄 Próximos Pasos

1. Implementar repositorios en `/lib/repositories/`
2. Crear servicios en `/lib/services/`
3. Configurar Firestore Security Rules
4. Crear índices compuestos en Firestore
5. Implementar validadores Zod para todos los modelos
6. Crear hooks personalizados para cada entidad
7. Implementar componentes UI para cada modelo
