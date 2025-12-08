import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/student/rating
 * Retrieves the existing review for a user on a specific course
 * Query params: courseId, userId
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

    // Fetch the user's review for this course
    const { data: review, error } = await supabase
      .from("course_reviews")
      .select("id, course_id, student_id, rating, comment, created_at, updated_at")
      .eq("course_id", courseId)
      .eq("student_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/student/rating] Error:", error);
      return NextResponse.json(
        { error: "Error fetching review" },
        { status: 500 }
      );
    }

    // Also fetch course rating stats
    const { data: courseStats, error: statsError } = await supabase
      .from("courses")
      .select("average_rating, reviews_count")
      .eq("id", courseId)
      .single();

    if (statsError) {
      console.error("[GET /api/student/rating] Stats error:", statsError);
    }

    return NextResponse.json({
      review: review || null,
      courseStats: courseStats || { average_rating: 0, reviews_count: 0 },
    });
  } catch (error) {
    console.error("[GET /api/student/rating] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student/rating
 * Creates or updates (upsert) a review for a course
 * Body: { courseId, userId, rating, comment? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, userId, rating, comment } = body;

    // Validation
    if (!courseId || !userId) {
      return NextResponse.json(
        { error: "courseId and userId are required" },
        { status: 400 }
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Validate comment length if provided
    if (comment && comment.length > 2000) {
      return NextResponse.json(
        { error: "Comment must be less than 2000 characters" },
        { status: 400 }
      );
    }

    // Upsert the review (insert or update if exists)
    const { data: review, error } = await supabase
      .from("course_reviews")
      .upsert(
        {
          course_id: courseId,
          student_id: userId,
          rating: Math.round(rating),
          comment: comment?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "course_id,student_id",
          ignoreDuplicates: false,
        }
      )
      .select("id, course_id, student_id, rating, comment, created_at, updated_at")
      .single();

    if (error) {
      console.error("[POST /api/student/rating] Error:", error);
      return NextResponse.json(
        { error: "Error saving review" },
        { status: 500 }
      );
    }

    // Fetch updated course stats (trigger should have updated them)
    const { data: courseStats } = await supabase
      .from("courses")
      .select("average_rating, reviews_count")
      .eq("id", courseId)
      .single();

    return NextResponse.json({
      success: true,
      review,
      courseStats: courseStats || { average_rating: 0, reviews_count: 0 },
    });
  } catch (error) {
    console.error("[POST /api/student/rating] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/student/rating
 * Deletes a user's review for a course
 * Query params: courseId, userId
 */
export async function DELETE(request: NextRequest) {
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

    // Delete the review
    const { error } = await supabase
      .from("course_reviews")
      .delete()
      .eq("course_id", courseId)
      .eq("student_id", userId);

    if (error) {
      console.error("[DELETE /api/student/rating] Error:", error);
      return NextResponse.json(
        { error: "Error deleting review" },
        { status: 500 }
      );
    }

    // Fetch updated course stats
    const { data: courseStats } = await supabase
      .from("courses")
      .select("average_rating, reviews_count")
      .eq("id", courseId)
      .single();

    return NextResponse.json({
      success: true,
      courseStats: courseStats || { average_rating: 0, reviews_count: 0 },
    });
  } catch (error) {
    console.error("[DELETE /api/student/rating] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

