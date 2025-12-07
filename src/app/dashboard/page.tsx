"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Activity, Clock3, Users, BookOpenCheck } from "lucide-react";
import { CourseCard } from "@/components/dashboard/course-card";
import { CourseListItem } from "@/components/dashboard/course-list-item";
import { ScheduleCard } from "@/components/dashboard/schedule-card";
import { ProductivityChart } from "@/components/dashboard/productivity-chart";
import { useAuth } from "@/hooks/useAuth";

const topCourses = [
  {
    level: "Beginner" as const,
    title: "Curso de Introducción a Python",
    description: "Aprende fundamentos de lógica y programación aplicada a ciencia de datos.",
    students: 118,
    lessons: 50,
    rating: 5.0,
    mentor: "Alison Walsh",
    thumbnail: "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=900&q=80",
  },
  {
    level: "Beginner" as const,
    title: "Guía de Gestión Empresarial: Análisis de Negocios",
    description: "Modelos de negocio modernos, hojas de ruta y herramientas colaborativas.",
    students: 234,
    lessons: 32,
    rating: 4.8,
    mentor: "Patty Kutch",
    thumbnail: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=900&q=80",
  },
  {
    level: "Intermediate" as const,
    title: "Teoría de Probabilidad y Matemáticas Aplicadas",
    description: "Domina razonamiento estadístico con casos aplicados a finanzas.",
    students: 57,
    lessons: 45,
    rating: 4.9,
    mentor: "Alonzo Murray",
    thumbnail: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80",
  },
  {
    level: "Advanced" as const,
    title: "Introducción: Machine Learning e Implementación de LLM",
    description: "Proyectos guiados con transformers y despliegues serverless.",
    students: 19,
    lessons: 39,
    rating: 5.0,
    mentor: "Gregory Harris",
    thumbnail: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80",
  },
];

const myCourses = [
  {
    title: "AI & Realidad Virtual",
    sessions: "9/12",
    thumbnail: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=400&q=80",
    avatars: [
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=200&q=80",
      "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=200&q=80",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      "https://images.unsplash.com/photo-1544005313-35dd01b8c83c?auto=format&fit=crop&w=200&q=80",
    ],
  },
  {
    title: "Fotografía",
    sessions: "16/24",
    thumbnail: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=400&q=80",
    avatars: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80",
      "https://images.unsplash.com/photo-1546525848-3ce03ca516f6?auto=format&fit=crop&w=200&q=80",
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=200&q=80",
    ],
  },
  {
    title: "Ecosistema de Negocios: Introducción",
    sessions: "11/18",
    thumbnail: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=400&q=80",
    avatars: [
      "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=200&q=80",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
    ],
  },
  {
    title: "Desarrollo con React Native",
    sessions: "18/37",
    thumbnail: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=400&q=80",
    avatars: [
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=200&q=80",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
      "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=200&q=80",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80",
    ],
  },
];

const scheduleItems = [
  {
    type: "Curso",
    title: "Análisis de Prospectos de Negocio",
    date: "Abril 25",
    time: "11:00 - 12:00",
  },
  {
    type: "Tutoría",
    title: "AI & Realidad Virtual: Intro",
    date: "Abril 27",
    time: "14:30 - 15:30",
  },
];

const stats = [
  {
    label: "Puntuación",
    value: "210",
    delta: "+13%",
    icon: Activity,
    accent: "bg-brand-primary/10 text-brand-primary",
    deltaColor: "text-brand-success",
  },
  {
    label: "Cursos Completados",
    value: "34h",
    delta: "+15%",
    icon: BookOpenCheck,
    accent: "bg-brand-secondary/10 text-brand-secondary",
    deltaColor: "text-brand-success",
  },
  {
    label: "Total Estudiantes",
    value: "17",
    delta: "-2%",
    icon: Users,
    accent: "bg-brand-primary/10 text-brand-primary",
    deltaColor: "text-brand-error",
  },
  {
    label: "Total Horas",
    value: "11",
    delta: "+9%",
    icon: Clock3,
    accent: "bg-brand-secondary/10 text-brand-secondary",
    deltaColor: "text-brand-success",
  },
];

const productivityData = [
  { day: "Lun", mentoring: 45, selfImprove: 32, student: 60 },
  { day: "Mar", mentoring: 60, selfImprove: 54, student: 72 },
  { day: "Mié", mentoring: 52, selfImprove: 48, student: 80 },
  { day: "Jue", mentoring: 70, selfImprove: 42, student: 90 },
  { day: "Vie", mentoring: 66, selfImprove: 58, student: 95 },
  { day: "Sáb", mentoring: 40, selfImprove: 30, student: 55 },
  { day: "Dom", mentoring: 30, selfImprove: 22, student: 48 },
];

