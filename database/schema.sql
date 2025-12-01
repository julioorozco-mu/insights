-- ============================================================================
-- MicroCert by Marca UNACH - PostgreSQL Schema for Supabase
-- ============================================================================
-- Migración desde Firebase Firestore → Supabase PostgreSQL
-- Proyecto: Plataforma de Microcredenciales y Skills (LMS)
-- Versión: 1.0.0
-- ============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS (Tipos enumerados)
-- ============================================================================

-- Roles de usuario
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin', 'support', 'superadmin');

-- Género
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');

-- Dificultad del curso
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Tipo de pregunta
CREATE TYPE question_type AS ENUM (
  'text',
  'short_text',
  'long_text',
  'number',
  'single_choice',
  'multiple_choice',
  'dropdown',
  'quiz',
  'file_upload',
  'image_choice',
  'video_response'
);

-- Tipo de encuesta
CREATE TYPE survey_type AS ENUM ('entry', 'exit', 'lesson');

-- Tipo de lección
CREATE TYPE lesson_type AS ENUM ('video', 'livestream', 'hybrid');

-- Estado del livestream
CREATE TYPE live_status AS ENUM ('idle', 'active', 'ended');

-- Tipo de streaming
CREATE TYPE streaming_type AS ENUM ('agora', 'external_link');

-- Categoría de archivo
CREATE TYPE file_category AS ENUM ('student', 'teacher', 'lesson', 'course', 'general');

-- Calidad de video
CREATE TYPE video_quality AS ENUM ('720p', '1080p', '4k');

-- Tipo de regla de inscripción
CREATE TYPE enrollment_rule_type AS ENUM ('before_start', 'date_range', 'anytime');

-- Modo de validación por lección
CREATE TYPE per_lesson_mode AS ENUM ('complete_all', 'quizzes_only', 'none');

-- Modo de disponibilidad de certificado
CREATE TYPE certificate_availability_mode AS ENUM ('hours_after_start', 'after_course_end', 'after_last_lesson');

-- Tamaño de página de certificado
CREATE TYPE certificate_page_size AS ENUM ('letter', 'legal');

-- Orientación de certificado
CREATE TYPE certificate_orientation AS ENUM ('portrait', 'landscape');

-- Tipo de elemento de certificado
CREATE TYPE certificate_element_type AS ENUM ('text', 'variable', 'image');

-- Variable de certificado
CREATE TYPE certificate_variable_key AS ENUM ('studentName', 'courseTitle', 'instructorName', 'completionDate', 'signatureUrl');

-- Categoría de recurso
CREATE TYPE resource_category AS ENUM ('document', 'video', 'image', 'other');

-- ============================================================================
-- TABLAS PRINCIPALES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USUARIOS
-- ----------------------------------------------------------------------------

-- Tabla: users (Usuarios base - Auth de Supabase)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  role user_role NOT NULL DEFAULT 'student',
  phone VARCHAR(50),
  username VARCHAR(100) UNIQUE,
  date_of_birth DATE,
  gender gender_type,
  state VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  social_links JSONB DEFAULT '{}',
  -- Estructura: { "linkedin": "", "twitter": "", "website": "" }
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: students (Extensión de users para estudiantes)
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMPTZ DEFAULT NOW(),
  completed_courses UUID[] DEFAULT '{}',
  certificates UUID[] DEFAULT '{}',
  extra_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Tabla: teachers (Maestros - antes "speakers")
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expertise TEXT[] DEFAULT '{}',
  resume_url TEXT,
  signature_url TEXT, -- Para certificados
  events UUID[] DEFAULT '{}', -- IDs de cursos impartidos
  extra_data JSONB DEFAULT '{}',
  -- Campos de perfil público
  cover_image_url TEXT,
  about_me TEXT,
  favorite_books TEXT[] DEFAULT '{}',
  published_books JSONB DEFAULT '[]',
  -- Estructura: [{ "title": "", "url": "", "year": "" }]
  external_courses JSONB DEFAULT '[]',
  -- Estructura: [{ "title": "", "url": "", "platform": "" }]
  achievements TEXT[] DEFAULT '{}',
  services TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ----------------------------------------------------------------------------
