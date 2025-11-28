// Colección: formTemplates
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
  type: 
    | "text"              // Texto corto (alias de short_text)
    | "short_text"        // Texto corto
    | "long_text"         // Texto largo (textarea)
    | "number"            // Numérica
    | "single_choice"     // Radio button (una sola opción)
    | "multiple_choice"   // Checkbox (múltiples opciones)
    | "dropdown"          // Selector dropdown
    | "quiz"              // Opción múltiple con respuesta correcta
    | "file_upload"       // Subir archivo
    | "image_choice"      // Selección con imágenes
    | "video_response";   // Respuesta en video
  questionText: string;
  description?: string;   // Descripción adicional de la pregunta
  options?: {
    label: string;
    value: string;
    imageUrl?: string;
    isCorrect?: boolean;  // Para tipo "quiz"
  }[];
  correctAnswer?: string | string[];  // Respuesta correcta para quiz
  allowMultiple?: boolean;
  isRequired?: boolean;
  media?: {
    type: "image" | "video" | "audio";
    url: string;
  };
  order: number;
  points?: number;  // Puntos para quiz
}

// Colección: studentAnswers
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

export interface CreateFormTemplateData {
  title: string;
  description?: string;
  courseId?: string;
  lessonId?: string;
  questions: Omit<Question, "id">[];
}

export interface UpdateFormTemplateData {
  title?: string;
  description?: string;
  questions?: Question[];
  isActive?: boolean;
}

export interface CreateStudentAnswerData {
  studentId: string;
  courseId: string;
  formTemplateId: string;
  questionId: string;
  lessonId?: string;
  answer?: string | string[];
  fileUrl?: string;
}
