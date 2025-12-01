import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";

export class AttendanceService {
  async recordJoin(lessonId: string, studentId: string, courseId: string) {
    const { error } = await supabaseClient
      .from(TABLES.LESSON_ATTENDANCE)
      .upsert({
        lesson_id: lessonId,
        student_id: studentId,
        course_id: courseId,
        joined_live_at: new Date().toISOString(),
      }, { onConflict: "lesson_id,student_id" });
    if (error) console.error("Error recording join:", error);
  }

  async recordLeave(lessonId: string, studentId: string) {
    const { error } = await supabaseClient
      .from(TABLES.LESSON_ATTENDANCE)
      .update({ left_live_at: new Date().toISOString() })
      .eq("lesson_id", lessonId)
      .eq("student_id", studentId);
    if (error) console.error("Error recording leave:", error);
  }

  async getAttendance(lessonId: string) {
    const { data } = await supabaseClient
      .from(TABLES.LESSON_ATTENDANCE)
      .select("*")
      .eq("lesson_id", lessonId);
    return data || [];
  }

  async getStudentAttendance(studentId: string, courseId: string) {
    const { data } = await supabaseClient
      .from(TABLES.LESSON_ATTENDANCE)
      .select("*")
      .eq("student_id", studentId)
      .eq("course_id", courseId);
    return data || [];
  }

  async markSurveyCompleted(lessonId: string, studentId: string, type: "entry" | "exit") {
    const field = type === "entry" ? "completed_entry_survey" : "completed_exit_survey";
    const { error } = await supabaseClient
      .from(TABLES.LESSON_ATTENDANCE)
      .update({ [field]: true })
      .eq("lesson_id", lessonId)
      .eq("student_id", studentId);
    if (error) console.error("Error marking survey completed:", error);
  }
}

export const attendanceService = new AttendanceService();