-- CURSOS Y LECCIONES
-- ----------------------------------------------------------------------------

-- Tabla: courses (Cursos/Microcredenciales)
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  thumbnail_url TEXT,
  teacher_ids UUID[] NOT NULL DEFAULT '{}', -- Relación con teachers
  co_host_ids UUID[] DEFAULT '{}',
  lesson_ids UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  duration_minutes INTEGER,
  difficulty difficulty_level,
  entry_survey_id UUID,
  exit_survey_id UUID,
  certificate_template_id UUID,
  form_template_id UUID,
  is_live BOOLEAN DEFAULT FALSE,
  live_playback_id VARCHAR(255),
  -- Fechas de inscripción
  enrollment_start_date TIMESTAMPTZ,
  enrollment_end_date TIMESTAMPTZ,
  unlimited_enrollment BOOLEAN DEFAULT FALSE,
  -- Reglas de inscripción
  enrollment_rules JSONB DEFAULT '{"type": "anytime"}',
  -- Estructura: { "type": "before_start" | "date_range" | "anytime" }
  -- Fechas del curso
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  -- Reglas para certificados
  certificate_rules JSONB DEFAULT '{}',
  -- Estructura: {
  --   "requireSurveys": boolean,
  --   "requireAttendance": boolean,
  --   "requireEnrollmentOnly": boolean,
  --   "hoursAfterStart": number,
  --   "perLessonMode": "complete_all" | "quizzes_only" | "none",
  --   "requireSequentialLessons": boolean,
  --   "availability": { "mode": "...", "hours": number },
  --   "exitSurveyAfterLessonStart": boolean
  -- }
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: student_enrollments (Inscripciones de estudiantes a cursos)
CREATE TABLE student_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed_lessons UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

-- Tabla: lessons (Lecciones/Módulos)
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  type lesson_type DEFAULT 'video',
  video_url TEXT,
  video_playback_id VARCHAR(255),
  video_recording_id UUID,
  -- Livestream
  is_live BOOLEAN DEFAULT FALSE,
  live_stream_id VARCHAR(255),
  live_stream_key VARCHAR(255),
  live_playback_id VARCHAR(255),
  live_status live_status DEFAULT 'idle',
  scheduled_start_time TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  -- Configuración de streaming
  streaming_type streaming_type DEFAULT 'agora',
  live_stream_url TEXT, -- URL externa (YouTube, etc.)
  recorded_video_url TEXT,
  agora_channel VARCHAR(255),
  agora_app_id VARCHAR(255),
  -- Recursos
  attachment_ids UUID[] DEFAULT '{}',
  resource_ids UUID[] DEFAULT '{}',
  form_template_id UUID,
  survey_id UUID,
  entry_survey_id UUID,
  exit_survey_id UUID,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  duration_minutes INTEGER,
  created_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- FORMULARIOS Y ENCUESTAS
-- ----------------------------------------------------------------------------

-- Tabla: form_templates (Plantillas de formularios/quizzes)
CREATE TABLE form_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  -- Estructura de Question:
  -- [{
  --   "id": "uuid",
  --   "type": "text" | "quiz" | ...,
  --   "questionText": "",
  --   "description": "",
  --   "options": [{ "label": "", "value": "", "imageUrl": "", "isCorrect": bool }],
  --   "correctAnswer": "" | [],
  --   "allowMultiple": bool,
  --   "isRequired": bool,
  --   "media": { "type": "", "url": "" },
  --   "order": number,
  --   "points": number
  -- }]
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: student_answers (Respuestas de estudiantes a formularios)
CREATE TABLE student_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  answer JSONB, -- Puede ser string o array de strings
  file_url TEXT,
  score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: surveys (Encuestas de entrada/salida)
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type survey_type NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  -- Misma estructura que form_templates.questions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: survey_responses (Respuestas a encuestas)
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  answers JSONB NOT NULL DEFAULT '[]',
  -- Estructura: [{ "questionId": "uuid", "answer": "" | [] }]
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- CHAT Y ENCUESTAS EN VIVO
-- ----------------------------------------------------------------------------

