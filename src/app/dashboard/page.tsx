"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Activity, Clock3, Users, BookOpenCheck, BookOpen, GraduationCap } from "lucide-react";
import { CourseCard } from "@/components/dashboard/course-card";
import { CourseListItem } from "@/components/dashboard/course-list-item";
import { ScheduleCard } from "@/components/dashboard/schedule-card";
import { ProductivityChartLazy } from "@/components/dashboard/productivity-chart-lazy";
import { useAuth } from "@/hooks/useAuth";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { lessonRepository, LessonData } from "@/lib/repositories/lessonRepository";
import { Course } from "@/types/course";

// Types from the aggregated API
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
  }[];
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
  };
  favorites: string[];
}

// Types for teacher data (kept separate for now)
interface EnrollmentData {
  id: string;
  courseId: string;
  studentId: string;
  enrolledAt: string;
  progress: number;
  completedLessons: string[];
}

interface EnrolledCourseData {
  course: Course;
  enrollment: EnrollmentData;
  lessonsCount: number;
  completedLessonsCount: number;
  progressPercent: number;
  studyTimeMinutes: number;
}

interface RecommendedCourse {
  level: "Introductorio" | "Intermedio" | "Avanzado";
  title: string;
  description: string;
  students: number;
  lessons: number;
  rating: number;
  reviewsCount: number;
  mentor: string;
  thumbnail: string;
  courseId: string;
}

interface ScheduleItem {
  type: string;
  title: string;
  date: string;
  time: string;
  courseId?: string;
  lessonId?: string;
}

interface StatItem {
  label: string;
  value: string;
  delta: string;
  icon: React.ElementType;
  accent: string;
  deltaColor: string;
}

// Helper function to map difficulty to Spanish level
function mapDifficultyToLevel(difficulty?: string | null): "Introductorio" | "Intermedio" | "Avanzado" {
  switch (difficulty) {
    case "beginner": return "Introductorio";
    case "intermediate": return "Intermedio";
    case "advanced": return "Avanzado";
    default: return "Introductorio";
  }
}

