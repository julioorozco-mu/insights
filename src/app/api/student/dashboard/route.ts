import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { fetchRecommendedCourses } from '@/lib/dashboard/recommendations';
import { TABLES } from '@/utils/constants';
import { getApiAuthUser } from '@/lib/auth/apiRouteAuth';

// Types for the response
interface EnrolledCourseData {
  course: {
    id: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    coverImageUrl: string | null;
    difficulty: string | null;
    tags: string[] | null;
    averageRating: number;
    reviewsCount: number;
  };
  enrollment: {
    id: string;
    courseId: string;
    studentId: string;
    enrolledAt: string;
    progress: number;
    completedLessons: string[];
    subsectionProgress: Record<string, number>;
    lastAccessedLessonId: string | null;
  };
  lessonsCount: number;
  completedLessonsCount: number;
  progressPercent: number;
  studyTimeMinutes: number;
}

interface RecommendedCourse {
  courseId: string;
  level: string;
  title: string;
  description: string;
  students: number;
  lessons: number;
  rating: number;
  reviewsCount: number;
  thumbnail: string;
  teacherName?: string;
  teacherAvatarUrl?: string;
}

interface ScheduleItem {
  type: string;
  title: string;
  date: string;
  time: string;
  courseId: string;
  lessonId: string;
  lessonDate: string;
}

interface DashboardStats {
  progressPercentage: number;
  completedCourses: number;
  coursesInProgress: number;
  totalStudyMinutes: number;
  completedMicrocredentials: number;
  microcredentialsInProgress: number;
}

interface DashboardResponse {
  enrolledCourses: EnrolledCourseData[];
  recommendedCourses: RecommendedCourse[];
  scheduleItems: ScheduleItem[];
  stats: DashboardStats;
  favorites: string[];
}

// Helper to clean HTML from description
function cleanDescription(html: string | null, maxLength: number = 100): string {
  if (!html) return 'Sin descripción disponible';

  let text = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length > maxLength) {
    text = text.substring(0, maxLength).trim() + '...';
  }

  return text || 'Sin descripción disponible';
}

// Helper to map difficulty to Spanish level
function mapDifficultyToLevel(difficulty: string | null): string {
  switch (difficulty) {
    case 'beginner': return 'Introductorio';
    case 'intermediate': return 'Intermedio';
    case 'advanced': return 'Avanzado';
    default: return 'Introductorio';
  }
}

// Optimized: Calculate study time from lesson data without JSON.parse
function estimateStudyTimeForLesson(lesson: {
  duration_minutes: number | null;
}): number {
  if (lesson.duration_minutes && lesson.duration_minutes > 0) {
    return lesson.duration_minutes;
  }

  // Fallback: estimate 15 min per lesson if no duration
  // Skip JSON.parse for performance - it's expensive
  return 15;
}