-- Tabla: live_chats (Sesiones de chat en vivo)
CREATE TABLE live_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: live_chat_messages (Mensajes del chat en vivo)
CREATE TABLE live_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  live_chat_id UUID NOT NULL REFERENCES live_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  user_avatar TEXT,
  user_role user_role NOT NULL,
  message TEXT NOT NULL,
  is_highlighted BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_question BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: live_polls (Encuestas rápidas en vivo)
CREATE TABLE live_polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  -- Estructura: [{ "id": "", "text": "", "votes": 0, "percentage": 0 }]
  duration INTEGER NOT NULL DEFAULT 30, -- Segundos (15-60)
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: live_poll_votes (Votos en encuestas rápidas)
CREATE TABLE live_poll_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES live_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id) -- Un voto por usuario por encuesta
);

-- ----------------------------------------------------------------------------
-- CERTIFICADOS
-- ----------------------------------------------------------------------------

-- Tabla: certificate_templates (Plantillas de certificados)
CREATE TABLE certificate_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  background_url TEXT NOT NULL,
  elements JSONB NOT NULL DEFAULT '[]',
  -- Estructura de CertificateElement:
  -- [{
  --   "id": "",
  --   "type": "text" | "variable" | "image",
  --   "value": "",
  --   "variableKey": "studentName" | "courseTitle" | ...,
  --   "x": number, "y": number, "width": number, "height": number,
  --   "style": { "fontSize": num, "fontFamily": "", "color": "", "bold": bool, ... }
  -- }]
  page_size certificate_page_size DEFAULT 'letter',
  orientation certificate_orientation DEFAULT 'landscape',
  design_width INTEGER,
  design_height INTEGER,
  signatures JSONB DEFAULT '[]',
  -- Estructura: [{ "id": "", "imageUrl": "", "name": "", "title": "" }]
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: certificates (Certificados emitidos)
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  certificate_template_id UUID NOT NULL REFERENCES certificate_templates(id) ON DELETE CASCADE,
  student_name VARCHAR(255) NOT NULL,
  course_title VARCHAR(255) NOT NULL,
  teacher_names TEXT[] NOT NULL DEFAULT '{}',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  certificate_url TEXT, -- URL del PDF generado
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, course_id) -- Un certificado por estudiante por curso
);

-- ----------------------------------------------------------------------------
-- ARCHIVOS Y RECURSOS
-- ----------------------------------------------------------------------------

-- Tabla: file_attachments (Archivos adjuntos)
CREATE TABLE file_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  size_kb INTEGER,
  category file_category DEFAULT 'general',
  related_id UUID, -- courseId, lessonId, etc.
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: file_attachments_lesson (Relación archivos-lección)
CREATE TABLE file_attachments_lesson (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  file_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: file_attachments_course (Relación archivos-curso)
CREATE TABLE file_attachments_course (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  file_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: teacher_resources (Recursos de maestros - antes "speakerResources")
CREATE TABLE teacher_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  size_kb INTEGER,
  category resource_category DEFAULT 'document',
  assigned_courses UUID[] DEFAULT '{}',
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: video_recordings (Grabaciones de video)
CREATE TABLE video_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id VARCHAR(255) NOT NULL, -- ID del servicio de video (Mux, etc.)
  playback_id VARCHAR(255) NOT NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  duration_seconds INTEGER,
  quality video_quality,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- STREAMING EN VIVO
-- ----------------------------------------------------------------------------

-- Tabla: live_streams (Transmisiones en vivo)
CREATE TABLE live_streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instructor_name VARCHAR(255),
  agora_channel VARCHAR(255) NOT NULL,
  agora_app_id VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT FALSE,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- ASISTENCIA
-- ----------------------------------------------------------------------------

-- Tabla: lesson_attendance (Asistencia a lecciones)
CREATE TABLE lesson_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  joined_live_at TIMESTAMPTZ,
  left_live_at TIMESTAMPTZ,
  total_live_minutes INTEGER DEFAULT 0,
  attended_live BOOLEAN DEFAULT FALSE,
  completed_entry_survey BOOLEAN DEFAULT FALSE,
  completed_exit_survey BOOLEAN DEFAULT FALSE,
  live_polls_answered INTEGER DEFAULT 0,
  total_live_polls INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id, student_id)
);