// Helper function to clean HTML and truncate description
function cleanDescription(html: string | undefined | null, maxLength: number = 100): string {
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

// Helper function to format study time
function formatStudyTime(totalMinutes: number): string {
  if (totalMinutes === 0) return "0 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

// Helper to get student count (for teacher view)
async function getStudentCount(courseId: string): Promise<number> {
  try {
    const response = await fetch(`/api/student/getCourseStudentCount?courseId=${courseId}`);
    if (response.ok) {
      const data = await response.json();
      return data.count || 0;
    }
  } catch {
    // Silently fail
  }
  return 0;
}

// Helper to get course rating (for teacher view)
async function getCourseRating(courseId: string): Promise<{ averageRating: number; reviewsCount: number }> {
  try {
    const response = await fetch(`/api/student/rating?courseId=${courseId}&userId=stats-only`);
    if (response.ok) {
      const data = await response.json();
      return {
        averageRating: data.courseStats?.average_rating || 0,
        reviewsCount: data.courseStats?.reviews_count || 0,
      };
    }
  } catch {
    // Silently fail
  }
  return { averageRating: 0, reviewsCount: 0 };
}


export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // States for dynamic data
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourseData[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<RecommendedCourse[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loadingFavorite, setLoadingFavorite] = useState<string | null>(null);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [productivityData, setProductivityData] = useState<{ day: string; clases: number; autoestudio: number; tareas: number }[]>([]);
  const [calendarData, setCalendarData] = useState<{
    weeks: (number | null)[][];
    month: string;
    year: number;
    eventDays: Set<number>;
    lessonsPerDay: Record<number, { lessons: { title: string; courseName: string }[] }>;
  }>({
    weeks: [],
    month: "",
    year: new Date().getFullYear(),
    eventDays: new Set(),
    lessonsPerDay: {},
  });

  // Toggle favorite function
  const handleToggleFavorite = useCallback(async (courseId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || loadingFavorite) return;

    setLoadingFavorite(courseId);
    try {
      if (favorites.has(courseId)) {
        const response = await fetch(
          `/api/student/favorites?courseId=${courseId}&userId=${user.id}`,
          { method: 'DELETE' }
        );
        if (response.ok) {
          setFavorites(prev => {
            const newSet = new Set(prev);
            newSet.delete(courseId);
            return newSet;
          });
        }
      } else {
        const response = await fetch('/api/student/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, userId: user.id }),
        });
        if (response.ok) {
          setFavorites(prev => new Set([...prev, courseId]));
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setLoadingFavorite(null);
    }
  }, [user, loadingFavorite, favorites]);

  // Build calendar data from schedule items - memoized
  const buildCalendarData = useCallback((scheduleItemsData: { lessonDate: string; title: string; courseName?: string }[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    const startDayOfWeek = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    const eventDaysSet = new Set<number>();
    const lessonsPerDayMap: Record<number, { lessons: { title: string; courseName: string }[] }> = {};

    for (const item of scheduleItemsData) {
      if (!item.lessonDate) continue;
      const lessonDate = new Date(item.lessonDate);
      if (lessonDate.getMonth() === currentMonth && lessonDate.getFullYear() === currentYear) {
        const dayNum = lessonDate.getDate();
        eventDaysSet.add(dayNum);

        if (!lessonsPerDayMap[dayNum]) {
          lessonsPerDayMap[dayNum] = { lessons: [] };
        }
        // Extract course name from title (format: "CourseName: LessonTitle")
        const parts = item.title.split(': ');
        const courseName = item.courseName || (parts.length > 1 ? parts[0] : 'Curso');
        const lessonTitle = parts.length > 1 ? parts.slice(1).join(': ') : item.title;
        lessonsPerDayMap[dayNum].lessons.push({ title: lessonTitle, courseName });
      }
    }

    return {
      weeks,
      month: now.toLocaleDateString('es-ES', { month: 'long' }),
      year: currentYear,
      eventDays: eventDaysSet,
      lessonsPerDay: lessonsPerDayMap,
    };
  }, []);

  // OPTIMIZED: Load student data using aggregated API
  const loadStudentData = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Reset all states
    setEnrolledCourses([]);
    setRecommendedCourses([]);
    setScheduleItems([]);
    setStats([]);
    setProductivityData([]);

    try {
      // Single API call for all dashboard data
      const response = await fetch('/api/student/dashboard');

      if (!response.ok) {
        throw new Error('Error loading dashboard data');
      }

      const data: DashboardApiResponse = await response.json();

      // Set favorites
      setFavorites(new Set(data.favorites));

      // Transform enrolled courses to match existing format
      const transformedEnrolled: EnrolledCourseData[] = data.enrolledCourses.map(item => ({
        course: {
          id: item.course.id,
          title: item.course.title,
          description: item.course.description || '',
          thumbnailUrl: item.course.thumbnailUrl,
          coverImageUrl: item.course.coverImageUrl,
          difficulty: item.course.difficulty as any,
          tags: item.course.tags || [],
        } as Course,
        enrollment: {
          id: item.enrollment.id,
          courseId: item.enrollment.courseId,
          studentId: item.enrollment.studentId,
          enrolledAt: item.enrollment.enrolledAt,
          progress: item.enrollment.progress,
          completedLessons: item.enrollment.completedLessons,
        },
        lessonsCount: item.lessonsCount,
        completedLessonsCount: item.completedLessonsCount,
        progressPercent: item.progressPercent,
        studyTimeMinutes: item.studyTimeMinutes,
      }));

      setEnrolledCourses(transformedEnrolled);

      // Transform recommended courses
      const transformedRecommended: RecommendedCourse[] = data.recommendedCourses.map(item => ({
        level: item.level as "Introductorio" | "Intermedio" | "Avanzado",
        title: item.title,
        description: item.description,
        students: item.students,
        lessons: item.lessons,
        rating: item.rating,
        reviewsCount: item.reviewsCount,
        mentor: "Instructor",
        thumbnail: item.thumbnail,
        courseId: item.courseId,
      }));

      setRecommendedCourses(transformedRecommended);

      // Set schedule items
      setScheduleItems(data.scheduleItems.map(item => ({
        type: item.type,
        title: item.title,
        date: item.date,
        time: item.time,
        courseId: item.courseId,
        lessonId: item.lessonId,
      })));

      // Build calendar data from schedule items
      const calData = buildCalendarData(data.scheduleItems.map(item => ({
        lessonDate: item.lessonDate,
        title: item.title,
      })));
      setCalendarData(calData);
      setSelectedDay(new Date().getDate());

      // Build stats
      const { stats: apiStats } = data;
      const studentStats: StatItem[] = [
        {
          label: "Progreso General",
          value: `${apiStats.progressPercentage}%`,
          delta: apiStats.progressPercentage > 50 ? `+${apiStats.progressPercentage - 50}%` : "",
          icon: Activity,
          accent: "bg-brand-primary/10 text-brand-primary",
          deltaColor: apiStats.progressPercentage > 50 ? "text-brand-success" : "text-slate-400",
        },
        {
          label: "Cursos Completados",
          value: `${apiStats.completedCourses}`,
          delta: apiStats.completedCourses > 0 ? "¡Bien!" : "",
          icon: BookOpenCheck,
          accent: "bg-brand-secondary/10 text-brand-secondary",
          deltaColor: "text-brand-success",
        },
        {
          label: "Cursos En Progreso",
          value: `${apiStats.coursesInProgress}`,
          delta: "",
          icon: BookOpen,
          accent: "bg-brand-primary/10 text-brand-primary",
          deltaColor: "text-slate-400",
        },
        {
          label: "Tiempo Estudiado",
          value: formatStudyTime(apiStats.totalStudyMinutes),
          delta: apiStats.totalStudyMinutes > 0 ? "aprox." : "",
          icon: Clock3,
          accent: "bg-brand-secondary/10 text-brand-secondary",
          deltaColor: "text-slate-400",
        },
      ];
      setStats(studentStats);

      // Build productivity data based on progress
      const totalEnrolled = data.enrolledCourses.length;
      const totalCompletedLessons = data.enrolledCourses.reduce((sum, e) => sum + e.completedLessonsCount, 0);
      const totalLessons = data.enrolledCourses.reduce((sum, e) => sum + e.lessonsCount, 0);

      const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
      const weekProductivity = days.map((day) => {
        if (totalEnrolled === 0) {
          return { day, clases: 0, autoestudio: 0, tareas: 0 };
        }

        const clasesPercent = totalLessons > 0 ? Math.round((totalCompletedLessons / totalLessons) * 100) : 0;
        const autoestudioPercent = apiStats.progressPercentage;
        const tareasPercent = totalEnrolled > 0 ? Math.round((apiStats.completedCourses / totalEnrolled) * 100) : 0;

        return {
          day,
          clases: clasesPercent,
          autoestudio: autoestudioPercent,
          tareas: tareasPercent,
        };
      });

      setProductivityData(weekProductivity);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, buildCalendarData]);

  // Load teacher data (kept as before for now, can be optimized later)
  const loadTeacherData = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Reset all states
    setEnrolledCourses([]);
    setRecommendedCourses([]);
    setScheduleItems([]);
    setStats([]);
    setProductivityData([]);

    try {
      // Get teacher courses
      let teacherCourses = await courseRepository.findBySpeaker(user.id);

      if (teacherCourses.length === 0) {
        teacherCourses = await courseRepository.findBySpeakerEmail(user.email);
      }

      // Parallel fetch: student counts and course ratings
      const [studentCounts, courseRatings] = await Promise.all([
        Promise.all(teacherCourses.map(course => getStudentCount(course.id))),
        Promise.all(teacherCourses.map(course => getCourseRating(course.id))),
      ]);

      const totalStudents = studentCounts.reduce((sum, count) => sum + count, 0);

      // Get lessons for all courses in parallel
      const lessonsPerCourse = await Promise.all(
        teacherCourses.map(course => lessonRepository.findByCourseId(course.id))
      );

      // Build schedule and calendar data
      const now = new Date();
      const upcomingLessons: { lesson: LessonData; courseName: string }[] = [];

      lessonsPerCourse.forEach((lessons, idx) => {
        const course = teacherCourses[idx];
        for (const lesson of lessons) {
          if (lesson.startDate || lesson.scheduledStartTime) {
            const lessonDate = new Date(lesson.startDate || lesson.scheduledStartTime || "");
            if (lessonDate >= now) {
              upcomingLessons.push({ lesson, courseName: course.title });
            }
          }
        }
      });

      upcomingLessons.sort((a, b) => {
        const dateA = new Date(a.lesson.startDate || a.lesson.scheduledStartTime || "");
        const dateB = new Date(b.lesson.startDate || b.lesson.scheduledStartTime || "");
        return dateA.getTime() - dateB.getTime();
      });

      const scheduleData: ScheduleItem[] = upcomingLessons.slice(0, 2).map(({ lesson, courseName }) => {
        const lessonDate = new Date(lesson.startDate || lesson.scheduledStartTime || "");
        const endTime = lesson.durationMinutes
          ? new Date(lessonDate.getTime() + lesson.durationMinutes * 60000)
          : new Date(lessonDate.getTime() + 60 * 60000);

        return {
          type: lesson.type === "livestream" ? "En Vivo" : "Lección",
          title: `${courseName}: ${lesson.title}`,
          date: lessonDate.toLocaleDateString('es-ES', { month: 'long', day: 'numeric' }),
          time: `${lessonDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
          courseId: lesson.courseId,
          lessonId: lesson.id,
        };
      });

      setScheduleItems(scheduleData);

      // Build calendar
      const calData = buildCalendarData(upcomingLessons.map(({ lesson, courseName }) => ({
        lessonDate: (lesson.startDate || lesson.scheduledStartTime || ''),
        title: lesson.title,
        courseName,
      })));
      setCalendarData(calData);
      setSelectedDay(now.getDate());

      // Get recommended courses (parallel fetch)
      const allCourses = await courseRepository.findPublished();
      const otherCourses = allCourses.filter(c => !teacherCourses.some(tc => tc.id === c.id));

      // Parallel fetch for recommendations
      const recommendedData = await Promise.all(
        otherCourses.slice(0, 4).map(async (course) => {
          const [lessons, studentCount, rating] = await Promise.all([
            lessonRepository.findByCourseId(course.id),
            getStudentCount(course.id),
            getCourseRating(course.id),
          ]);
          const activeLessons = lessons.filter(l => l.isActive !== false);

          return {
            level: mapDifficultyToLevel(course.difficulty),
            title: course.title,
            description: cleanDescription(course.description),
            students: studentCount,
            lessons: activeLessons.length || (course.lessonIds?.length || 0),
            rating: rating.averageRating,
            reviewsCount: rating.reviewsCount,
            mentor: "Instructor",
            thumbnail: course.thumbnailUrl || course.coverImageUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
            courseId: course.id,
          };
        })
      );

      setRecommendedCourses(recommendedData);

      // Convert teacher courses to enrolled format
      const teacherCoursesData: EnrolledCourseData[] = teacherCourses.map((course, idx) => {
        const activeLessons = lessonsPerCourse[idx].filter(l => l.isActive !== false);
        const lessonsCount = activeLessons.length || (course.lessonIds?.length || 0);

        return {
          course,
          enrollment: {
            id: course.id,
            courseId: course.id,
            studentId: user.id,
            enrolledAt: course.createdAt,
            progress: 100,
            completedLessons: [],
          },
          lessonsCount: lessonsCount,
          completedLessonsCount: lessonsCount,
          progressPercent: 100,
          studyTimeMinutes: 0,
        };
      });

      setEnrolledCourses(teacherCoursesData);

      // Build teacher stats
      const totalLessons = lessonsPerCourse.reduce((sum, lessons) => {
        return sum + lessons.filter(l => l.isActive !== false).length;
      }, 0);

      const teacherStats: StatItem[] = [
        {
          label: "Total Estudiantes",
          value: `${totalStudents}`,
          delta: totalStudents > 0 ? "activos" : "",
          icon: Users,
          accent: "bg-brand-primary/10 text-brand-primary",
          deltaColor: "text-brand-success",
        },
        {
          label: "Mis Cursos",
          value: `${teacherCourses.length}`,
          delta: "",
          icon: BookOpenCheck,
          accent: "bg-brand-secondary/10 text-brand-secondary",
          deltaColor: "text-brand-success",
        },
        {
          label: "Total Lecciones",
          value: `${totalLessons}`,
          delta: "",
          icon: GraduationCap,
          accent: "bg-brand-primary/10 text-brand-primary",
          deltaColor: "text-slate-400",
        },
        {
          label: "Próximas Clases",
          value: `${upcomingLessons.length}`,
          delta: upcomingLessons.length > 0 ? "programadas" : "",
          icon: Clock3,
          accent: "bg-brand-secondary/10 text-brand-secondary",
          deltaColor: "text-brand-success",
        },
      ];

      setStats(teacherStats);

      // Build productivity data for teacher
      const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
      const weekProductivity = days.map((day) => {
        if (teacherCourses.length === 0) {
          return { day, clases: 0, autoestudio: 0, tareas: 0 };
        }

        const clasesPercent = totalLessons > 0 ? Math.min(100, Math.round((totalLessons / teacherCourses.length) * 10)) : 0;
        const estudiantesPercent = totalStudents > 0 ? Math.min(100, totalStudents * 5) : 0;
        const cursosPercent = teacherCourses.length > 0 ? Math.min(100, teacherCourses.length * 20) : 0;

        return {
          day,
          clases: clasesPercent,
          autoestudio: estudiantesPercent,
          tareas: cursosPercent,
        };
      });

      setProductivityData(weekProductivity);

    } catch (error) {
      console.error("Error loading teacher dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, buildCalendarData]);

  // Effect to load data based on role
  useEffect(() => {
    if (!user) return;

    // If user changed, reset and reload
    if (currentUserId !== user.id) {
      setDataLoaded(false);
      setCurrentUserId(user.id);
      setEnrolledCourses([]);
      setRecommendedCourses([]);
      setScheduleItems([]);
      setStats([]);
      setProductivityData([]);
    }

    // If already loaded for this user, don't reload
    if (dataLoaded && currentUserId === user.id) {
      setLoading(false);
      return;
    }

    // Load data based on role
    const loadData = async () => {
      if (user.role === "teacher") {
        await loadTeacherData();
      } else if (user.role === "student") {
        await loadStudentData();
      } else {
        // For admin, superadmin, support - don't load student enrollments
        setLoading(false);
      }
      setDataLoaded(true);
    };

    loadData();
  }, [user, currentUserId, dataLoaded, loadStudentData, loadTeacherData]);

  // Memoized date info
  const dateInfo = useMemo(() => {
    const now = new Date();
    return {
      weekday: now.toLocaleDateString('es-ES', { weekday: 'long' }),
      fullDate: now.toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' }),
      today: now.getDate(),
    };
  }, []);

  // Memoized selected day lessons
  const selectedDayLessons = useMemo(() => {
    return selectedDay ? calendarData.lessonsPerDay[selectedDay]?.lessons || [] : [];
  }, [selectedDay, calendarData.lessonsPerDay]);

  // Check if user is admin role (admin, superadmin, support)
  const isAdminRole = user?.role === "admin" || user?.role === "superadmin" || user?.role === "support";

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex-1 space-y-8">
            {/* Skeleton for recommended courses */}
            <section>
              <div className="mb-4 h-7 w-64 animate-pulse rounded bg-slate-200" />
              <div className="grid gap-6 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-200" />
                ))}
              </div>
            </section>
            {/* Skeleton for my courses */}
            <section>
              <div className="mb-4 h-7 w-32 animate-pulse rounded bg-slate-200" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200" />
                ))}
              </div>
            </section>
          </div>
          <div className="w-full space-y-6 lg:max-w-sm">
            <div className="h-96 animate-pulse rounded-3xl bg-slate-200" />
            <div className="h-32 animate-pulse rounded-3xl bg-slate-200" />
            <div className="h-48 animate-pulse rounded-3xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* Main Content - Two Columns */}
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left Column - Main Content */}
        <div className="flex-1 space-y-8">
          {/* Top Courses Section - Recommended (hidden for admin roles) */}
          {!isAdminRole && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Cursos recomendados para ti</h2>
                <Link href="/dashboard/available-courses" className="text-sm font-medium text-brand-secondary hover:underline">
                  Ver todos
                </Link>
              </div>
              {recommendedCourses.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {recommendedCourses.map((course, idx) => (
                    <Link key={course.courseId} href={`/dashboard/available-courses`} className="block h-full">
                      <CourseCard
                        {...course}
                        priority={idx === 0}
                        courseId={course.courseId}
                        isFavorite={favorites.has(course.courseId)}
                        loadingFavorite={loadingFavorite === course.courseId}
                        onToggleFavorite={(e) => handleToggleFavorite(course.courseId, e)}
                      />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
                  <p className="mt-2 text-slate-500">No hay cursos recomendados disponibles</p>
                  <Link
                    href="/dashboard/available-courses"
                    className="mt-4 inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
                  >
                    Explorar cursos
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* My Courses Section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                {user?.role === "teacher" ? "Mis Cursos (Instructor)" : "Mis Cursos"}
              </h2>
              <Link
                href={user?.role === "teacher" ? "/dashboard/my-courses" : "/dashboard/enrolled-courses"}
                className="text-sm font-medium text-brand-secondary hover:underline"
              >
                Ver todos
              </Link>
            </div>
            {enrolledCourses.length > 0 ? (
              <div className="space-y-4">
                {enrolledCourses.slice(0, 4).map((item) => (
                  <Link
                    key={item.course.id}
                    href={
                      user?.role === "teacher"
                        ? `/dashboard/my-courses/${item.course.id}/edit`
                        : `/dashboard/student/courses/${item.course.id}`
                    }
                  >
                    <CourseListItem
                      title={item.course.title}
                      sessions={`${item.completedLessonsCount}/${item.lessonsCount}`}
                      thumbnail={
                        item.course.thumbnailUrl ||
                        item.course.coverImageUrl ||
                        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80"
                      }
                      avatars={[]}
                      highlight={
                        item.completedLessonsCount > 0 && item.completedLessonsCount < item.lessonsCount
                          ? "En progreso"
                          : item.completedLessonsCount >= item.lessonsCount && item.lessonsCount > 0
                            ? "Completado"
                            : undefined
                      }
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <GraduationCap className="mx-auto h-12 w-12 text-slate-400" />
                <p className="mt-2 text-slate-500">
                  {user?.role === "teacher"
                    ? "Aún no has creado ningún curso"
                    : "Aún no estás inscrito en ningún curso"}
                </p>
                <Link
                  href={user?.role === "teacher" ? "/dashboard/my-courses/new" : "/dashboard/available-courses"}
                  className="mt-4 inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
                >
                  {user?.role === "teacher" ? "Crear curso" : "Explorar cursos"}
                </Link>
              </div>
            )}
          </section>
        </div>

        {/* Right Column - Sidebar Widgets */}
        <div className="w-full space-y-6 lg:max-w-sm">
          {/* Calendar Widget */}
          <section className="rounded-3xl bg-white p-5 shadow-card-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 capitalize">{dateInfo.weekday}</p>
                <p className="text-xl font-semibold text-slate-900 capitalize">{dateInfo.fullDate}</p>
              </div>
              {selectedDayLessons.length > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-secondary/10 text-brand-secondary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {selectedDayLessons.length} {selectedDayLessons.length === 1 ? "clase" : "clases"}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-slate-400 italic">Sin clases</div>
              )}
            </div>
            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between text-sm font-semibold text-slate-700">
                <span className="capitalize">{calendarData.month} {calendarData.year}</span>
                <div className="flex gap-2 text-slate-400">
                  <button className="rounded-full border border-slate-200 p-1" disabled>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="rounded-full border border-slate-200 p-1" disabled>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-slate-400">
                {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-7 gap-2 text-center text-sm">
                {calendarData.weeks.flatMap((week, rowIndex) =>
                  week.map((day, columnIndex) => {
                    if (!day) {
                      return <span key={`${rowIndex}-${columnIndex}`} className="h-9 w-9" />;
                    }

                    const isSelected = day === selectedDay;
                    const hasEvent = calendarData.eventDays.has(day);
                    const isToday = day === dateInfo.today;

                    return (
                      <button
                        key={`${rowIndex}-${columnIndex}-${day}`}
                        onClick={() => setSelectedDay(day)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${isSelected
                            ? "bg-brand-secondary text-white"
                            : isToday
                              ? "bg-brand-primary/10 text-brand-primary"
                              : hasEvent
                                ? "text-slate-700 hover:bg-brand-secondary/10"
                                : "text-slate-700 hover:bg-slate-100"
                          }`}
                      >
                        <div className="flex flex-col items-center">
                          <span>{day}</span>
                          {hasEvent && (
                            <span
                              className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-brand-secondary"
                                }`}
                            />
                          )}
                        </div>
                      </button>
                    );
                  }),
                )}
              </div>
            </div>
            {/* Lessons for selected day */}
            {selectedDayLessons.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Clases del día</p>
                <div className="space-y-2">
                  {selectedDayLessons.map((lesson, idx) => (
                    <div key={idx} className="rounded-lg bg-slate-50 p-2">
                      <p className="text-sm font-medium text-slate-900">{lesson.title}</p>
                      <p className="text-xs text-slate-500">{lesson.courseName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Schedule Cards */}
          <section className="space-y-3">
            {scheduleItems.length > 0 ? (
              scheduleItems.map((item) => (
                <ScheduleCard key={`${item.courseId}-${item.lessonId}`} {...item} />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center">
                <Clock3 className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm text-slate-500">No hay clases programadas próximamente</p>
              </div>
            )}
          </section>

          {/* Overall Information */}
          <section className="rounded-3xl bg-white p-5 shadow-card-soft">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Información General</h3>
              <button className="text-sm font-medium text-brand-secondary">Ver todo</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${stat.accent}`}>
                      <stat.icon className="h-4 w-4" />
                    </span>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
                    <span className={`text-xs font-semibold ${stat.deltaColor}`}>{stat.delta}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Productivity Chart - Lazy Loaded (hidden for admin roles) */}
          {!isAdminRole && (
            <section className="rounded-3xl bg-white p-5 shadow-card-soft">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Progreso Semanal</h3>
                  <p className="text-sm text-slate-500">Tu actividad de estudio</p>
                </div>
              </div>
              <ProductivityChartLazy data={productivityData} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
