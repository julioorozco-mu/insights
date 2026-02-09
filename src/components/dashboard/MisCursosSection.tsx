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
  Star,
  Check,
  X,
  Calendar,
  RotateCcw,
  RefreshCw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
export interface QuizExamDetail {
  id: string;
  name: string;
  passed: boolean;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedDate: string | null;
  lessonId: string;
  subsectionIndex: number;
  attemptCount: number;
  maxAttempts: number;
}

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
  quizDetails: QuizExamDetail[];
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
  quizDetails: QuizExamDetail[];
  lastAccessedLessonId: string | null;
  lastAccessedSubsectionIndex: number;
}

interface MisCursosSectionProps {
  microcredentials: MisCursosMicrocredential[];
  standaloneCourses: MisCursosStandaloneCourse[];
  userRole?: string;
}

// ─── Date formatter ─────────────────────────────────────────────────
function formatDate(isoString: string | null): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Exam Accordion (expandable quiz details) ───────────────────────
function ExamAccordion({
  quizDetails,
  totalQuizzes,
  completedQuizzes,
  courseId,
}: {
  quizDetails: QuizExamDetail[];
  totalQuizzes: number;
  completedQuizzes: number;
  courseId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <div>
      {/* Trigger row */}
      <button
        type="button"
        onClick={toggle}
        className={`flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
          completedQuizzes > 0
            ? "bg-teal-50 text-teal-700 hover:bg-teal-100"
            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
        }`}
      >
        <ClipboardCheck className="h-3.5 w-3.5" />
        Exámenes: {completedQuizzes}/{totalQuizzes}
        <ChevronDown
          className={`ml-auto h-3 w-3 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expandable content */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-2 space-y-0 rounded-lg border border-slate-200/80">
            {quizDetails.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-slate-400">
                Sin exámenes disponibles
              </p>
            ) : (
              quizDetails.map((quiz, idx) => (
                <div
                  key={quiz.id}
                  className={`px-3 py-2.5 ${
                    idx > 0 ? "border-t border-slate-100" : ""
                  }`}
                >
                  {/* Row 1: Enumeration + Name + Badge */}
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800 line-clamp-1">
                      <span className="mr-1 text-slate-800">{idx + 1}.</span>
                      {quiz.name}
                    </span>
                    {quiz.completedDate ? (
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          quiz.passed
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {quiz.passed ? (
                          <>
                            <Check className="h-2.5 w-2.5" />
                            Acreditado
                          </>
                        ) : (
                          <>
                            <X className="h-2.5 w-2.5" />
                            Fallido
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                        Pendiente
                      </span>
                    )}
                  </div>

                  {/* Row 2: Metrics or Pendiente message */}
                  {quiz.completedDate ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      {/* Calificación */}
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-400" />
                        <span className="font-semibold text-slate-700">
                          {Math.round(quiz.percentage)}
                        </span>
                        /100
                      </span>

                      {/* Aciertos */}
                      <span className="inline-flex items-center gap-1">
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span className="font-semibold text-slate-700">
                          {quiz.score}
                        </span>
                        /{quiz.totalQuestions}
                      </span>

                      {/* Intentos */}
                      <span
                        className={`inline-flex items-center gap-1 ${
                          quiz.attemptCount >= quiz.maxAttempts
                            ? "text-red-500"
                            : "text-slate-500"
                        }`}
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span className="font-semibold">
                          {quiz.attemptCount}
                        </span>
                        /{quiz.maxAttempts}
                      </span>

                      {/* Fecha */}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {formatDate(quiz.completedDate)}
                      </span>

                      {/* Retry button for failed — only if attempts remain */}
                      {!quiz.passed &&
                        quiz.attemptCount < quiz.maxAttempts && (
                          <Link
                            href={`/student/courses/${courseId}/learn/lecture/${quiz.lessonId}?subsection=${quiz.subsectionIndex}&retryQuiz=${quiz.id}`}
                            className="ml-auto inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 transition-colors hover:bg-amber-100"
                          >
                            <RotateCcw className="h-2.5 w-2.5" />
                            Reintentar
                          </Link>
                        )}

                      {/* No attempts left message */}
                      {!quiz.passed &&
                        quiz.attemptCount >= quiz.maxAttempts && (
                          <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                            Sin intentos
                          </span>
                        )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Avanza en las lecciones para desbloquear este examen.
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
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

      {/* Exámenes Accordion */}
      <div className="mt-auto">
        {course.isLocked ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-400">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Exámenes: {course.completedQuizzes}/{course.totalQuizzes}
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
              Bloqueado
              <Lock className="h-3.5 w-3.5" />
            </div>
          </div>
        ) : (
          <>
            <ExamAccordion
              quizDetails={course.quizDetails}
              totalQuizzes={course.totalQuizzes}
              completedQuizzes={course.completedQuizzes}
              courseId={course.courseId}
            />
            {/* Action Button */}
            <div className="mt-2 flex justify-end">
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
          </>
        )}
      </div>
    </div>
  );
});

// ─── Microcredential Group Card (Accordion) ─────────────────────────
function MicrocredentialGroupCard({
  mc,
  index
}: {
  mc: MisCursosMicrocredential;
  index: number;
}) {
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
          {index}. Microcredencial: {mc.title}
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

        {/* Exámenes Accordion + Action */}
        <div className="mt-2">
          <ExamAccordion
            quizDetails={course.quizDetails}
            totalQuizzes={course.totalQuizzes}
            completedQuizzes={course.completedQuizzes}
            courseId={course.courseId}
          />
          <div className="mt-2 flex justify-end">
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
          {microcredentials.map((mc, idx) => (
            <MicrocredentialGroupCard key={mc.id} mc={mc} index={idx + 1} />
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
