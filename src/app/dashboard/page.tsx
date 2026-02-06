import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { fetchRecommendedCourses } from "@/lib/dashboard/recommendations";
import { TABLES } from "@/utils/constants";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import type { User, UserRole } from "@/types/user";

// Types for the dashboard data
interface RecommendedMicrocredential {
  id: string;
  title: string;
  slug: string;
  badgeImageUrl: string;
  isFree: boolean;
  price: number;
  salePercentage: number;
}

// Quiz/exam detail for accordion in Mis Cursos
interface QuizExamDetailData {
  id: string;
  name: string;
  passed: boolean;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedDate: string | null;
  lessonId: string;
  subsectionIndex: number;
}

// Types for Mis Cursos section (microcredential-grouped view)
interface MisCursosCourseProgressData {
  courseId: string;
  title: string;
  thumbnailUrl: string | null;
  coverImageUrl: string | null;
  level: 1 | 2;
  isLocked: boolean;
  totalSections: number;
  completedSections: number;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  totalQuizzes: number;
  completedQuizzes: number;
  quizDetails: QuizExamDetailData[];
  lastAccessedLessonId: string | null;
  lastAccessedSubsectionIndex: number;
}

interface MisCursosMicrocredentialData {
  id: string;
  title: string;
  courses: [MisCursosCourseProgressData, MisCursosCourseProgressData];
}

interface MisCursosStandaloneCourseData {
  courseId: string;
  title: string;
  thumbnailUrl: string | null;
  coverImageUrl: string | null;
  totalSections: number;
  completedSections: number;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  totalQuizzes: number;
  completedQuizzes: number;
  quizDetails: QuizExamDetailData[];
  lastAccessedLessonId: string | null;
  lastAccessedSubsectionIndex: number;
}

interface MisCursosData {
  microcredentials: MisCursosMicrocredentialData[];
  standaloneCourses: MisCursosStandaloneCourseData[];
}

interface DashboardApiResponse {
  enrolledCourses: {
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
  }[];
  recommendedCourses: {
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
  }[];
  recommendedMicrocredentials: RecommendedMicrocredential[];
  enrolledMicrocredentialIds: string[];
  scheduleItems: {
    type: string;
    title: string;
    date: string;
    time: string;
    courseId: string;
    lessonId: string;
    lessonDate: string;
  }[];
  stats: {
    progressPercentage: number;
    completedCourses: number;
    coursesInProgress: number;
    totalStudyMinutes: number;
    completedMicrocredentials: number;
    microcredentialsInProgress: number;
  };
  favorites: string[];
  misCursosData: MisCursosData;
}

// Helper to clean HTML from description
function cleanDescription(html: string | null, maxLength: number = 100): string {
  if (!html) return "Sin descripción disponible";

  let text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length > maxLength) {
    text = text.substring(0, maxLength).trim() + "...";
  }

  return text || "Sin descripción disponible";
}

// Helper to map difficulty to Spanish level
function mapDifficultyToLevel(difficulty: string | null): string {
  switch (difficulty) {
    case "beginner":
      return "Introductorio";
    case "intermediate":
      return "Intermedio";
    case "advanced":
      return "Avanzado";
    default:
      return "Introductorio";
  }
}

// Estimate study time without JSON.parse
function estimateStudyTimeForLesson(lesson: {
  duration_minutes: number | null;
}): number {
  if (lesson.duration_minutes && lesson.duration_minutes > 0) {
    return lesson.duration_minutes;
  }
  return 15;
}

/**
 * Fetch dashboard data server-side for students
 */
