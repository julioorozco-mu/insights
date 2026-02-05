"use client";

import { memo, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Lock,
  ChevronDown,
  ArrowRight,
  ClipboardCheck,
  GraduationCap,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
export interface MisCursosCourseProgress {
  courseId: string;
  title: string;
  thumbnailUrl: string | null;
  coverImageUrl: string | null;
  level: 1 | 2;
  isLocked: boolean;
  /** Sesiones = lessons (each lesson row = 1 "sesión") */
  totalSections: number;
  completedSections: number;
  /** Lecciones = subsections (parsed from lesson JSON content) */
  totalLessons: number;
  completedLessons: number;
  /** Overall progress 0–100 */
  progressPercent: number;
  /** Quizzes / Exams */
  totalQuizzes: number;
  completedQuizzes: number;
  /** Resume data */
  lastAccessedLessonId: string | null;
  lastAccessedSubsectionIndex: number;
}

export interface MisCursosMicrocredential {
  id: string;
  title: string;
  courses: [MisCursosCourseProgress, MisCursosCourseProgress];
}

export interface MisCursosStandaloneCourse {
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
  lastAccessedLessonId: string | null;
  lastAccessedSubsectionIndex: number;
}

interface MisCursosSectionProps {
  microcredentials: MisCursosMicrocredential[];
  standaloneCourses: MisCursosStandaloneCourse[];
  userRole?: string;
}

// ─── Progress Bar ────────────────────────────────────────────────────
function ProgressBar({
  percent,
  colorClass = "bg-brand-success",
}: {
  percent: number;
  colorClass?: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Single Course Card ──────────────────────────────────────────────
const MisCursosCourseCard = memo(function MisCursosCourseCard({
  course,
}: {
  course: MisCursosCourseProgress;
}) {
  const image =
    course.thumbnailUrl ||
    course.coverImageUrl ||
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80";

  const sectionPercent =
    course.totalSections > 0
      ? Math.round((course.completedSections / course.totalSections) * 100)
      : 0;
  const lessonPercent =
    course.totalLessons > 0
      ? Math.round((course.completedLessons / course.totalLessons) * 100)
      : 0;

  return (
    <div
      className={`relative flex flex-col rounded-2xl bg-white p-3 transition-all duration-200 ${
        course.isLocked
          ? "opacity-75"
          : "hover:shadow-card-soft"
      }`}
    >
      {/* Cover Image + Level Badge */}
      <div className="relative mb-3 aspect-[16/10] overflow-hidden rounded-xl">
        <Image
          src={image}
          alt={course.title}
          width={400}
          height={250}
          className={`h-full w-full object-cover ${
            course.isLocked ? "grayscale-[30%]" : ""
          }`}
        />
        {/* Level Badge */}
        <span
          className={`absolute right-2 top-2 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
            course.level === 1
              ? "bg-brand-success text-white"
              : "bg-slate-600 text-white"
          }`}
        >
          Nivel {course.level}
        </span>
      </div>

      {/* Title */}
      <h4 className="mb-3 min-h-[2.5rem] text-sm font-bold leading-snug text-slate-900 line-clamp-2">
        {course.title}
      </h4>

      {/* Sessions (Secciones) Progress */}
      <div className="mb-1">
        <p className="mb-1 text-xs text-slate-500">
          Sesiones completadas:{" "}
          <span className="font-semibold text-slate-700">
            {course.completedSections}/{course.totalSections}
          </span>
        </p>
        <div className="flex items-center gap-2">
          <ProgressBar
            percent={sectionPercent}
            colorClass="bg-brand-success"
          />
          <span className="text-[11px] font-semibold text-slate-500">
            {sectionPercent}%
          </span>
        </div>
      </div>

      {/* Lessons (Subsecciones/Lecciones) Progress */}
      <div className="mb-3">
        <p className="mb-1 text-xs text-slate-500">
          Lecciones completadas:{" "}
          <span className="font-semibold text-slate-700">
            {course.completedLessons}/{course.totalLessons}
          </span>
        </p>
        <div className="flex items-center gap-2">
          <ProgressBar
            percent={lessonPercent}
            colorClass="bg-brand-success"
          />
          <span className="text-[11px] font-semibold text-slate-500">
            {lessonPercent}%
          </span>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="mt-auto flex items-center justify-between gap-2">
        {/* Quiz Badge */}
        <div
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
            course.isLocked
              ? "bg-slate-100 text-slate-400"
              : course.completedQuizzes > 0
                ? "bg-teal-50 text-teal-700"
                : "bg-slate-50 text-slate-500"
          }`}
        >
          <ClipboardCheck className="h-3.5 w-3.5" />
          Exámenes: {course.completedQuizzes}/{course.totalQuizzes}
        </div>

        {/* Action Button */}
        {course.isLocked ? (
          <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
            Bloqueado
            <Lock className="h-3.5 w-3.5" />
          </div>
        ) : (
          <Link
            href={
              course.lastAccessedLessonId &&
              course.progressPercent > 0 &&
              course.progressPercent < 100
                ? `/student/courses/${course.courseId}/learn/lecture/${course.lastAccessedLessonId}?subsection=${course.lastAccessedSubsectionIndex}`
                : `/dashboard/student/courses/${course.courseId}`
            }
            className="flex items-center gap-1 text-xs font-semibold text-brand-secondary hover:underline"
          >
            {course.progressPercent >= 100
              ? "Revisar"
              : course.progressPercent > 0
                ? "Continuar"
                : "Ir al curso"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
});

// ─── Microcredential Group Card (Accordion) ─────────────────────────
function MicrocredentialGroupCard({ mc }: { mc: MisCursosMicrocredential }) {
  const [isOpen, setIsOpen] = useState(true);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card-soft">
      {/* Header — clickable toggle */}
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3 text-left transition-colors hover:bg-slate-100/60"
      >
        <h3 className="text-sm font-semibold text-slate-700">
          Microcredencial: {mc.title}
        </h3>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${
            isOpen ? "rotate-0" : "-rotate-90"
          }`}
        />
      </button>

      {/* Collapsible body */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
            {mc.courses.map((course) => (
              <MisCursosCourseCard key={course.courseId} course={course} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Standalone Course Card (not part of microcredential) ────────────
const StandaloneCourseCard = memo(function StandaloneCourseCard({
  course,
}: {
  course: MisCursosStandaloneCourse;
}) {
  const image =
    course.thumbnailUrl ||
    course.coverImageUrl ||
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80";

  const sectionPercent =
    course.totalSections > 0
      ? Math.round((course.completedSections / course.totalSections) * 100)
      : 0;
  const lessonPercent =
    course.totalLessons > 0
      ? Math.round((course.completedLessons / course.totalLessons) * 100)
      : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card-soft transition-all hover:shadow-card">
      <div className="p-3">
        <div className="grid grid-cols-[80px_1fr] gap-3">
          {/* Thumbnail */}
          <div className="aspect-square overflow-hidden rounded-xl">
            <Image
              src={image}
              alt={course.title}
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center gap-1">
            <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
              {course.title}
            </h4>
            <p className="text-xs text-slate-500">
              Sesiones: {course.completedSections}/{course.totalSections} ·
              Lecciones: {course.completedLessons}/{course.totalLessons}
            </p>
            <ProgressBar percent={course.progressPercent} />
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-500">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Exámenes: {course.completedQuizzes}/{course.totalQuizzes}
          </div>
          <Link
            href={
              course.lastAccessedLessonId &&
              course.progressPercent > 0 &&
              course.progressPercent < 100
                ? `/student/courses/${course.courseId}/learn/lecture/${course.lastAccessedLessonId}?subsection=${course.lastAccessedSubsectionIndex}`
                : `/dashboard/student/courses/${course.courseId}`
            }
            className="flex items-center gap-1 text-xs font-semibold text-brand-secondary hover:underline"
          >
            {course.progressPercent >= 100
              ? "Revisar"
              : course.progressPercent > 0
                ? "Continuar"
                : "Ir al curso"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
});

// ─── Main Section ────────────────────────────────────────────────────
export const MisCursosSection = memo(function MisCursosSection({
  microcredentials,
  standaloneCourses,
  userRole,
}: MisCursosSectionProps) {
  const hasContent = microcredentials.length > 0 || standaloneCourses.length > 0;

  return (
    <section>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">
          {userRole === "teacher" ? "Mis Cursos (Instructor)" : "Mis Cursos"}
        </h2>
        <Link
          href={
            userRole === "teacher"
              ? "/dashboard/my-courses"
              : "/dashboard/enrolled-courses"
          }
          className="text-sm font-medium text-brand-secondary hover:underline"
        >
          Ver todos
        </Link>
      </div>

      {hasContent ? (
        <div className="space-y-4">
          {/* Microcredential Groups */}
          {microcredentials.map((mc) => (
            <MicrocredentialGroupCard key={mc.id} mc={mc} />
          ))}

          {/* Standalone Courses */}
          {standaloneCourses.length > 0 && (
            <div className="space-y-3">
              {standaloneCourses.map((course) => (
                <StandaloneCourseCard
                  key={course.courseId}
                  course={course}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-2 text-slate-500">
            {userRole === "teacher"
              ? "Aún no has creado ningún curso"
              : "Aún no estás inscrito en ningún curso"}
          </p>
          <Link
            href={
              userRole === "teacher"
                ? "/dashboard/my-courses/new"
                : "/dashboard/catalog/microcredentials"
            }
            className="mt-4 inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
          >
            {userRole === "teacher" ? "Crear curso" : "Explorar cursos"}
          </Link>
        </div>
      )}
    </section>
  );
});