-- Tabla: live_stream_sessions (Sesiones de visualización)
CREATE TABLE live_stream_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- CONFIGURACIÓN DEL SITIO
-- ----------------------------------------------------------------------------

-- Tabla: site_config (Configuración global - MicroCert)
CREATE TABLE site_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuración inicial de MicroCert
INSERT INTO site_config (key, value, description) VALUES
  ('app_name', '"MicroCert"', 'Nombre de la aplicación'),
  ('app_name_full', '"MicroCert - Plataforma de Microcredenciales"', 'Nombre completo'),
  ('organization', '"Marca UNACH"', 'Organización propietaria'),
  ('theme', '{"primaryColor": "#192170", "secondaryColor": "#3C1970"}', 'Colores del tema'),
  ('features', '{"liveStreaming": true, "certificates": true, "quizzes": true}', 'Funcionalidades habilitadas');

-- ============================================================================
-- ÍNDICES
-- ============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);

-- Students
CREATE INDEX idx_students_user_id ON students(user_id);

-- Teachers
CREATE INDEX idx_teachers_user_id ON teachers(user_id);

-- Student Enrollments
CREATE INDEX idx_student_enrollments_student ON student_enrollments(student_id);
CREATE INDEX idx_student_enrollments_course ON student_enrollments(course_id);

-- Courses
CREATE INDEX idx_courses_is_active ON courses(is_active);
CREATE INDEX idx_courses_start_date ON courses(start_date);
CREATE INDEX idx_courses_difficulty ON courses(difficulty);

-- Lessons
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_lessons_order ON lessons(course_id, "order");
CREATE INDEX idx_lessons_is_live ON lessons(is_live);

-- Form Templates
CREATE INDEX idx_form_templates_course ON form_templates(course_id);
CREATE INDEX idx_form_templates_lesson ON form_templates(lesson_id);

-- Student Answers
CREATE INDEX idx_student_answers_student ON student_answers(student_id);
CREATE INDEX idx_student_answers_form ON student_answers(form_template_id);
CREATE INDEX idx_student_answers_course ON student_answers(course_id);

-- Surveys
CREATE INDEX idx_surveys_type ON surveys(type);
CREATE INDEX idx_surveys_course ON surveys(course_id);

-- Survey Responses
CREATE INDEX idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX idx_survey_responses_user ON survey_responses(user_id);

-- Live Chat Messages
CREATE INDEX idx_live_chat_messages_chat ON live_chat_messages(live_chat_id);
CREATE INDEX idx_live_chat_messages_created ON live_chat_messages(created_at);

-- Live Polls
CREATE INDEX idx_live_polls_lesson ON live_polls(lesson_id);
CREATE INDEX idx_live_polls_active ON live_polls(is_active);

-- Certificates
CREATE INDEX idx_certificates_student ON certificates(student_id);
CREATE INDEX idx_certificates_course ON certificates(course_id);

-- File Attachments
CREATE INDEX idx_file_attachments_owner ON file_attachments(owner_id);
CREATE INDEX idx_file_attachments_category ON file_attachments(category);

