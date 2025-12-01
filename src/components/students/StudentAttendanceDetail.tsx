"use client";

import { useState, useEffect } from "react";
import { LessonAttendance } from "@/types/attendance";
import { Lesson } from "@/types/lesson";
import {
  IconVideo,
  IconClock,
  IconCheck,
  IconX,
  IconClipboardList,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";
import { lessonRepository } from "@/lib/repositories/lessonRepository";

interface StudentAttendanceDetailProps {
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
}

export default function StudentAttendanceDetail({
  studentId,
  studentName,
  courseId,
  courseTitle,
}: StudentAttendanceDetailProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attendance, setAttendance] = useState<LessonAttendance[]>([]);

  useEffect(() => {
    if (expanded && lessons.length === 0) {
      loadData();
    }
  }, [expanded]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar lecciones del curso desde Supabase
      const lessonsData = await lessonRepository.findByCourseId(courseId);
      setLessons(lessonsData);

      // Cargar asistencia del estudiante
      const { data: attendanceData } = await supabaseClient
        .from(TABLES.LESSON_ATTENDANCE)
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', studentId);
      
      const attendance = (attendanceData || []).map((a: any) => ({
        id: a.id,
        lessonId: a.lesson_id,
        studentId: a.student_id,
        courseId: a.course_id,
        attendedLive: a.attended_live,
        totalLiveMinutes: a.total_live_minutes || 0,
        completedEntrySurvey: a.completed_entry_survey,
        completedExitSurvey: a.completed_exit_survey,
        livePollsAnswered: a.live_polls_answered || 0,
        totalLivePolls: a.total_live_polls || 0,
      })) as LessonAttendance[];
      setAttendance(attendance);
    } catch (error) {
      console.error("Error loading attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceForLesson = (lessonId: string): LessonAttendance | undefined => {
    return attendance.find((a) => a.lessonId === lessonId);
  };

  // Calcular totales
  const totalLessons = lessons.length;
  const attendedLessons = attendance.filter((a) => a.attendedLive).length;
  const totalLiveMinutes = attendance.reduce((sum, a) => sum + (a.totalLiveMinutes || 0), 0);
  const completedEntrySurveys = attendance.filter((a) => a.completedEntrySurvey).length;
  const completedExitSurveys = attendance.filter((a) => a.completedExitSurvey).length;
  const totalLivePollsAnswered = attendance.reduce(
    (sum, a) => sum + (a.livePollsAnswered || 0),
    0
  );
  const totalLivePolls = attendance.reduce((sum, a) => sum + (a.totalLivePolls || 0), 0);

  return (
    <div className="border border-base-300 rounded-lg overflow-hidden">
      {/* Header colapsable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 bg-base-200 hover:bg-base-300 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <IconClipboardList size={20} />
          <span className="font-semibold">Ver Detalle de Asistencia</span>
        </div>
        {expanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
      </button>

      {/* Contenido expandible */}
      {expanded && (
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resumen general */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stat bg-base-200 rounded-lg p-3">
                  <div className="stat-title text-xs">Asistencias</div>
                  <div className="stat-value text-lg">
                    {attendedLessons}/{totalLessons}
                  </div>
                  <div className="stat-desc">Lecciones en vivo</div>
                </div>

                <div className="stat bg-base-200 rounded-lg p-3">
                  <div className="stat-title text-xs">Tiempo Total</div>
                  <div className="stat-value text-lg">{totalLiveMinutes} min</div>
                  <div className="stat-desc">En transmisiones</div>
                </div>

                <div className="stat bg-base-200 rounded-lg p-3">
                  <div className="stat-title text-xs">Encuestas Entrada</div>
                  <div className="stat-value text-lg">
                    {completedEntrySurveys}/{totalLessons}
                  </div>
                  <div className="stat-desc">Completadas</div>
                </div>

                <div className="stat bg-base-200 rounded-lg p-3">
                  <div className="stat-title text-xs">Encuestas Salida</div>
                  <div className="stat-value text-lg">
                    {completedExitSurveys}/{totalLessons}
                  </div>
                  <div className="stat-desc">Completadas</div>
                </div>
              </div>

              {/* Participación en encuestas en vivo */}
              <div className="alert alert-info text-white">
                <IconClipboardList size={20} />
                <div>
                  <div className="font-semibold text-white">Participación en Encuestas en Vivo</div>
                  <div className="text-sm text-white">
                    {totalLivePollsAnswered}/{totalLivePolls} encuestas respondidas
                    {totalLivePolls > 0 &&
                      ` (${Math.round((totalLivePollsAnswered / totalLivePolls) * 100)}%)`}
                  </div>
                </div>
              </div>

              {/* Detalle por lección */}
              <div>
                <h4 className="font-semibold mb-3">Detalle por Lección</h4>
                <div className="space-y-2">
                  {lessons.map((lesson) => {
                    const att = getAttendanceForLesson(lesson.id);
                    return (
                      <div
                        key={lesson.id}
                        className="card bg-base-100 border border-base-300"
                      >
                        <div className="card-body p-4">
                          <h5 className="font-semibold text-sm mb-3">{lesson.title}</h5>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            {/* Asistencia en vivo */}
                            <div className="flex items-center gap-2">
                              {att?.attendedLive ? (
                                <IconCheck size={16} className="text-success" />
                              ) : (
                                <IconX size={16} className="text-error" />
                              )}
                              <div>
                                <div className="text-xs text-base-content/60">En vivo</div>
                                <div className="font-medium">
                                  {att?.attendedLive ? "Asistió" : "No asistió"}
                                </div>
                              </div>
                            </div>

                            {/* Tiempo en vivo */}
                            <div className="flex items-center gap-2">
                              <IconClock size={16} className="text-info" />
                              <div>
                                <div className="text-xs text-base-content/60">Tiempo</div>
                                <div className="font-medium">
                                  {att?.totalLiveMinutes || 0} min
                                </div>
                              </div>
                            </div>

                            {/* Encuestas */}
                            <div className="flex items-center gap-2">
                              <IconClipboardList size={16} className="text-warning" />
                              <div>
                                <div className="text-xs text-base-content/60">Encuestas</div>
                                <div className="font-medium">
                                  {att?.completedEntrySurvey ? "✓" : "✗"} Entrada{" "}
                                  {att?.completedExitSurvey ? "✓" : "✗"} Salida
                                </div>
                              </div>
                            </div>

                            {/* Polls en vivo */}
                            <div className="flex items-center gap-2">
                              <IconVideo size={16} className="text-accent" />
                              <div>
                                <div className="text-xs text-base-content/60">Polls en vivo</div>
                                <div className="font-medium">
                                  {att?.livePollsAnswered || 0}/{att?.totalLivePolls || 0}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {lessons.length === 0 && (
                    <div className="text-center py-8 text-base-content/60">
                      No hay lecciones en este curso
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
