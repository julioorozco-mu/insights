import { Question } from "./form";

// Colección: surveys
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

export interface SurveyResponse {
  id: string;
  surveyId: string;
  userId: string;
  userName: string;
  courseId?: string;
  lessonId?: string;
  answers: SurveyAnswer[];
  submittedAt: string;
}

export interface SurveyAnswer {
  questionId: string;
  answer: string | string[];
}

export interface SurveyStats {
  surveyId: string;
  totalResponses: number;
  questionStats: QuestionStats[];
}

export interface QuestionStats {
  questionId: string;
  question: string;
  type: string;
  responses: {
    [key: string]: number; // opción -> cantidad de respuestas
  };
  percentages: {
    [key: string]: number; // opción -> porcentaje
  };
}

export interface CreateSurveyData {
  title: string;
  description?: string;
  type: "entry" | "exit" | "lesson";
  courseId?: string;
  lessonId?: string;
  questions: Omit<Question, "id">[];
}

export interface UpdateSurveyData {
  title?: string;
  description?: string;
  type?: "entry" | "exit" | "lesson";
  questions?: Question[];
}