-- Teacher Resources
CREATE INDEX idx_teacher_resources_owner ON teacher_resources(owner_id);
CREATE INDEX idx_teacher_resources_deleted ON teacher_resources(is_deleted);

-- Lesson Attendance
CREATE INDEX idx_lesson_attendance_lesson ON lesson_attendance(lesson_id);
CREATE INDEX idx_lesson_attendance_student ON lesson_attendance(student_id);

-- Video Recordings
CREATE INDEX idx_video_recordings_course ON video_recordings(course_id);
CREATE INDEX idx_video_recordings_lesson ON video_recordings(lesson_id);

-- ============================================================================
-- TRIGGERS PARA updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_enrollments_updated_at BEFORE UPDATE ON student_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_templates_updated_at BEFORE UPDATE ON form_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_live_chats_updated_at BEFORE UPDATE ON live_chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certificate_templates_updated_at BEFORE UPDATE ON certificate_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_resources_updated_at BEFORE UPDATE ON teacher_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_live_streams_updated_at BEFORE UPDATE ON live_streams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_attendance_updated_at BEFORE UPDATE ON lesson_attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_config_updated_at BEFORE UPDATE ON site_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Políticas básicas
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_stream_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Política: Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Política: Todos pueden ver cursos activos
CREATE POLICY "Anyone can view active courses" ON courses
  FOR SELECT USING (is_active = true);

-- Política: Admins pueden hacer todo en cursos
CREATE POLICY "Admins can manage courses" ON courses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'superadmin')
    )
  );

-- Política: Estudiantes pueden ver sus propias respuestas
CREATE POLICY "Students can view own answers" ON student_answers
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

-- Política: Estudiantes pueden crear sus propias respuestas
CREATE POLICY "Students can create own answers" ON student_answers
  FOR INSERT WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

-- Política: Configuración del sitio visible para todos (lectura)
CREATE POLICY "Anyone can read site config" ON site_config
  FOR SELECT USING (true);

-- Política: Solo superadmins pueden modificar configuración
CREATE POLICY "Superadmins can manage site config" ON site_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'superadmin'
    )
  );

-- ============================================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE users IS 'Usuarios base del sistema MicroCert';
COMMENT ON TABLE students IS 'Perfil extendido para estudiantes';
COMMENT ON TABLE teachers IS 'Perfil extendido para maestros/instructores (antes speakers)';
COMMENT ON TABLE courses IS 'Cursos y microcredenciales';
COMMENT ON TABLE lessons IS 'Lecciones/módulos de cada curso';
COMMENT ON TABLE form_templates IS 'Plantillas de formularios y quizzes';
COMMENT ON TABLE student_answers IS 'Respuestas de estudiantes a formularios/quizzes';
COMMENT ON TABLE surveys IS 'Encuestas de entrada/salida';
COMMENT ON TABLE survey_responses IS 'Respuestas a encuestas';
COMMENT ON TABLE live_chats IS 'Sesiones de chat en vivo por lección';
COMMENT ON TABLE live_chat_messages IS 'Mensajes individuales del chat en vivo';
COMMENT ON TABLE live_polls IS 'Encuestas rápidas durante transmisiones en vivo';
COMMENT ON TABLE certificate_templates IS 'Plantillas editables de certificados';
COMMENT ON TABLE certificates IS 'Certificados emitidos a estudiantes';
COMMENT ON TABLE file_attachments IS 'Archivos adjuntos genéricos';
COMMENT ON TABLE teacher_resources IS 'Recursos y materiales de maestros (antes speakerResources)';
COMMENT ON TABLE video_recordings IS 'Grabaciones de video de sesiones';
COMMENT ON TABLE live_streams IS 'Configuración de transmisiones en vivo';
COMMENT ON TABLE lesson_attendance IS 'Registro de asistencia a lecciones en vivo';
COMMENT ON TABLE site_config IS 'Configuración global de MicroCert by Marca UNACH';

-- ============================================================================
-- FIN DEL SCHEMA
-- ============================================================================
