import type { SupabaseClient } from "@supabase/supabase-js";
import { TABLES } from "@/utils/constants";

export type CourseForRecommendation = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  cover_image_url: string | null;
  difficulty: string | null;
  average_rating: number | null;
  reviews_count: number | null;
  created_at: string | null;
  teacher_ids: string[] | null;
};

const COURSE_RECOMMENDATION_SELECT =
  "id, title, description, thumbnail_url, cover_image_url, difficulty, average_rating, reviews_count, created_at, teacher_ids";

/**
 * Custom sorting function for recommended courses:
 * 1. Courses with ratings (average_rating > 0) sorted by rating DESC
 * 2. Courses without ratings (null or 0) sorted by created_at DESC (most recent first)
 */
function sortRecommendedCourses(courses: CourseForRecommendation[]): CourseForRecommendation[] {
  return [...courses].sort((a, b) => {
    const aHasRating = a.average_rating !== null && a.average_rating > 0;
    const bHasRating = b.average_rating !== null && b.average_rating > 0;

    // Both have ratings: sort by rating DESC
    if (aHasRating && bHasRating) {
      return (b.average_rating as number) - (a.average_rating as number);
    }

    // Only one has rating: rated course comes first
    if (aHasRating && !bHasRating) return -1;
    if (!aHasRating && bHasRating) return 1;

    // Neither has rating: sort by created_at DESC (most recent first)
    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bDate - aDate;
  });
}

export async function fetchRecommendedCourses(
  supabase: SupabaseClient,
  {
    desiredCount,
    excludeCourseIds,
    pageSize = 50,
    maxPages = 5,
  }: {
    desiredCount: number;
    excludeCourseIds?: Set<string>;
    pageSize?: number;
    maxPages?: number;
  }
): Promise<CourseForRecommendation[]> {
  const allCourses: CourseForRecommendation[] = [];
  const excluded = excludeCourseIds ?? new Set<string>();

  // Fetch more courses than needed to allow for exclusions and proper sorting
  const fetchLimit = Math.max(desiredCount * 3, pageSize);

  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from(TABLES.COURSES)
      .select(COURSE_RECOMMENDATION_SELECT)
      .eq("is_active", true)
      .eq("is_published", true)
      .range(from, to);

    if (error) throw error;
    const pageRows = (data || []) as CourseForRecommendation[];
    if (pageRows.length === 0) break;

    // Add non-excluded courses
    for (const course of pageRows) {
      if (!excluded.has(course.id)) {
        allCourses.push(course);
      }
    }

    // Stop if we have enough courses to sort from
    if (allCourses.length >= fetchLimit) break;
    if (pageRows.length < pageSize) break;
  }

  // Apply custom sorting and return desired count
  const sorted = sortRecommendedCourses(allCourses);
  return sorted.slice(0, desiredCount);
}

