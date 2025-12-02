import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";

export interface StudentData {
  id: string;
  userId: string;
  enrollmentDate: string;
  completedCourses: string[];
  certificates: string[];
  extraData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentData {
  userId: string;
  name: string;
  lastName?: string;
  email: string;
  phone?: string;
  username?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  state?: string;
}

export class StudentRepository {
  private table = TABLES.STUDENTS;
  private enrollmentsTable = TABLES.STUDENT_ENROLLMENTS;

  async create(data: CreateStudentData): Promise<StudentData> {
    const studentData = {
      user_id: data.userId,
      enrollment_date: new Date().toISOString(),
      completed_courses: [],
      certificates: [],
      extra_data: {},
    };

    const { data: insertedStudent, error } = await supabaseClient
      .from(this.table)
      .insert(studentData)
      .select()
      .single();

    if (error) {
      console.error("Error creating student:", error);
      throw error;
    }

    return this.mapToStudent(insertedStudent);
  }

  async findById(userId: string): Promise<StudentData | null> {
    const { data, error } = await supabaseClient
      .from(this.table)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapToStudent(data);
  }

  async findAll(): Promise<StudentData[]> {
    const { data, error } = await supabaseClient
      .from(this.table)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching students:", error);
      return [];
    }

    return (data || []).map(this.mapToStudent);
  }

  async enrollInCourse(userId: string, courseId: string): Promise<void> {
    // Primero obtener el student_id
    const student = await this.findById(userId);
    if (!student) {
      throw new Error("Estudiante no encontrado");
    }

    const enrollmentData = {
      student_id: student.id,
      course_id: courseId,
      progress: 0,
      completed_lessons: [],
    };

    const { error } = await supabaseClient
      .from(this.enrollmentsTable)
      .insert(enrollmentData);

    if (error) {
      // Si ya está inscrito, ignorar el error de duplicado
      if (!error.message.includes("duplicate")) {
        console.error("Error enrolling student:", error);
        throw error;
      }
    }
  }

  async unenrollFromCourse(userId: string, courseId: string): Promise<void> {
    const student = await this.findById(userId);
    if (!student) return;

    const { error } = await supabaseClient
      .from(this.enrollmentsTable)
      .delete()
      .eq("student_id", student.id)
      .eq("course_id", courseId);

    if (error) {
      console.error("Error unenrolling student:", error);
      throw error;
    }
  }

  async updateProgress(
    userId: string,
    courseId: string,
    progress: number,
    completedLessons: string[]
  ): Promise<void> {
    const student = await this.findById(userId);
    if (!student) return;

    const { error } = await supabaseClient
      .from(this.enrollmentsTable)
      .update({
        progress,
        completed_lessons: completedLessons,
      })
      .eq("student_id", student.id)
      .eq("course_id", courseId);

    if (error) {
      console.error("Error updating progress:", error);
      throw error;
    }
  }

  async getEnrolledCourses(userId: string): Promise<string[]> {
    const student = await this.findById(userId);
    if (!student) return [];

    const { data, error } = await supabaseClient
      .from(this.enrollmentsTable)
      .select("course_id")
      .eq("student_id", student.id);

    if (error) {
      console.error("Error fetching enrolled courses:", error);
      return [];
    }

    return (data || []).map((row: { course_id: string }) => row.course_id);
  }

  async addCompletedCourse(userId: string, courseId: string): Promise<void> {
    const student = await this.findById(userId);
    if (!student) return;

    const completedCourses = [...(student.completedCourses || []), courseId];

    const { error } = await supabaseClient
      .from(this.table)
      .update({ completed_courses: completedCourses })
      .eq("user_id", userId);

    if (error) {
      console.error("Error adding completed course:", error);
      throw error;
    }
  }

  async addCertificate(userId: string, certificateId: string): Promise<void> {
    const student = await this.findById(userId);
    if (!student) return;

    const certificates = [...(student.certificates || []), certificateId];

    const { error } = await supabaseClient
      .from(this.table)
      .update({ certificates })
      .eq("user_id", userId);

    if (error) {
      console.error("Error adding certificate:", error);
      throw error;
    }
  }

  async delete(userId: string): Promise<void> {
    const { error } = await supabaseClient
      .from(this.table)
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting student:", error);
      throw error;
    }
  }

  private mapToStudent(data: Record<string, unknown>): StudentData {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      enrollmentDate: data.enrollment_date as string,
      completedCourses: (data.completed_courses as string[]) || [],
      certificates: (data.certificates as string[]) || [],
      extraData: data.extra_data as Record<string, unknown>,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

export const studentRepository = new StudentRepository();
