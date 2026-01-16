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

    // Get all lessons with content to calculate progress based on subsections
    const { data: allLessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("id, content")
      .eq("course_id", courseId)
      .eq("is_active", true);

    if (lessonsError) {
      throw lessonsError;
    }

    // Recalculate progress based on subsections (not just completed lessons)
    // This ensures consistency with the POST calculation and handles legacy data
    const completedLessons: string[] = enrollment.completed_lessons || [];
    const subsectionProgress: Record<string, number> = enrollment.subsection_progress || {};

    let totalSubsections = 0;
    let completedSubsections = 0;

    for (const lesson of allLessons || []) {
      let subsectionCount = 1; // Default to 1 if no subsections found
      try {
        if (lesson.content) {
          const parsed = JSON.parse(lesson.content);
          subsectionCount = parsed.subsections?.length || 1;
        }
      } catch {
        // If JSON parse fails, count as 1 subsection
      }

      totalSubsections += subsectionCount;

      if (completedLessons.includes(lesson.id)) {
        // Lesson is fully completed = all its subsections are complete
        completedSubsections += subsectionCount;
      } else {
        // Count partially completed subsections
        const highestIndex = subsectionProgress[lesson.id] ?? -1;
        if (highestIndex >= 0) {
          // +1 because index is 0-based
          completedSubsections += Math.min(highestIndex + 1, subsectionCount);
        }
      }
    }

    // Calculate progress percentage
    const calculatedProgress = totalSubsections > 0
      ? Math.round((completedSubsections / totalSubsections) * 100)
      : 0;

    const response: ProgressResponse = {
      progress: Math.min(calculatedProgress, 100), // Cap at 100%
      completedLessons,
      subsectionProgress,
      lastAccessedLessonId: enrollment.last_accessed_lesson_id || null,
      totalLessons: allLessons?.length || 0,
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
    }

    // 4. Recalculate progress percentage based on SUBSECTIONS (not just lessons)
    // This provides more granular progress tracking
    const { data: allLessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("id, content")
      .eq("course_id", courseId)
      .eq("is_active", true);

    if (!lessonsError && allLessons && allLessons.length > 0) {
      let totalSubsections = 0;
      let completedSubsections = 0;

      // Use the updated subsection progress (including the current update)
      const updatedSubsectionProgress = updates.subsection_progress || currentSubsectionProgress;
      const updatedCompletedLessons = updates.completed_lessons || newCompletedLessons;

      for (const lesson of allLessons) {
        let subsectionCount = 1; // Default to 1 if no subsections found
        try {
          if (lesson.content) {
            const parsed = JSON.parse(lesson.content);
            subsectionCount = parsed.subsections?.length || 1;
          }
        } catch {
          // If JSON parse fails, count as 1 subsection
        }

        totalSubsections += subsectionCount;

        if (updatedCompletedLessons.includes(lesson.id)) {
          // Lesson is fully completed = all its subsections are complete
          completedSubsections += subsectionCount;
        } else {
          // Count partially completed subsections
          const highestIndex = updatedSubsectionProgress[lesson.id] ?? -1;
          if (highestIndex >= 0) {
            // +1 because index is 0-based
            completedSubsections += Math.min(highestIndex + 1, subsectionCount);
          }
        }
      }

      const newProgress = totalSubsections > 0
        ? Math.round((completedSubsections / totalSubsections) * 100)
        : 0;

      updates.progress = Math.min(newProgress, 100); // Cap at 100%
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

    // Obtener los datos actualizados para devolverlos
    const { data: finalEnrollment } = await supabase
      .from("student_enrollments")
      .select('progress, completed_lessons, subsection_progress')
      .eq("id", enrollment.id)
      .single();

    return NextResponse.json({
      success: true,
      progress: finalEnrollment?.progress || updates.progress || enrollment.progress || 0,
      completedLessons: finalEnrollment?.completed_lessons || updates.completed_lessons || enrollment.completed_lessons || [],
      subsectionProgress: finalEnrollment?.subsection_progress || updates.subsection_progress || enrollment.subsection_progress || {},
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

