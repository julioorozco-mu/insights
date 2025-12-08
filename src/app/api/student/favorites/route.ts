import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/student/favorites
 * Retrieves all favorite courses for a user OR checks if a specific course is favorited
 * Query params: userId, courseId? (optional - if provided, checks single course)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const courseId = searchParams.get("courseId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // If courseId is provided, check if that specific course is favorited
    if (courseId) {
      const { data: favorite, error } = await supabase
        .from("course_favorites")
        .select("id, course_id, user_id, created_at")
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("[GET /api/student/favorites] Error:", error);
        return NextResponse.json(
          { error: "Error checking favorite status" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        isFavorite: !!favorite,
        favorite: favorite || null,
      });
    }

    // Otherwise, fetch all favorites with course details
    const { data: favorites, error } = await supabase
      .from("course_favorites")
      .select(`
        id,
        course_id,
        user_id,
        created_at,
        courses:course_id (
          id,
          title,
          description,
          cover_image_url,
          thumbnail_url,
          teacher_ids,
          tags,
          difficulty,
          average_rating,
          reviews_count,
          price,
          sale_percentage,
          is_published
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/student/favorites] Error fetching favorites:", error);
      return NextResponse.json(
        { error: "Error fetching favorites" },
        { status: 500 }
      );
    }

    // Fetch teacher names for each favorite course
    const teacherIds = new Set<string>();
    favorites?.forEach((fav: any) => {
      if (fav.courses?.teacher_ids) {
        fav.courses.teacher_ids.forEach((id: string) => teacherIds.add(id));
      }
    });

    let teachersMap: Record<string, { name: string; avatarUrl?: string }> = {};
    if (teacherIds.size > 0) {
      const { data: teachers } = await supabase
        .from("users")
        .select("id, name, avatar_url")
        .in("id", Array.from(teacherIds));

      if (teachers) {
        teachers.forEach((t) => {
          teachersMap[t.id] = { name: t.name, avatarUrl: t.avatar_url };
        });
      }
    }

    // Transform favorites with teacher info
    const favoritesWithTeachers = favorites?.map((fav: any) => ({
      ...fav,
      courses: fav.courses ? {
        ...fav.courses,
        teachers: fav.courses.teacher_ids?.map((id: string) => ({
          id,
          ...teachersMap[id],
        })) || [],
      } : null,
    }));

    return NextResponse.json({
      favorites: favoritesWithTeachers || [],
      count: favorites?.length || 0,
    });
  } catch (error) {
    console.error("[GET /api/student/favorites] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student/favorites
 * Adds a course to favorites
 * Body: { courseId, userId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, userId } = body;

    // Validation
    if (!courseId || !userId) {
      return NextResponse.json(
        { error: "courseId and userId are required" },
        { status: 400 }
      );
    }

    // Check if course exists
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Insert the favorite (will fail if already exists due to unique constraint)
    const { data: favorite, error } = await supabase
      .from("course_favorites")
      .insert({
        course_id: courseId,
        user_id: userId,
      })
      .select("id, course_id, user_id, created_at")
      .single();

    if (error) {
      // Check if it's a duplicate error
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Course is already in favorites", alreadyFavorite: true },
          { status: 409 }
        );
      }
      console.error("[POST /api/student/favorites] Error:", error);
      return NextResponse.json(
        { error: "Error adding to favorites" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      favorite,
      message: "Curso añadido a favoritos",
    });
  } catch (error) {
    console.error("[POST /api/student/favorites] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/student/favorites
 * Removes a course from favorites
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

    // Delete the favorite
    const { error } = await supabase
      .from("course_favorites")
      .delete()
      .eq("course_id", courseId)
      .eq("user_id", userId);

    if (error) {
      console.error("[DELETE /api/student/favorites] Error:", error);
      return NextResponse.json(
        { error: "Error removing from favorites" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Curso eliminado de favoritos",
    });
  } catch (error) {
    console.error("[DELETE /api/student/favorites] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