async function fetchStudentDashboardData(
  userId: string
): Promise<DashboardApiResponse> {
  const supabase = getSupabaseAdmin();
  const now = new Date();

  // 1. First, get the student record to get the actual student_id
  const { data: student } = await supabase
    .from(TABLES.STUDENTS)
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  // Early exit for new students with no student record
  if (!student) {
    // Still get recommended courses for new users
    const recommendedCoursesFiltered = await fetchRecommendedCourses(supabase, {
      desiredCount: 4,
    });
    const recommendedCourseIds = recommendedCoursesFiltered.map((c) => c.id);

    const [studentCountsResult, lessonsCountResult] = await Promise.all([
      recommendedCourseIds.length > 0
        ? supabase
          .from(TABLES.STUDENT_ENROLLMENTS)
          .select("course_id")
          .in("course_id", recommendedCourseIds)
        : Promise.resolve({ data: [] }),
      recommendedCourseIds.length > 0
        ? supabase
          .from(TABLES.LESSONS)
          .select("course_id")
          .in("course_id", recommendedCourseIds)
          .eq("is_active", true)
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
        .select("id, name, last_name, avatar_url")
        .in("id", Array.from(teacherIds));

      for (const t of teachersData || []) {
        teachersMap.set(t.id, { name: t.name, lastName: t.last_name, avatarUrl: t.avatar_url });
      }
    }

    const recommendedCourses = recommendedCoursesFiltered.map((course) => {
      const c = course as any;
      const teacherId = c.teacher_ids?.[0];
      const teacher = teacherId ? teachersMap.get(teacherId) : null;
      const teacherFullName = teacher
        ? `${teacher.name}${teacher.lastName ? " " + teacher.lastName : ""}`.trim()
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
        thumbnail:
          course.thumbnail_url ||
          course.cover_image_url ||
          "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
        teacherName: teacherFullName,
        teacherAvatarUrl: teacher?.avatarUrl,
      };
    });

    return {
      enrolledCourses: [],
      recommendedCourses,
      recommendedMicrocredentials: [],
      enrolledMicrocredentialIds: [],
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
      misCursosData: { microcredentials: [], standaloneCourses: [] },
    };
  }

  // Use the actual student.id for enrollment queries
  const studentId = student.id;

  // 2. Now fetch all data in parallel using the correct student.id
  const [
    enrollmentsWithCoursesResult,
    favoritesResult,
    microcredentialEnrollmentsResult,
  ] = await Promise.all([
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
      .eq("student_id", studentId),

    supabase
      .from("course_favorites")
      .select("course_id")
      .eq("user_id", userId),

    supabase
      .from("microcredential_enrollments")
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
      .eq("student_id", studentId),
  ]);

  const enrollmentsData = enrollmentsWithCoursesResult.data || [];
  const favoritesData = favoritesResult.data || [];
  const microcredentialEnrollments = microcredentialEnrollmentsResult.data || [];

  const favoriteIds = new Set(
    favoritesData.map((f: { course_id: string }) => f.course_id)
  );
  const enrolledCourseIds = new Set(
    enrollmentsData.map((e: { course_id: string }) => e.course_id)
  );
  const enrolledCourseIdsArray = Array.from(enrolledCourseIds) as string[];

  // Second batch: lessons and recommendations data
  const recommendedCoursesFiltered = await fetchRecommendedCourses(supabase, {
    desiredCount: 4,
    excludeCourseIds: enrolledCourseIds,
  });
  const recommendedCourseIds = recommendedCoursesFiltered.map((c) => c.id);

  // Get enrolled microcredential IDs set
  const enrolledMicrocredentialIdsSet = new Set(
    microcredentialEnrollments.map((m: any) => m.microcredential_id)
  );

  const [
    enrolledLessonsResult,
    recommendedStudentCountsResult,
    recommendedLessonsCountResult,
    recommendedMicrocredentialsResult,
  ] = await Promise.all([
    supabase
      .from(TABLES.LESSONS)
      .select(
        "id, course_id, title, duration_minutes, start_date, scheduled_start_time, type, is_active, section_id, content"
      )
      .in(
        "course_id",
        enrolledCourseIdsArray.length > 0 ? enrolledCourseIdsArray : ["none"]
      )
      .eq("is_active", true),

    recommendedCourseIds.length > 0
      ? supabase
        .from(TABLES.STUDENT_ENROLLMENTS)
        .select("course_id")
        .in("course_id", recommendedCourseIds)
      : Promise.resolve({ data: [] }),

    recommendedCourseIds.length > 0
      ? supabase
        .from(TABLES.LESSONS)
        .select("course_id")
        .in("course_id", recommendedCourseIds)
        .eq("is_active", true)
      : Promise.resolve({ data: [] }),

    // Fetch recommended microcredentials (published, limit 6)
    supabase
      .from("microcredentials")
      .select("id, title, slug, badge_image_url, is_free, price, sale_percentage")
      .eq("is_published", true)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(6),
  ]);

  // Extract quizIds from lesson content JSON (quizzes are linked via block.data.quizId, NOT via surveys.course_id)
  // Also save lessonId + subsectionIndex for each quiz (needed for accordion detail + retry links)
  interface QuizMapping {
    quizId: string;
    courseId: string;
    lessonId: string;
    subsectionIndex: number;
  }
  const quizMappings: QuizMapping[] = [];
  const quizIdsByCourse = new Map<string, string[]>();
  const allQuizIds = new Set<string>();
  for (const lesson of enrolledLessonsResult.data || []) {
    const content = (lesson as any).content;
    if (!content) continue;
    try {
      const parsed = JSON.parse(content);
      const subsections = parsed.subsections || [];
      for (let subIdx = 0; subIdx < subsections.length; subIdx++) {
        const sub = subsections[subIdx];
        if (!sub?.blocks) continue;
        for (const block of sub.blocks) {
          if (block.type === "quiz" && block.data?.quizId) {
            const qid = block.data.quizId;
            allQuizIds.add(qid);
            if (!quizIdsByCourse.has(lesson.course_id)) {
              quizIdsByCourse.set(lesson.course_id, []);
            }
            quizIdsByCourse.get(lesson.course_id)!.push(qid);
            quizMappings.push({
              quizId: qid,
              courseId: lesson.course_id,
              lessonId: lesson.id,
              subsectionIndex: subIdx,
            });
          }
        }
      }
    } catch { /* ignore parse errors */ }
  }

  const allQuizIdsArray = Array.from(allQuizIds);

  // Fetch additional data for Mis Cursos section (sections + quiz data)
  const [courseSectionsResult, surveysResult, surveyResponsesResult] =
    await Promise.all([
      // Course sections for enrolled courses
      enrolledCourseIdsArray.length > 0
        ? supabase
            .from(TABLES.COURSE_SECTIONS)
            .select("id, course_id")
            .in("course_id", enrolledCourseIdsArray)
        : Promise.resolve({ data: [] as { id: string; course_id: string }[] }),

      // Surveys (quizzes) by their IDs — include title for accordion display
      allQuizIdsArray.length > 0
        ? supabase
            .from(TABLES.SURVEYS)
            .select("id, title, questions")
            .in("id", allQuizIdsArray)
        : Promise.resolve(
            { data: [] as { id: string; title: string; questions: any }[] }
          ),

      // Student's survey responses — include score fields + submitted_at for detail cards
      allQuizIdsArray.length > 0
        ? supabase
            .from(TABLES.SURVEY_RESPONSES)
            .select("id, survey_id, answers, percentage, score, total_questions, submitted_at")
            .eq("user_id", userId)
            .in("survey_id", allQuizIdsArray)
        : Promise.resolve(
            { data: [] as { id: string; survey_id: string; answers: any; percentage: number | null; score: number | null; total_questions: number | null; submitted_at: string | null }[] }
          ),
    ]);

  // Build section count maps
  const sectionsByCourse = new Map<string, string[]>();
  for (const section of courseSectionsResult.data || []) {
    if (!sectionsByCourse.has(section.course_id)) {
      sectionsByCourse.set(section.course_id, []);
    }
    sectionsByCourse.get(section.course_id)!.push(section.id);
  }

  // Build quiz count per course from lesson content (quizIdsByCourse already computed above)
  // surveysByCourse maps courseId → array of quiz info for counting totalQuizzes
  const surveysByCourse = new Map<string, string[]>();
  for (const [cid, qids] of quizIdsByCourse) {
    surveysByCourse.set(cid, qids);
  }

  // Build a map of survey questions for re-grading old responses
  const surveyQuestionsMap = new Map<string, any[]>();
  for (const survey of surveysResult.data || []) {
    const questions = Array.isArray(survey.questions) ? survey.questions : [];
    surveyQuestionsMap.set(survey.id, questions);
  }

  // Grade a response against survey questions (for old data without percentage)
  function gradeResponse(
    surveyId: string,
    studentAnswers: any[]
  ): number {
    const questions = surveyQuestionsMap.get(surveyId);
    if (!questions || questions.length === 0) return 0;
    if (!Array.isArray(studentAnswers)) return 0;

    const answersMap = new Map(
      studentAnswers.map((a: any) => [a.questionId, a.answer])
    );
    let correctCount = 0;

    for (const q of questions) {
      const userAnswer = answersMap.get(q.id);
      if (userAnswer === undefined || userAnswer === "") continue;

      if (q.options && q.options.some((o: any) => o.isCorrect)) {
        const correctOpts = q.options
          .filter((o: any) => o.isCorrect)
          .map((o: any) => o.value);
        if (q.type === "multiple_choice") {
          const userArr = Array.isArray(userAnswer) ? userAnswer : [];
          if (
            correctOpts.length === userArr.length &&
            correctOpts.every((c: string) => userArr.includes(c))
          ) {
            correctCount++;
          }
        } else {
          if (correctOpts.includes(userAnswer as string)) correctCount++;
        }
      } else if (q.correctAnswer) {
        if (Array.isArray(q.correctAnswer)) {
          if (
            Array.isArray(userAnswer) &&
            userAnswer.length === q.correctAnswer.length &&
            userAnswer.every((a: string) => q.correctAnswer.includes(a))
          ) {
            correctCount++;
          }
        } else if (userAnswer === q.correctAnswer) {
          correctCount++;
        }
      }
    }

    return questions.length > 0
      ? Math.round((correctCount / questions.length) * 10000) / 100
      : 0;
  }

  // Build reverse map: quizId → courseId (from lesson content)
  const quizIdToCourseId = new Map<string, string>();
  for (const [cid, qids] of quizIdsByCourse) {
    for (const qid of qids) {
      quizIdToCourseId.set(qid, cid);
    }
  }

  // Count passed quizzes per course (>= 60%)
  const passedQuizzesByCourse = new Map<string, number>();
  for (const resp of surveyResponsesResult.data || []) {
    const courseId = quizIdToCourseId.get(resp.survey_id);
    if (!courseId) continue;

    // Use saved percentage if available, otherwise re-grade from answers
    let pct = resp.percentage;
    if (pct === null || pct === undefined) {
      pct = gradeResponse(resp.survey_id, resp.answers);
    }

    if (pct >= 60) {
      passedQuizzesByCourse.set(
        courseId,
        (passedQuizzesByCourse.get(courseId) || 0) + 1
      );
    }
  }

  // Build survey title map
  const surveyTitleMap = new Map<string, string>();
  for (const survey of surveysResult.data || []) {
    surveyTitleMap.set(survey.id, (survey as any).title || "Quiz");
  }

  // Build response map (survey_id → response)
  const responseMap = new Map<string, any>();
  for (const resp of surveyResponsesResult.data || []) {
    responseMap.set(resp.survey_id, resp);
  }

  // Build quiz detail arrays per course (for accordion)
  const quizDetailsByCourse = new Map<string, QuizExamDetailData[]>();
  for (const mapping of quizMappings) {
    const resp = responseMap.get(mapping.quizId);
    const title = surveyTitleMap.get(mapping.quizId) || "Quiz";
    const questions = surveyQuestionsMap.get(mapping.quizId) || [];
    const totalQ = questions.length;

    let score = 0;
    let pct = 0;
    let completedDate: string | null = null;
    let passed = false;

    if (resp) {
      if (resp.percentage !== null && resp.percentage !== undefined) {
        pct = Number(resp.percentage);
        score = (resp as any).score ?? Math.round((pct * totalQ) / 100);
      } else {
        pct = gradeResponse(mapping.quizId, resp.answers);
        score = Math.round((pct * totalQ) / 100);
      }
      completedDate = (resp as any).submitted_at || null;
      passed = pct >= 60;
    }

    const detail: QuizExamDetailData = {
      id: mapping.quizId,
      name: title,
      passed,
      score,
      totalQuestions: totalQ,
      percentage: pct,
      completedDate,
      lessonId: mapping.lessonId,
      subsectionIndex: mapping.subsectionIndex,
    };

    if (!quizDetailsByCourse.has(mapping.courseId)) {
      quizDetailsByCourse.set(mapping.courseId, []);
    }
    quizDetailsByCourse.get(mapping.courseId)!.push(detail);
  }

  // Build maps
  const lessonsByCourse = new Map<
    string,
    typeof enrolledLessonsResult.data
  >();
  for (const lesson of enrolledLessonsResult.data || []) {
    if (!lessonsByCourse.has(lesson.course_id)) {
      lessonsByCourse.set(lesson.course_id, []);
    }
    lessonsByCourse.get(lesson.course_id)!.push(lesson);
  }

  const studentCountsMap = new Map<string, number>();
  for (const row of recommendedStudentCountsResult.data || []) {
    studentCountsMap.set(
      row.course_id,
      (studentCountsMap.get(row.course_id) || 0) + 1
    );
  }

  const lessonsCountMap = new Map<string, number>();
  for (const row of recommendedLessonsCountResult.data || []) {
    lessonsCountMap.set(
      row.course_id,
      (lessonsCountMap.get(row.course_id) || 0) + 1
    );
  }

  // Process enrolled courses
  const enrolledCourses: DashboardApiResponse["enrolledCourses"] = [];
  let totalStudyMinutes = 0;
  const upcomingLessons: { lesson: any; courseName: string }[] = [];

  for (const enrollment of enrollmentsData) {
    const course = enrollment.courses as any;
    if (!course) continue;

    const courseLessons = lessonsByCourse.get(course.id) || [];
    const completedLessonsSet = new Set(enrollment.completed_lessons || []);

    let courseStudyTime = 0;
    for (const lesson of courseLessons) {
      if (completedLessonsSet.has(lesson.id)) {
        courseStudyTime += estimateStudyTimeForLesson(lesson);
      }

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

  // Schedule items
  upcomingLessons.sort((a, b) => {
    const dateA = new Date(a.lesson.start_date || a.lesson.scheduled_start_time);
    const dateB = new Date(b.lesson.start_date || b.lesson.scheduled_start_time);
    return dateA.getTime() - dateB.getTime();
  });

  const scheduleItems = upcomingLessons.slice(0, 5).map(({ lesson, courseName }) => {
    const lessonDate = new Date(lesson.start_date || lesson.scheduled_start_time);
    const endTime = lesson.duration_minutes
      ? new Date(lessonDate.getTime() + lesson.duration_minutes * 60000)
      : new Date(lessonDate.getTime() + 60 * 60000);

    return {
      type: lesson.type === "livestream" ? "En Vivo" : "Lección",
      title: `${courseName}: ${lesson.title}`,
      date: lessonDate.toLocaleDateString("es-ES", { month: "long", day: "numeric" }),
      time: `${lessonDate.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })} - ${endTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`,
      courseId: lesson.course_id,
      lessonId: lesson.id,
      lessonDate: lessonDate.toISOString(),
    };
  });

  // Stats
  const completedCourses = enrolledCourses.filter(
    (e) => e.progressPercent >= 100
  ).length;
  const completedMicrocredentials = microcredentialEnrollments.filter(
    (m: any) => m.badge_unlocked === true
  ).length;
  const microcredentialsInProgress = microcredentialEnrollments.filter(
    (m: any) => m.status === "in_progress" && !m.badge_unlocked
  ).length;

  let progressPercentage = 0;
  if (microcredentialEnrollments.length > 0) {
    const courseProgressMap = new Map<string, number>();
    for (const enrolled of enrolledCourses) {
      courseProgressMap.set(enrolled.course.id, enrolled.progressPercent);
    }

    const totalMicrocredentialProgress = microcredentialEnrollments.reduce(
      (sum: number, m: any) => {
        const mc = m.microcredentials;
        if (!mc) return sum;
        const l1 = courseProgressMap.get(mc.course_level_1_id) || 0;
        const l2 = courseProgressMap.get(mc.course_level_2_id) || 0;
        return sum + (l1 + l2) / 2;
      },
      0
    );
    progressPercentage = Math.round(
      totalMicrocredentialProgress / microcredentialEnrollments.length
    );
  } else if (enrolledCourses.length > 0) {
    const total = enrolledCourses.reduce((s, e) => s + e.progressPercent, 0);
    progressPercentage = Math.round(total / enrolledCourses.length);
  }

  // Teacher data for recommendations
  const teacherIds = new Set<string>();
  for (const course of recommendedCoursesFiltered) {
    const c = course as any;
    if (c.teacher_ids?.[0]) teacherIds.add(c.teacher_ids[0]);
  }

  const teachersMap = new Map<
    string,
    { name: string; lastName?: string; avatarUrl?: string }
  >();
  if (teacherIds.size > 0) {
    const { data: teachersData } = await supabase
      .from(TABLES.USERS)
      .select("id, name, last_name, avatar_url")
      .in("id", Array.from(teacherIds));

    for (const t of teachersData || []) {
      teachersMap.set(t.id, {
        name: t.name,
        lastName: t.last_name,
        avatarUrl: t.avatar_url,
      });
    }
  }

  const recommendedCourses = recommendedCoursesFiltered.map((course) => {
    const c = course as any;
    const teacherId = c.teacher_ids?.[0];
    const teacher = teacherId ? teachersMap.get(teacherId) : null;
    const teacherFullName = teacher
      ? `${teacher.name}${teacher.lastName ? " " + teacher.lastName : ""}`.trim()
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
      thumbnail:
        course.thumbnail_url ||
        course.cover_image_url ||
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
      teacherName: teacherFullName,
      teacherAvatarUrl: teacher?.avatarUrl,
    };
  });

  // Process recommended microcredentials
  const recommendedMicrocredentials: RecommendedMicrocredential[] = (
    recommendedMicrocredentialsResult.data || []
  ).map((mc: any) => ({
    id: mc.id,
    title: mc.title,
    slug: mc.slug,
    badgeImageUrl: mc.badge_image_url,
    isFree: mc.is_free,
    price: Number(mc.price) || 0,
    salePercentage: mc.sale_percentage || 0,
  }));

  // ── Build Mis Cursos Data (microcredential-grouped view) ─────────
  // Helper: count subsections from lesson JSON content
  function getSubsectionCount(lessonContent: string | null): number {
    if (!lessonContent) return 1;
    try {
      const parsed = JSON.parse(lessonContent as string);
      return parsed.subsections?.length || 1;
    } catch {
      return 1;
    }
  }

  // Helper: compute subsection-based progress for a course
  // "Sesiones" = lessons (each lesson row = 1 sesión)
  // "Sesiones completadas" = lessons where ALL subsections are completed
  // "Lecciones" = total subsections across all lessons
  // "Lecciones completadas" = total completed subsections
  function computeSubsectionProgress(
    courseId: string,
    completedLessonIds: Set<string>,
    subsectionProgress: Record<string, number>,
    allLessons: typeof enrolledLessonsResult.data
  ) {
    const lessonsForCourse = (allLessons || []).filter(
      (l) => l.course_id === courseId
    );

    let totalSessions = lessonsForCourse.length;
    let completedSessions = 0;
    let totalSubsections = 0;
    let completedSubsectionsCount = 0;

    for (const lesson of lessonsForCourse) {
      const subsCount = getSubsectionCount((lesson as any).content);
      totalSubsections += subsCount;

      if (completedLessonIds.has(lesson.id)) {
        // Lesson fully completed → all subsections done
        completedSubsectionsCount += subsCount;
        completedSessions++;
      } else {
        // Check partial progress via subsectionProgress
        const highestIndex = subsectionProgress[lesson.id] ?? -1;
        if (highestIndex >= 0) {
          const completed = Math.min(highestIndex + 1, subsCount);
          completedSubsectionsCount += completed;
          if (completed >= subsCount) {
            completedSessions++;
          }
        }
      }
    }

    return {
      totalSessions,
      completedSessions,
      totalSubsections,
      completedSubsections: completedSubsectionsCount,
    };
  }

  // Helper: compute lastAccessedSubsectionIndex (advance to next)
  function computeResumeSubsectionIndex(
    lastLessonId: string | null,
    subsProgress: Record<string, number>,
    allLessons: typeof enrolledLessonsResult.data
  ): number {
    if (!lastLessonId || subsProgress[lastLessonId] === undefined) return 0;
    let idx = subsProgress[lastLessonId];
    const lesson = (allLessons || []).find((l) => l.id === lastLessonId);
    if (lesson) {
      const totalSubs = getSubsectionCount((lesson as any).content);
      if (idx < totalSubs - 1) idx += 1;
    }
    return Math.max(0, idx);
  }

  // Helper: build course progress data for Mis Cursos
  function buildCourseProgress(
    courseId: string,
    level: 1 | 2,
    isLocked: boolean
  ): MisCursosCourseProgressData | null {
    const enrollmentItem = enrolledCourses.find(
      (e) => e.course.id === courseId
    );
    if (!enrollmentItem) return null;

    const completedLessonIds = new Set(
      enrollmentItem.enrollment.completedLessons
    );
    const subsProgress = enrollmentItem.enrollment.subsectionProgress || {};
    const { totalSessions, completedSessions, totalSubsections, completedSubsections } =
      computeSubsectionProgress(
        courseId,
        completedLessonIds,
        subsProgress,
        enrolledLessonsResult.data
      );
    const courseQuizDetails = quizDetailsByCourse.get(courseId) || [];
    const totalQuizzes = courseQuizDetails.length;
    const completedQuizzes = courseQuizDetails.filter((q) => q.passed).length;

    const lastLessonId = enrollmentItem.enrollment.lastAccessedLessonId || null;

    return {
      courseId,
      title: enrollmentItem.course.title,
      thumbnailUrl: enrollmentItem.course.thumbnailUrl,
      coverImageUrl: enrollmentItem.course.coverImageUrl,
      level,
      isLocked,
      totalSections: totalSessions,
      completedSections: completedSessions,
      totalLessons: totalSubsections,
      completedLessons: completedSubsections,
      progressPercent: enrollmentItem.progressPercent,
      totalQuizzes,
      completedQuizzes,
      quizDetails: courseQuizDetails,
      lastAccessedLessonId: lastLessonId,
      lastAccessedSubsectionIndex: computeResumeSubsectionIndex(
        lastLessonId,
        subsProgress,
        enrolledLessonsResult.data
      ),
    };
  }

  // Track which course IDs belong to a microcredential
  const courseIdsInMicrocredentials = new Set<string>();

  const misCursosMicrocredentials: MisCursosMicrocredentialData[] = [];
  for (const mcEnrollment of microcredentialEnrollments) {
    const mc = (mcEnrollment as any).microcredentials;
    if (!mc) continue;

    const l1CourseId = mc.course_level_1_id;
    const l2CourseId = mc.course_level_2_id;
    const isLevel2Locked = !(mcEnrollment as any).level_1_completed;

    const course1 = buildCourseProgress(l1CourseId, 1, false);
    const course2 = buildCourseProgress(l2CourseId, 2, isLevel2Locked);

    if (course1 && course2) {
      // Fetch microcredential title
      const mcData = recommendedMicrocredentialsResult.data?.find(
        (m: any) => m.id === (mcEnrollment as any).microcredential_id
      );
      const mcTitle =
        mcData?.title || `Microcredencial`;

      misCursosMicrocredentials.push({
        id: (mcEnrollment as any).microcredential_id,
        title: mcTitle,
        courses: [course1, course2],
      });

      courseIdsInMicrocredentials.add(l1CourseId);
      courseIdsInMicrocredentials.add(l2CourseId);
    }
  }

  // If we didn't get the title from recommended, fetch it separately
  if (
    misCursosMicrocredentials.some((mc) => mc.title === "Microcredencial")
  ) {
    const mcIdsToFetch = misCursosMicrocredentials
      .filter((mc) => mc.title === "Microcredencial")
      .map((mc) => mc.id);

    if (mcIdsToFetch.length > 0) {
      const { data: mcTitles } = await supabase
        .from("microcredentials")
        .select("id, title")
        .in("id", mcIdsToFetch);

      for (const mcTitle of mcTitles || []) {
        const target = misCursosMicrocredentials.find(
          (mc) => mc.id === mcTitle.id
        );
        if (target) target.title = mcTitle.title;
      }
    }
  }

  // Standalone courses (enrolled but not part of any microcredential)
  const misCursosStandalone: MisCursosStandaloneCourseData[] = [];
  for (const enrolled of enrolledCourses) {
    if (courseIdsInMicrocredentials.has(enrolled.course.id)) continue;

    const courseId = enrolled.course.id;
    const completedLessonIds = new Set(enrolled.enrollment.completedLessons);
    const subsProgress = enrolled.enrollment.subsectionProgress || {};
    const { totalSessions, completedSessions, totalSubsections, completedSubsections } =
      computeSubsectionProgress(
        courseId,
        completedLessonIds,
        subsProgress,
        enrolledLessonsResult.data
      );
    const courseQuizDetails = quizDetailsByCourse.get(courseId) || [];
    const totalQuizzes = courseQuizDetails.length;
    const completedQuizzes = courseQuizDetails.filter((q) => q.passed).length;

    const lastLessonId = enrolled.enrollment.lastAccessedLessonId || null;

    misCursosStandalone.push({
      courseId,
      title: enrolled.course.title,
      thumbnailUrl: enrolled.course.thumbnailUrl,
      coverImageUrl: enrolled.course.coverImageUrl,
      totalSections: totalSessions,
      completedSections: completedSessions,
      totalLessons: totalSubsections,
      completedLessons: completedSubsections,
      progressPercent: enrolled.progressPercent,
      totalQuizzes,
      completedQuizzes,
      quizDetails: courseQuizDetails,
      lastAccessedLessonId: lastLessonId,
      lastAccessedSubsectionIndex: computeResumeSubsectionIndex(
        lastLessonId,
        subsProgress,
        enrolledLessonsResult.data
      ),
    });
  }

  const misCursosData: MisCursosData = {
    microcredentials: misCursosMicrocredentials,
    standaloneCourses: misCursosStandalone,
  };

  return {
    enrolledCourses,
    recommendedCourses,
    recommendedMicrocredentials,
    enrolledMicrocredentialIds: Array.from(enrolledMicrocredentialIdsSet),
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
    misCursosData,
  };
}

/**
 * Build user object from auth data
 */
function buildUserFromAuth(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}): User {
  const metadata = authUser.user_metadata || {};
  const appMetadata = authUser.app_metadata || {};

  return {
    id: authUser.id,
    email: authUser.email || "",
    name:
      (metadata.name as string) || (metadata.full_name as string) || "Usuario",
    lastName: metadata.last_name as string | undefined,
    role:
      (appMetadata.role as UserRole) ||
      (metadata.role as UserRole) ||
      "student",
    avatarUrl: metadata.avatar_url as string | undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Dashboard Content Component (async server component)
 */
async function DashboardContent({ user }: { user: User }) {
  // Fetch data based on user role
  let dashboardData: DashboardApiResponse | undefined;

  if (user.role === "student") {
    dashboardData = await fetchStudentDashboardData(user.id);
  }
  // For teacher/admin roles, we can add specific fetching later
  // For now, they get an empty initial state

  return <DashboardClient user={user} initialData={dashboardData} />;
}

/**
 * Dashboard Page - Server Component
 * Pre-fetches all data server-side for instant loading
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/");
  }

  // Get user data from users table for accurate name/role
  const supabaseAdmin = getSupabaseAdmin();
  const { data: dbUser } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("id, email, name, last_name, role, avatar_url")
    .eq("id", authUser.id)
    .single();

  // Build user object with data from users table (fallback to auth metadata)
  const metadata = authUser.user_metadata || {};
  const appMetadata = authUser.app_metadata || {};

  const user: User = {
    id: authUser.id,
    email: authUser.email || "",
    name: dbUser?.name || (metadata.name as string) || (metadata.full_name as string) || "Usuario",
    lastName: dbUser?.last_name || (metadata.last_name as string) || undefined,
    role: dbUser?.role || (appMetadata.role as UserRole) || (metadata.role as UserRole) || "student",
    avatarUrl: dbUser?.avatar_url || (metadata.avatar_url as string) || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent user={user} />
    </Suspense>
  );
}
