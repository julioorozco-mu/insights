"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  IconBook,
  IconUsers,
  IconStar,
  IconBookmark,
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
  IconClock,
  IconChartBar,
  IconArrowUpRight,
  IconArrowDownRight,
  IconBell,
} from "@tabler/icons-react";

// Types
interface Course {
  id: string;
  title: string;
  thumbnail?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  studentsCount?: number;
  rating?: number;
  speakerName?: string;
  speakerAvatar?: string;
}

interface EnrolledCourse {
  id: string;
  title: string;
  thumbnail?: string;
  progress: number;
  totalSessions: number;
  completedSessions: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);
  const [totalHours, setTotalHours] = useState(34);
  const [loadingStats, setLoadingStats] = useState(true);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);

  // Calendar state
  const [currentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(currentDate.getDate());

  // Get current date info
  const weekday = currentDate.toLocaleDateString('es-ES', { weekday: 'long' });
  const monthYear = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  // Generate calendar days
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const calendarDays = getDaysInMonth(currentDate);

  // Mock productivity data
  const productivityData = [
    { day: 'Lun', mentoring: 40, selfImprove: 60, student: 80 },
    { day: 'Mar', mentoring: 30, selfImprove: 45, student: 70 },
    { day: 'Mié', mentoring: 50, selfImprove: 55, student: 65 },
    { day: 'Jue', mentoring: 35, selfImprove: 40, student: 75 },
    { day: 'Vie', mentoring: 60, selfImprove: 70, student: 85 },
    { day: 'Sáb', mentoring: 45, selfImprove: 50, student: 60 },
    { day: 'Dom', mentoring: 20, selfImprove: 35, student: 45 },
  ];

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoadingStats(false);
        return;
      }

      try {
        // Load stats based on role
        if (user.role === "admin") {
          const [coursesSnapshot, studentsSnapshot] = await Promise.all([
            getDocs(collection(db, "courses")),
            getDocs(query(collection(db, "users"), where("role", "==", "student"))),
          ]);
          setTotalCourses(coursesSnapshot.size);
          setTotalStudents(studentsSnapshot.size);
        } else if (user.role === "speaker") {
          const coursesQuery = query(
            collection(db, "courses"),
            where("speakerIds", "array-contains", user.id)
          );
          const coursesSnapshot = await getDocs(coursesQuery);
          setTotalCourses(coursesSnapshot.size);
        } else if (user.role === "student") {
          const enrollmentsQuery = query(
            collection(db, "enrollments"),
            where("studentId", "==", user.id)
          );
          const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
          setTotalCourses(enrollmentsSnapshot.size);
        }

        // Load recommended courses
        const coursesQuery = query(collection(db, "courses"), limit(4));
        const coursesSnapshot = await getDocs(coursesQuery);
        const courses: Course[] = coursesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Curso sin título',
            thumbnail: data.thumbnail,
            speakerName: data.speakerName,
            speakerAvatar: data.speakerAvatar,
            level: ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)] as Course['level'],
            studentsCount: Math.floor(Math.random() * 200) + 50,
            rating: Number((Math.random() * 1 + 4).toFixed(1)),
          };
        });
        setRecommendedCourses(courses);

        // Mock enrolled courses
        setEnrolledCourses([
          { id: '1', title: 'AI & Virtual Reality', thumbnail: '/images/courses/ai-vr.jpg', progress: 75, totalSessions: 12, completedSessions: 9 },
          { id: '2', title: 'Photography', thumbnail: '/images/courses/photo.jpg', progress: 67, totalSessions: 24, completedSessions: 16 },
          { id: '3', title: 'Business Ecosystem', thumbnail: '/images/courses/business.jpg', progress: 61, totalSessions: 18, completedSessions: 11 },
          { id: '4', title: 'React Native Development', thumbnail: '/images/courses/react.jpg', progress: 49, totalSessions: 37, completedSessions: 18 },
        ]);

      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadData();
  }, [user]);

  // Level badge component
  const LevelBadge = ({ level }: { level: Course['level'] }) => {
    const styles = {
      beginner: 'bg-green-100 text-green-700',
      intermediate: 'bg-amber-100 text-amber-700',
      advanced: 'bg-red-100 text-red-700',
    };
    const labels = {
      beginner: 'Principiante',
      intermediate: 'Intermedio',
      advanced: 'Avanzado',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[level || 'beginner']}`}>
        {labels[level || 'beginner']}
      </span>
    );
  };

  return (
    <div className="flex gap-6 min-h-full">
      {/* Main Content Column */}
      <div className="flex-1 min-w-0">
        {/* Top Courses Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-dashboard-textPrimary">Cursos recomendados</h2>
            <Link href="/dashboard/available-courses" className="text-sm font-medium text-dashboard-accent flex items-center gap-1 hover:opacity-80">
              Ver todos
              <IconChevronRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedCourses.length > 0 ? recommendedCourses.map((course) => (
              <Link 
                key={course.id} 
                href={`/dashboard/courses/${course.id}`}
                className="course-card bg-white overflow-hidden hover-lift"
              >
                {/* Thumbnail */}
                <div className="relative h-36 bg-gradient-to-br from-dashboard-accent/20 to-dashboard-accentSoft">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <IconBook size={48} className="text-dashboard-accent/50" />
                    </div>
                  )}
                  {/* Bookmark button */}
                  <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-lg shadow-cardSoft flex items-center justify-center hover:shadow-card transition-all">
                    <IconBookmark size={16} className="text-dashboard-textSecondary" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Badge and meta row */}
                  <div className="flex items-center justify-between mb-2">
                    <LevelBadge level={course.level} />
                    <div className="flex items-center gap-3 text-xs text-dashboard-textMuted">
                      <span className="flex items-center gap-1">
                        <IconUsers size={14} />
                        {course.studentsCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <IconStar size={14} className="text-amber-400 fill-amber-400" />
                        {course.rating}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-dashboard-textPrimary mb-3 line-clamp-2">
                    {course.title}
                  </h3>

                  {/* Author */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-dashboard-accentSoft flex items-center justify-center text-xs font-medium text-dashboard-accent">
                      {course.speakerName?.charAt(0) || 'P'}
                    </div>
                    <span className="text-sm text-dashboard-textSecondary">
                      {course.speakerName || 'Instructor'}
                    </span>
                  </div>
                </div>
              </Link>
            )) : (
              // Skeleton loaders
              [...Array(4)].map((_, i) => (
                <div key={i} className="course-card bg-white overflow-hidden animate-pulse">
                  <div className="h-36 bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-20" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* My Courses Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-dashboard-textPrimary">Mis Cursos</h2>
            <Link href="/dashboard/enrolled-courses" className="text-sm font-medium text-dashboard-accent flex items-center gap-1 hover:opacity-80">
              Ver todos
              <IconChevronRight size={16} />
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-cardSoft overflow-hidden">
            {enrolledCourses.map((course, index) => (
              <Link
                key={course.id}
                href={`/dashboard/courses/${course.id}`}
                className={`flex items-center gap-4 p-4 hover:bg-dashboard-accentSoft/30 transition-colors ${
                  index !== enrolledCourses.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                {/* Thumbnail */}
                <div className="w-14 h-10 rounded-lg bg-gradient-to-br from-dashboard-accent/20 to-dashboard-accentSoft overflow-hidden flex-shrink-0">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <IconBook size={20} className="text-dashboard-accent/50" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-dashboard-textPrimary truncate">{course.title}</h4>
                  <p className="text-xs text-dashboard-textMuted">
                    Sesiones completadas: {course.completedSessions}/{course.totalSessions}
                  </p>
                </div>

                {/* Avatar Group */}
                <div className="hidden sm:flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-white"
                    />
                  ))}
                  <div className="w-7 h-7 rounded-full bg-dashboard-accentSoft border-2 border-white flex items-center justify-center text-xs font-medium text-dashboard-accent">
                    +{Math.floor(Math.random() * 15) + 5}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Right Sidebar Column */}
      <div className="hidden lg:block w-80 flex-shrink-0 space-y-6">
        {/* Date Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-dashboard-textPrimary capitalize">{weekday}</h2>
            <p className="text-sm text-dashboard-textMuted capitalize">{monthYear}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-white shadow-cardSoft flex items-center justify-center hover:shadow-card transition-all">
              <IconBell size={18} className="text-dashboard-textSecondary" />
            </button>
            <div className="w-10 h-10 rounded-full bg-dashboard-accent overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mini Calendar */}
        <div className="bg-white rounded-2xl shadow-cardSoft p-4">
          <div className="flex items-center justify-between mb-4">
            <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <IconChevronLeft size={18} className="text-dashboard-textSecondary" />
            </button>
            <span className="text-sm font-medium text-dashboard-textPrimary capitalize">
              {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </span>
            <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <IconChevronRight size={18} className="text-dashboard-textSecondary" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map((day) => (
              <div key={day} className="py-2 text-dashboard-textMuted font-medium">
                {day}
              </div>
            ))}
            {calendarDays.map((day, index) => (
              <button
                key={index}
                onClick={() => day && setSelectedDay(day)}
                className={`py-2 rounded-full text-sm transition-colors ${
                  day === null
                    ? ''
                    : day === selectedDay
                    ? 'bg-dashboard-accent text-white font-medium'
                    : day === currentDate.getDate()
                    ? 'text-dashboard-accent font-medium'
                    : 'text-dashboard-textPrimary hover:bg-gray-100'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Cards */}
        <div className="space-y-3">
          {/* Course Schedule */}
          <div className="bg-white rounded-2xl shadow-cardSoft p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-dashboard-accentSoft flex items-center justify-center">
                <IconBook size={20} className="text-dashboard-accent" />
              </div>
              <div>
                <p className="text-xs text-dashboard-textMuted font-medium">Curso</p>
                <p className="text-sm font-semibold text-dashboard-textPrimary">Análisis de Negocios</p>
              </div>
              <IconChevronRight size={18} className="text-dashboard-textMuted ml-auto" />
            </div>
            <div className="flex items-center gap-4 text-xs text-dashboard-textMuted">
              <span className="flex items-center gap-1">
                <IconCalendar size={14} />
                25 Abril
              </span>
              <span className="flex items-center gap-1">
                <IconClock size={14} />
                11:00-12:00
              </span>
            </div>
          </div>

          {/* Tutoring Schedule */}
          <div className="bg-white rounded-2xl shadow-cardSoft p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <IconUsers size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-dashboard-textMuted font-medium">Tutoría</p>
                <p className="text-sm font-semibold text-dashboard-textPrimary">AI & Realidad Virtual: Intro</p>
              </div>
              <IconChevronRight size={18} className="text-dashboard-textMuted ml-auto" />
            </div>
            <div className="flex items-center gap-4 text-xs text-dashboard-textMuted">
              <span className="flex items-center gap-1">
                <IconCalendar size={14} />
                27 Abril
              </span>
              <span className="flex items-center gap-1">
                <IconClock size={14} />
                14:30-15:30
              </span>
            </div>
          </div>
        </div>

        {/* Overall Information */}
        <div>
          <h3 className="text-sm font-semibold text-dashboard-textPrimary mb-3">Información General</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Score */}
            <div className="bg-white rounded-xl shadow-cardSoft p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-dashboard-accentSoft flex items-center justify-center">
                  <IconChartBar size={16} className="text-dashboard-accent" />
                </div>
                <span className="text-xs text-dashboard-textMuted">Puntuación</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-dashboard-textPrimary">{loadingStats ? '-' : 210}</span>
                <span className="text-xs text-dashboard-success flex items-center">
                  <IconArrowUpRight size={12} />
                  +13%
                </span>
              </div>
            </div>

            {/* Completed Courses */}
            <div className="bg-white rounded-xl shadow-cardSoft p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <IconBook size={16} className="text-green-600" />
                </div>
                <span className="text-xs text-dashboard-textMuted">Cursos</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-dashboard-textPrimary">{loadingStats ? '-' : totalHours}h</span>
                <span className="text-xs text-dashboard-success flex items-center">
                  <IconArrowUpRight size={12} />
                  +15%
                </span>
              </div>
            </div>

            {/* Total Students */}
            <div className="bg-white rounded-xl shadow-cardSoft p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <IconUsers size={16} className="text-blue-600" />
                </div>
                <span className="text-xs text-dashboard-textMuted">Estudiantes</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-dashboard-textPrimary">{loadingStats ? '-' : totalStudents || 17}</span>
                <span className="text-xs text-dashboard-danger flex items-center">
                  <IconArrowDownRight size={12} />
                  -2%
                </span>
              </div>
            </div>

            {/* Total Hours */}
            <div className="bg-white rounded-xl shadow-cardSoft p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <IconClock size={16} className="text-orange-600" />
                </div>
                <span className="text-xs text-dashboard-textMuted">Horas</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-dashboard-textPrimary">11</span>
                <span className="text-xs text-dashboard-danger flex items-center">
                  <IconArrowDownRight size={12} />
                  -9%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Productivity Chart */}
        <div className="bg-white rounded-2xl shadow-cardSoft p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-dashboard-textPrimary">Productividad</h3>
            <Link href="/dashboard/analytics" className="text-xs font-medium text-dashboard-accent flex items-center gap-1 hover:opacity-80">
              Ver detalles
              <IconChevronRight size={14} />
            </Link>
          </div>

          {/* Simple Bar Chart */}
          <div className="space-y-3">
            <div className="flex items-end justify-between h-32 gap-2">
              {productivityData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col gap-0.5 items-center">
                    <div 
                      className="w-2 rounded-full bg-cyan-400"
                      style={{ height: `${data.mentoring * 0.8}px` }}
                    />
                    <div 
                      className="w-2 rounded-full bg-purple-400"
                      style={{ height: `${data.selfImprove * 0.8}px` }}
                    />
                    <div 
                      className="w-2 rounded-full bg-dashboard-accent"
                      style={{ height: `${data.student * 0.8}px` }}
                    />
                  </div>
                  <span className="text-xs text-dashboard-textMuted">{data.day}</span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-xs text-dashboard-textMuted">Mentoría</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-xs text-dashboard-textMuted">Auto-mejora</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-dashboard-accent" />
                <span className="text-xs text-dashboard-textMuted">Estudiante</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