const calendarWeeks = [
  [null, null, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11, 12],
  [13, 14, 15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24, 25, 26],
  [27, 28, 29, 30, null, null, null],
];

// Datos de clases por día con maestros que darán clase
const classesPerDay: Record<number, { teachers: { name: string; avatar: string }[] }> = {
  24: {
    teachers: [
      { name: "Carlos Mendoza", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80" },
      { name: "María García", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80" },
      { name: "Juan López", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  27: {
    teachers: [
      { name: "Ana Martínez", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80" },
      { name: "Roberto Sánchez", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  28: {
    teachers: [
      { name: "Laura Torres", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  29: {
    teachers: [
      { name: "Pedro Ramírez", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80" },
      { name: "Sofia Herrera", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" },
      { name: "Diego Flores", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80" },
      { name: "Elena Ruiz", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80" },
    ],
  },
};

const eventDays = new Set(Object.keys(classesPerDay).map(Number));

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState<number>(28); // Día seleccionado por defecto

  // Get current date info
  const now = new Date();
  const weekday = now.toLocaleDateString('es-ES', { weekday: 'long' });
  const fullDate = now.toLocaleDateString('es-ES', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  // Obtener maestros del día seleccionado
  const selectedDayTeachers = classesPerDay[selectedDay]?.teachers || [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* Main Content - Two Columns */}
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left Column - Main Content */}
        <div className="flex-1 space-y-8">
          {/* Top Courses Section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Cursos recomendados para ti</h2>
              <button className="text-sm font-medium text-brand-secondary">Ver todos</button>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
          {topCourses.map((course, idx) => (
            <CourseCard key={course.title} {...course} priority={idx === 0} />
              ))}
            </div>
          </section>

          {/* My Courses Section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Mis Cursos</h2>
              <button className="text-sm font-medium text-brand-secondary">Ver todos</button>
            </div>
            <div className="space-y-4">
              {myCourses.map((course) => (
                <CourseListItem key={course.title} {...course} />
              ))}
            </div>
          </section>
        </div>

        {/* Right Column - Sidebar Widgets */}
        <div className="w-full space-y-6 lg:max-w-sm">
          {/* Calendar Widget */}
          <section className="rounded-3xl bg-white p-5 shadow-card-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 capitalize">{weekday}</p>
                <p className="text-xl font-semibold text-slate-900 capitalize">{fullDate}</p>
              </div>
              {/* Avatares de maestros del día seleccionado */}
              {selectedDayTeachers.length > 0 ? (
                <div className="flex -space-x-2">
                  {selectedDayTeachers.slice(0, 3).map((teacher, index) => (
                    <Image
                      key={teacher.name}
                      src={teacher.avatar}
                      alt={teacher.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                      title={teacher.name}
                    />
                  ))}
                  {selectedDayTeachers.length > 3 && (
                    <div className="h-10 w-10 rounded-full bg-slate-100 ring-2 ring-white flex items-center justify-center text-sm font-semibold text-brand-primary">
                      +{selectedDayTeachers.length - 3}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-400 italic">Sin clases</div>
              )}
            </div>
            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Abril 2024</span>
                <div className="flex gap-2 text-slate-400">
                  <button className="rounded-full border border-slate-200 p-1">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="rounded-full border border-slate-200 p-1">
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
                {calendarWeeks.flatMap((week, rowIndex) =>
                  week.map((day, columnIndex) => {
                    if (!day) {
                      return <span key={`${rowIndex}-${columnIndex}`} className="h-9 w-9" />;
                    }

                    const isSelected = day === selectedDay;
                    const hasEvent = eventDays.has(day);

                    return (
                      <button
                        key={`${rowIndex}-${columnIndex}-${day}`}
                        onClick={() => setSelectedDay(day)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                          isSelected 
                            ? "bg-brand-secondary text-white" 
                            : hasEvent 
                              ? "text-slate-700 hover:bg-brand-secondary/10" 
                              : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span>{day}</span>
                          {hasEvent && (
                            <span 
                              className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                                isSelected ? "bg-white" : "bg-brand-secondary"
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
          </section>

          {/* Schedule Cards */}
          <section className="space-y-3">
            {scheduleItems.map((item) => (
              <ScheduleCard key={item.title} {...item} />
            ))}
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

          {/* Productivity Chart */}
          <section className="rounded-3xl bg-white p-5 shadow-card-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Productividad</h3>
                <p className="text-sm text-slate-500">Actividad semanal</p>
              </div>
              <button className="text-sm font-medium text-brand-secondary">Ver detalles</button>
            </div>
            <ProductivityChart data={productivityData} />
          </section>
        </div>
      </div>
    </div>
  );
}
