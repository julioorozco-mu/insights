import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
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
  lessonDate: string; // ISO date for calendar
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

export async function GET(req: NextRequest) {
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

    // 1. Get student record
    const { data: student, error: studentError } = await supabase
      .from(TABLES.STUDENTS)
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (studentError) {
      console.error('[dashboard API] Error getting student:', studentError);
      return NextResponse.json({ error: 'Error obteniendo estudiante' }, { status: 500 });
    }

    if (!student) {
      // New student with no enrollments
      return NextResponse.json({
        enrolledCourses: [],
        recommendedCourses: [],
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

    // 2. Parallel fetch: enrollments, favorites, all published courses, microcredential enrollments
    const [enrollmentsResult, favoritesResult, allCoursesResult, microcredentialEnrollmentsResult] = await Promise.all([
      // Get enrollments with course data in a single query using JOIN
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
            reviews_count
          )
        `)
        .eq('student_id', student.id),

      // Get favorites
      supabase
        .from('course_favorites')
        .select('course_id')
        .eq('user_id', authUser.id),

      // Get all active courses for recommendations (matching available-courses page behavior)
      supabase
        .from(TABLES.COURSES)
        .select('id, title, description, thumbnail_url, cover_image_url, difficulty, average_rating, reviews_count, created_at, teacher_ids')
        .eq('is_active', true),

      // Get microcredential enrollments for this student with microcredential course IDs
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
        .eq('student_id', student.id),
    ]);

    if (enrollmentsResult.error) {
      console.error('[dashboard API] Error getting enrollments:', enrollmentsResult.error);
      return NextResponse.json({ error: 'Error obteniendo inscripciones' }, { status: 500 });
    }

    const enrollmentsData = enrollmentsResult.data || [];
    const favoritesData = favoritesResult.data || [];
    const allCourses = allCoursesResult.data || [];
    const microcredentialEnrollments = microcredentialEnrollmentsResult.data || [];

    const favoriteIds = new Set(favoritesData.map((f: { course_id: string }) => f.course_id));
    const enrolledCourseIds = new Set(enrollmentsData.map((e: { course_id: string }) => e.course_id));

    // 3. Get lessons for all enrolled courses in parallel
    const enrolledCourseIdsArray = Array.from(enrolledCourseIds) as string[];

    // Single query to get all lessons for enrolled courses
    const { data: allLessons, error: lessonsError } = await supabase
      .from(TABLES.LESSONS)
      .select('id, course_id, title, content, duration_minutes, start_date, scheduled_start_time, type, is_active')
      .in('course_id', enrolledCourseIdsArray.length > 0 ? enrolledCourseIdsArray : ['none'])
      .eq('is_active', true);

    if (lessonsError) {
      console.error('[dashboard API] Error getting lessons:', lessonsError);
    }

    const lessonsByCourse = new Map<string, typeof allLessons>();
    for (const lesson of allLessons || []) {
      if (!lessonsByCourse.has(lesson.course_id)) {
        lessonsByCourse.set(lesson.course_id, []);
      }
      lessonsByCourse.get(lesson.course_id)!.push(lesson);
    }

    // 4. Process enrolled courses
    const enrolledCourses: EnrolledCourseData[] = [];
    let totalStudyMinutes = 0;
    const upcomingLessons: { lesson: any; courseName: string }[] = [];

    for (const enrollment of enrollmentsData) {
      const course = enrollment.courses as any;
      if (!course) continue;

      const courseLessons = lessonsByCourse.get(course.id) || [];
      const completedLessonsSet = new Set(enrollment.completed_lessons || []);

      // Calculate study time based on completed lessons
      let courseStudyTime = 0;
      for (const lesson of courseLessons) {
        if (completedLessonsSet.has(lesson.id)) {
          if (lesson.duration_minutes && lesson.duration_minutes > 0) {
            courseStudyTime += lesson.duration_minutes;
          } else {
            // Try to get subsections count from content
            let subsectionsDuration = 0;
            try {
              if (lesson.content) {
                const contentData = JSON.parse(lesson.content);
                if (contentData.subsections && Array.isArray(contentData.subsections)) {
                  for (const sub of contentData.subsections) {
                    subsectionsDuration += sub.durationMinutes || 5;
                  }
                }
              }
            } catch {
              // Fallback
            }
            courseStudyTime += subsectionsDuration > 0 ? subsectionsDuration : 15;
          }
        }

        // Collect upcoming lessons for schedule
        if (lesson.start_date || lesson.scheduled_start_time) {
          const lessonDate = new Date(lesson.start_date || lesson.scheduled_start_time);
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

    // 5. Process schedule items
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

    // 6. Calculate stats
    const completedCourses = enrolledCourses.filter(e => e.progressPercent >= 100).length;

    // Calculate microcredential stats
    const completedMicrocredentials = microcredentialEnrollments.filter(
      (m: any) => m.badge_unlocked === true
    ).length;
    const microcredentialsInProgress = microcredentialEnrollments.filter(
      (m: any) => m.status === 'in_progress' && !m.badge_unlocked
    ).length;

    // Calculate progress percentage based on microcredentials
    // Use actual course progress for each level of the microcredential
    let progressPercentage = 0;
    if (microcredentialEnrollments.length > 0) {
      // Create a map of course progress from enrolled courses
      const courseProgressMap = new Map<string, number>();
      for (const enrolled of enrolledCourses) {
        courseProgressMap.set(enrolled.course.id, enrolled.progressPercent);
      }

      // Calculate progress for each microcredential based on its courses' progress
      const totalMicrocredentialProgress = microcredentialEnrollments.reduce((sum: number, m: any) => {
        const microcredential = m.microcredentials;
        if (!microcredential) return sum;

        const level1CourseId = microcredential.course_level_1_id;
        const level2CourseId = microcredential.course_level_2_id;

        // Get progress for each level's course
        const level1Progress = courseProgressMap.get(level1CourseId) || 0;
        const level2Progress = courseProgressMap.get(level2CourseId) || 0;

        // Average of both levels (each level is 50% of the total)
        const microcredentialProgress = (level1Progress + level2Progress) / 2;
        return sum + microcredentialProgress;
      }, 0);
      progressPercentage = Math.round(totalMicrocredentialProgress / microcredentialEnrollments.length);
    } else if (enrolledCourses.length > 0) {
      // Fallback to course progress if no microcredentials
      const totalProgress = enrolledCourses.reduce((sum, e) => sum + e.progressPercent, 0);
      progressPercentage = Math.round(totalProgress / enrolledCourses.length);
    }

    // 7. Build recommended courses (exclude enrolled)
    const availableCourses = allCourses.filter(c => !enrolledCourseIds.has(c.id));

    // Sort: first courses with ratings > 0 (by rating DESC), then courses without ratings (by created_at DESC)
    const coursesWithRating = availableCourses
      .filter(c => c.average_rating && c.average_rating > 0)
      .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));

    const coursesWithoutRating = availableCourses
      .filter(c => !c.average_rating || c.average_rating === 0)
      .sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime(); // Newest first
      });

    // Combine: rated courses first, then newest unrated courses
    const sortedAvailableCourses = [...coursesWithRating, ...coursesWithoutRating];

    // Get student counts for recommended courses in parallel
    const recommendedCoursesIds = sortedAvailableCourses.slice(0, 4).map(c => c.id);

    const { data: studentCounts } = await supabase
      .from(TABLES.STUDENT_ENROLLMENTS)
      .select('course_id')
      .in('course_id', recommendedCoursesIds.length > 0 ? recommendedCoursesIds : ['none']);

    const countsMap = new Map<string, number>();
    for (const row of studentCounts || []) {
      countsMap.set(row.course_id, (countsMap.get(row.course_id) || 0) + 1);
    }

    // Get lessons count for recommended courses
    const { data: recommendedLessons } = await supabase
      .from(TABLES.LESSONS)
      .select('course_id')
      .in('course_id', recommendedCoursesIds.length > 0 ? recommendedCoursesIds : ['none'])
      .eq('is_active', true);

    const lessonsCountMap = new Map<string, number>();
    for (const row of recommendedLessons || []) {
      lessonsCountMap.set(row.course_id, (lessonsCountMap.get(row.course_id) || 0) + 1);
    }

    // Get teacher data for recommended courses
    const recommendedCoursesData = sortedAvailableCourses.slice(0, 4);
    const teacherIds = new Set<string>();
    for (const course of recommendedCoursesData) {
      const courseWithTeachers = course as any;
      if (courseWithTeachers.teacher_ids && Array.isArray(courseWithTeachers.teacher_ids) && courseWithTeachers.teacher_ids.length > 0) {
        teacherIds.add(courseWithTeachers.teacher_ids[0]);
      }
    }

    const teacherIdsArray = Array.from(teacherIds);
    const teachersMap = new Map<string, { name: string; lastName?: string; avatarUrl?: string }>();

    if (teacherIdsArray.length > 0) {
      const { data: teachersData } = await supabase
        .from(TABLES.USERS)
        .select('id, name, last_name, avatar_url')
        .in('id', teacherIdsArray);

      for (const teacher of teachersData || []) {
        teachersMap.set(teacher.id, {
          name: teacher.name,
          lastName: teacher.last_name,
          avatarUrl: teacher.avatar_url,
        });
      }
    }

    const recommendedCourses: RecommendedCourse[] = recommendedCoursesData.map(course => {
      const courseWithTeachers = course as any;
      const teacherId = courseWithTeachers.teacher_ids?.[0];
      const teacher = teacherId ? teachersMap.get(teacherId) : null;
      const teacherFullName = teacher ? `${teacher.name}${teacher.lastName ? ' ' + teacher.lastName : ''}`.trim() : undefined;

      return {
        courseId: course.id,
        level: mapDifficultyToLevel(course.difficulty),
        title: course.title,
        description: cleanDescription(course.description),
        students: countsMap.get(course.id) || 0,
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

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[dashboard API] Error:', error);
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
