import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Types for progress data
interface ProgressResponse {
  progress: number; // 0-100 percentage
  completedLessons: string[]; // Array of lesson UUIDs
  subsectionProgress: Record<string, number>; // { lessonId: highestCompletedIndex }
  lastAccessedLessonId: string | null;
  totalLessons: number;
}

/**
 * GET /api/student/progress?courseId=...&userId=...
 * 
 * Returns the student's progress for a specific course including:
 * - Overall progress percentage
 * - Array of completed lesson IDs
 * - Subsection-level progress (lesson -> highest completed index)
 * - Last accessed lesson ID for "resume course" functionality
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const userId = searchParams.get("userId");

    if (!courseId || !userId) {
      return NextResponse.json(
        { error: "courseId and userId are required" },
        { status: 400 }
      );
    }

    // First, get the student record from the users table
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Get enrollment data with progress info
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("student_enrollments")
      .select(`
        progress,
        completed_lessons,
        subsection_progress,
        last_accessed_lesson_id
      `)
      .eq("student_id", student.id)
      .eq("course_id", courseId)
      .single();

    if (enrollmentError) {
      // If no enrollment found, return default empty progress
      if (enrollmentError.code === "PGRST116") {
        return NextResponse.json({
          progress: 0,
          completedLessons: [],
          subsectionProgress: {},
          lastAccessedLessonId: null,
          totalLessons: 0,
        } as ProgressResponse);
      }
      throw enrollmentError;
    }

    // Get total number of lessons for this course
    const { count: totalLessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId)
      .eq("is_active", true);

    if (lessonsError) {
      throw lessonsError;
    }

    const response: ProgressResponse = {
      progress: enrollment.progress || 0,
      completedLessons: enrollment.completed_lessons || [],
      subsectionProgress: enrollment.subsection_progress || {},
      lastAccessedLessonId: enrollment.last_accessed_lesson_id || null,
      totalLessons: totalLessons || 0,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[GET /api/student/progress] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Types for update request
interface UpdateProgressBody {
  courseId: string;
  userId: string;
  lessonId: string;
  subsectionIndex: number;
  isCompleted: boolean;
  totalSubsections: number; // Total subsections in this lesson
}

/**
 * POST /api/student/progress
 * 
 * Updates the student's progress for a specific lesson/subsection.
 * 
 * Logic:
 * 1. Always update last_accessed_lesson_id
 * 2. Update subsection_progress only if new index > current saved index
 * 3. If isCompleted=true (last subsection), add lesson to completed_lessons
 * 4. Recalculate overall progress percentage
 */
export async function POST(request: NextRequest) {
  try {
    const body: UpdateProgressBody = await request.json();
    const { courseId, userId, lessonId, subsectionIndex, isCompleted, totalSubsections } = body;

    // Validate required fields
    if (!courseId || !userId || !lessonId || subsectionIndex === undefined) {
      return NextResponse.json(
        { error: "courseId, userId, lessonId, and subsectionIndex are required" },
        { status: 400 }
      );
    }

    // Get student record
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Get current enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("student_enrollments")
      .select(`
        id,
        progress,
        completed_lessons,
        subsection_progress,
        last_accessed_lesson_id
      `)
      .eq("student_id", student.id)
      .eq("course_id", courseId)
      .single();

    if (enrollmentError) {
      console.error("[POST /api/student/progress] Enrollment error:", enrollmentError);
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const currentSubsectionProgress: Record<string, number> = 
      enrollment.subsection_progress || {};
    const currentCompletedLessons: string[] = 
      enrollment.completed_lessons || [];

    // 1. Always update last_accessed_lesson_id
    const updates: any = {
      last_accessed_lesson_id: lessonId,
      updated_at: new Date().toISOString(),
    };

    // 2. Update subsection_progress only if new index > current
    const currentIndex = currentSubsectionProgress[lessonId] ?? -1;
    if (subsectionIndex > currentIndex) {
      currentSubsectionProgress[lessonId] = subsectionIndex;
      updates.subsection_progress = currentSubsectionProgress;
    }

    // 3. If this is the last subsection (isCompleted), add to completed_lessons
    let newCompletedLessons = [...currentCompletedLessons];
    if (isCompleted && !currentCompletedLessons.includes(lessonId)) {
      newCompletedLessons.push(lessonId);
      updates.completed_lessons = newCompletedLessons;

      // 4. Recalculate progress percentage
      // Get total lessons count for this course
      const { count: totalLessons, error: countError } = await supabase
        .from("lessons")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId)
        .eq("is_active", true);

      if (!countError && totalLessons && totalLessons > 0) {
        const newProgress = Math.round(
          (newCompletedLessons.length / totalLessons) * 100
        );
        updates.progress = Math.min(newProgress, 100); // Cap at 100%
      }
    }

    // Perform the update
    const { data: updatedEnrollment, error: updateError } = await supabase
      .from("student_enrollments")
      .update(updates)
      .eq("id", enrollment.id)
      .select()
      .single();

    if (updateError) {
      console.error("[POST /api/student/progress] Update error:", updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      progress: updatedEnrollment.progress,
      completedLessons: updatedEnrollment.completed_lessons,
      subsectionProgress: updatedEnrollment.subsection_progress,
      lastAccessedLessonId: updatedEnrollment.last_accessed_lesson_id,
    });
  } catch (error: any) {
    console.error("[POST /api/student/progress] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