export async function GET(req: NextRequest) {
  const startTime = performance.now();

  try {
    const authUser = await getApiAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (authUser.role !== 'student') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date();


    // 1. First, get the student record to get the actual student_id
    const { data: student } = await supabase
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle();

    // Early exit for new students with no record - but still get recommended courses
    if (!student) {
      // Get courses for recommendations even for new users
      const recommendedCoursesFiltered = await fetchRecommendedCourses(supabase, {
        desiredCount: 4,
      });
      const recommendedCourseIds = recommendedCoursesFiltered.map(c => c.id);

      // Get student counts and lessons counts
      const [studentCountsResult, lessonsCountResult] = await Promise.all([
        recommendedCourseIds.length > 0
          ? supabase.from(TABLES.STUDENT_ENROLLMENTS).select('course_id').in('course_id', recommendedCourseIds)
          : Promise.resolve({ data: [] }),
        recommendedCourseIds.length > 0
          ? supabase.from(TABLES.LESSONS).select('course_id').in('course_id', recommendedCourseIds).eq('is_active', true)
          : Promise.resolve({ data: [] }),
      ]);

      const studentCountsMap = new Map<string, number>();
      for (const row of studentCountsResult.data || []) {
        studentCountsMap.set(row.course_id, (studentCountsMap.get(row.course_id) || 0) + 1);
      }

      const lessonsCountMap = new Map<string, number>();
      for (const row of lessonsCountResult.data || []) {
        lessonsCountMap.set(row.course_id, (lessonsCountMap.get(row.course_id) || 0) + 1);
      }

      // Get teacher data
      const teacherIds = new Set<string>();
      for (const course of recommendedCoursesFiltered) {
        const c = course as any;
        if (c.teacher_ids?.[0]) teacherIds.add(c.teacher_ids[0]);
      }

      const teachersMap = new Map<string, { name: string; lastName?: string; avatarUrl?: string }>();
      if (teacherIds.size > 0) {
        const { data: teachersData } = await supabase
          .from(TABLES.USERS)
          .select('id, name, last_name, avatar_url')
          .in('id', Array.from(teacherIds));

        for (const t of teachersData || []) {
          teachersMap.set(t.id, { name: t.name, lastName: t.last_name, avatarUrl: t.avatar_url });
        }
      }

      const recommendedCourses = recommendedCoursesFiltered.map(course => {
        const c = course as any;
        const teacherId = c.teacher_ids?.[0];
        const teacher = teacherId ? teachersMap.get(teacherId) : null;
        const teacherFullName = teacher
          ? `${teacher.name}${teacher.lastName ? ' ' + teacher.lastName : ''}`.trim()
          : undefined;

        return {
          courseId: course.id,
          level: mapDifficultyToLevel(course.difficulty),
          title: course.title,
          description: cleanDescription(course.description),
          students: studentCountsMap.get(course.id) || 0,
          lessons: lessonsCountMap.get(course.id) || 0,
          rating: course.average_rating || 0,
          reviewsCount: course.reviews_count || 0,
          thumbnail: course.thumbnail_url || course.cover_image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
          teacherName: teacherFullName,
          teacherAvatarUrl: teacher?.avatarUrl,
        };
      });

      return NextResponse.json({
        enrolledCourses: [],
        recommendedCourses,
        scheduleItems: [],
        stats: {
          progressPercentage: 0,
          completedCourses: 0,
          coursesInProgress: 0,
          totalStudyMinutes: 0,
          completedMicrocredentials: 0,
          microcredentialsInProgress: 0,
        },
        favorites: [],
      } as DashboardResponse);
    }

    // Use the actual student.id for enrollment queries
    const studentId = student.id;

    // 2. Now fetch all data in parallel using the correct student.id
    const [
      enrollmentsWithCoursesResult,
      favoritesResult,
      microcredentialEnrollmentsResult,
    ] = await Promise.all([
      // Get enrollments with embedded course data (single JOIN query)
      supabase
        .from(TABLES.STUDENT_ENROLLMENTS)
        .select(`
          id,
          course_id,
          student_id,
          enrolled_at,
          progress,
          completed_lessons,
          subsection_progress,
          last_accessed_lesson_id,
          courses:course_id (
            id,
            title,
            description,
            thumbnail_url,
            cover_image_url,
            difficulty,
            tags,
            average_rating,
            reviews_count,
            teacher_ids
          )
        `)
        .eq('student_id', studentId),

      // Get favorites (uses idx_course_favorites_user_id)
      supabase
        .from('course_favorites')
        .select('course_id')
        .eq('user_id', authUser.id),

      // Get microcredential enrollments
      supabase
        .from('microcredential_enrollments')
        .select(`
          id,
          level_1_completed,
          level_2_completed,
          badge_unlocked,
          status,
          microcredential_id,
          microcredentials!inner (
            course_level_1_id,
            course_level_2_id
          )
        `)
        .eq('student_id', studentId),
    ]);


    const enrollmentsData = enrollmentsWithCoursesResult.data || [];
    const favoritesData = favoritesResult.data || [];
    const microcredentialEnrollments = microcredentialEnrollmentsResult.data || [];

    const favoriteIds = new Set(favoritesData.map((f: { course_id: string }) => f.course_id));
    const enrolledCourseIds = new Set(enrollmentsData.map((e: { course_id: string }) => e.course_id));
    const enrolledCourseIdsArray = Array.from(enrolledCourseIds) as string[];

    // OPTIMIZATION: Single batch for lessons + student counts + recommended lessons
    const recommendedCoursesFiltered = await fetchRecommendedCourses(supabase, {
      desiredCount: 4,
      excludeCourseIds: enrolledCourseIds,
    });
    const recommendedCourseIds = recommendedCoursesFiltered.map(c => c.id);

    const [
      enrolledLessonsResult,
      recommendedStudentCountsResult,
      recommendedLessonsCountResult,
    ] = await Promise.all([
      // Lessons for enrolled courses
      supabase
        .from(TABLES.LESSONS)
        .select('id, course_id, title, duration_minutes, start_date, scheduled_start_time, type, is_active')
        .in('course_id', enrolledCourseIdsArray.length > 0 ? enrolledCourseIdsArray : ['none'])
        .eq('is_active', true),

      // Student counts for recommended courses (aggregated)
      recommendedCourseIds.length > 0
        ? supabase
          .from(TABLES.STUDENT_ENROLLMENTS)
          .select('course_id')
          .in('course_id', recommendedCourseIds)
        : Promise.resolve({ data: [] }),

      // Lessons counts for recommended courses
      recommendedCourseIds.length > 0
        ? supabase
          .from(TABLES.LESSONS)
          .select('course_id')
          .in('course_id', recommendedCourseIds)
          .eq('is_active', true)
        : Promise.resolve({ data: [] }),
    ]);

    // Build lessons by course map
    const lessonsByCourse = new Map<string, typeof enrolledLessonsResult.data>();
    for (const lesson of enrolledLessonsResult.data || []) {
      if (!lessonsByCourse.has(lesson.course_id)) {
        lessonsByCourse.set(lesson.course_id, []);
      }
      lessonsByCourse.get(lesson.course_id)!.push(lesson);
    }

    // Build recommended courses counts
    const studentCountsMap = new Map<string, number>();
    for (const row of recommendedStudentCountsResult.data || []) {
      studentCountsMap.set(row.course_id, (studentCountsMap.get(row.course_id) || 0) + 1);
    }

    const lessonsCountMap = new Map<string, number>();
    for (const row of recommendedLessonsCountResult.data || []) {
      lessonsCountMap.set(row.course_id, (lessonsCountMap.get(row.course_id) || 0) + 1);
    }

    // Process enrolled courses
    const enrolledCourses: EnrolledCourseData[] = [];
    let totalStudyMinutes = 0;
    const upcomingLessons: { lesson: any; courseName: string }[] = [];

    for (const enrollment of enrollmentsData) {
      const course = enrollment.courses as any;
      if (!course) continue;

      const courseLessons = lessonsByCourse.get(course.id) || [];
      const completedLessonsSet = new Set(enrollment.completed_lessons || []);

      // Calculate study time (optimized - no JSON.parse)
      let courseStudyTime = 0;
      for (const lesson of courseLessons) {
        if (completedLessonsSet.has(lesson.id)) {
          courseStudyTime += estimateStudyTimeForLesson(lesson);
        }

        // Collect upcoming lessons
        const lessonDateStr = lesson.start_date || lesson.scheduled_start_time;
        if (lessonDateStr) {
          const lessonDate = new Date(lessonDateStr);
          if (lessonDate >= now) {
            upcomingLessons.push({ lesson, courseName: course.title });
          }
        }
      }

      totalStudyMinutes += courseStudyTime;

      enrolledCourses.push({
        course: {
          id: course.id,
          title: course.title,
          description: course.description,
          thumbnailUrl: course.thumbnail_url,
          coverImageUrl: course.cover_image_url,
          difficulty: course.difficulty,
          tags: course.tags,
          averageRating: course.average_rating || 0,
          reviewsCount: course.reviews_count || 0,
        },
        enrollment: {
          id: enrollment.id,
          courseId: enrollment.course_id,
          studentId: enrollment.student_id,
          enrolledAt: enrollment.enrolled_at,
          progress: enrollment.progress || 0,
          completedLessons: enrollment.completed_lessons || [],
          subsectionProgress: enrollment.subsection_progress || {},
          lastAccessedLessonId: enrollment.last_accessed_lesson_id,
        },
        lessonsCount: courseLessons.length,
        completedLessonsCount: completedLessonsSet.size,
        progressPercent: enrollment.progress || 0,
        studyTimeMinutes: courseStudyTime,
      });
    }

    // Process schedule items
    upcomingLessons.sort((a, b) => {
      const dateA = new Date(a.lesson.start_date || a.lesson.scheduled_start_time);
      const dateB = new Date(b.lesson.start_date || b.lesson.scheduled_start_time);
      return dateA.getTime() - dateB.getTime();
    });

    const scheduleItems: ScheduleItem[] = upcomingLessons.slice(0, 5).map(({ lesson, courseName }) => {
      const lessonDate = new Date(lesson.start_date || lesson.scheduled_start_time);
      const endTime = lesson.duration_minutes
        ? new Date(lessonDate.getTime() + lesson.duration_minutes * 60000)
        : new Date(lessonDate.getTime() + 60 * 60000);

      return {
        type: lesson.type === 'livestream' ? 'En Vivo' : 'Lección',
        title: `${courseName}: ${lesson.title}`,
        date: lessonDate.toLocaleDateString('es-ES', { month: 'long', day: 'numeric' }),
        time: `${lessonDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
        courseId: lesson.course_id,
        lessonId: lesson.id,
        lessonDate: lessonDate.toISOString(),
      };
    });

    // Calculate stats
    const completedCourses = enrolledCourses.filter(e => e.progressPercent >= 100).length;
    const completedMicrocredentials = microcredentialEnrollments.filter(
      (m: any) => m.badge_unlocked === true
    ).length;
    const microcredentialsInProgress = microcredentialEnrollments.filter(
      (m: any) => m.status === 'in_progress' && !m.badge_unlocked
    ).length;

    // Calculate progress percentage
    let progressPercentage = 0;
    if (microcredentialEnrollments.length > 0) {
      const courseProgressMap = new Map<string, number>();
      for (const enrolled of enrolledCourses) {
        courseProgressMap.set(enrolled.course.id, enrolled.progressPercent);
      }

      const totalMicrocredentialProgress = microcredentialEnrollments.reduce((sum: number, m: any) => {
        const mc = m.microcredentials;
        if (!mc) return sum;
        const l1 = courseProgressMap.get(mc.course_level_1_id) || 0;
        const l2 = courseProgressMap.get(mc.course_level_2_id) || 0;
        return sum + (l1 + l2) / 2;
      }, 0);
      progressPercentage = Math.round(totalMicrocredentialProgress / microcredentialEnrollments.length);
    } else if (enrolledCourses.length > 0) {
      const total = enrolledCourses.reduce((s, e) => s + e.progressPercent, 0);
      progressPercentage = Math.round(total / enrolledCourses.length);
    }

    // Build recommended courses (teacher data fetched in batch)
    const teacherIds = new Set<string>();
    for (const course of recommendedCoursesFiltered) {
      const c = course as any;
      if (c.teacher_ids?.[0]) teacherIds.add(c.teacher_ids[0]);
    }

    const teachersMap = new Map<string, { name: string; lastName?: string; avatarUrl?: string }>();
    if (teacherIds.size > 0) {
      const { data: teachersData } = await supabase
        .from(TABLES.USERS)
        .select('id, name, last_name, avatar_url')
        .in('id', Array.from(teacherIds));

      for (const t of teachersData || []) {
        teachersMap.set(t.id, { name: t.name, lastName: t.last_name, avatarUrl: t.avatar_url });
      }
    }

    const recommendedCourses: RecommendedCourse[] = recommendedCoursesFiltered.map(course => {
      const c = course as any;
      const teacherId = c.teacher_ids?.[0];
      const teacher = teacherId ? teachersMap.get(teacherId) : null;
      const teacherFullName = teacher
        ? `${teacher.name}${teacher.lastName ? ' ' + teacher.lastName : ''}`.trim()
        : undefined;

      return {
        courseId: course.id,
        level: mapDifficultyToLevel(course.difficulty),
        title: course.title,
        description: cleanDescription(course.description),
        students: studentCountsMap.get(course.id) || 0,
        lessons: lessonsCountMap.get(course.id) || 0,
        rating: course.average_rating || 0,
        reviewsCount: course.reviews_count || 0,
        thumbnail: course.thumbnail_url || course.cover_image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
        teacherName: teacherFullName,
        teacherAvatarUrl: teacher?.avatarUrl,
      };
    });

    const response: DashboardResponse = {
      enrolledCourses,
      recommendedCourses,
      scheduleItems,
      stats: {
        progressPercentage,
        completedCourses,
        coursesInProgress: enrolledCourses.length - completedCourses,
        totalStudyMinutes,
        completedMicrocredentials,
        microcredentialsInProgress,
      },
      favorites: Array.from(favoriteIds),
    };

    const duration = Math.round(performance.now() - startTime);
    console.log(`[dashboard API] Completed in ${duration}ms`);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[dashboard API] Error:', error);
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
