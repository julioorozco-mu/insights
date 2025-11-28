// Colección: lessonNotes
export interface LessonNotes {
  id: string;
  studentId: string;
  studentName: string;
  lessonId: string;
  courseId: string;
  notes: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export interface CreateLessonNotesData {
  studentId: string;
  studentName: string;
  lessonId: string;
  courseId: string;
  notes: string;
  createdAt: any;
  updatedAt: any;
}

export interface UpdateLessonNotesData {
  notes: string;
  updatedAt: any;
}
