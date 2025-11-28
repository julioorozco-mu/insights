"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  IconX,
  IconMail,
  IconEye,
  IconClock,
  IconSend,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";

// Función helper para formatear fecha/hora manteniendo la hora original
const formatDateTimeLocal = (isoString: string): { date: string; time: string } => {
  const date = new Date(isoString);
  
  // Obtener componentes de fecha en UTC (para mantener la hora original)
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  
  // Crear nueva fecha con esos componentes como hora local
  const localDate = new Date(year, month, day, hours, minutes);
  
  const dateStr = localDate.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const timeStr = localDate.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  
  return { date: dateStr, time: timeStr };
};

interface Student {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface Speaker {
  id: string;
  name: string;
  photoURL?: string;
  role?: string;
}

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId?: string;
  courseId: string;
  lessonTitle: string;
  courseTitle?: string;
  lessonType: string; // 'Lección' o 'Curso'
  sessionDate?: string;
  bannerUrl?: string;
  speakers?: Speaker[];
  userId: string; // ID del admin que envía
}

export function ReminderModal({
  isOpen,
  onClose,
  lessonId,
  courseId,
  lessonTitle,
  courseTitle,
  lessonType,
  sessionDate,
  bannerUrl,
  speakers,
  userId,
}: ReminderModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [allPlatformStudents, setAllPlatformStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [sendResult, setSendResult] = useState<{
    sentCount: number;
    failedCount: number;
    total: number;
  } | null>(null);
  
  // Estados para programar envío
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  
  // Tab de estudiantes
  const [studentTab, setStudentTab] = useState<'course' | 'all'>('course');

  useEffect(() => {
    if (isOpen) {
      loadStudents();
    }
  }, [isOpen, courseId]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      // Cargar estudiantes del curso
      const enrollmentsQuery = query(
        collection(db, "enrollments"),
        where("courseId", "==", courseId)
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);

      const courseStudentsData: Student[] = [];
      for (const enrollDoc of enrollmentsSnapshot.docs) {
        const enrollment = enrollDoc.data();
        const userDoc = await getDoc(doc(db, "users", enrollment.studentId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          courseStudentsData.push({
            id: enrollment.studentId,
            name: userData.name || enrollment.studentName || "Sin nombre",
            email: userData.email || enrollment.studentEmail,
            avatarUrl: userData.avatarUrl,
          });
        }
      }

      setStudents(courseStudentsData);

      // Cargar todos los estudiantes de la plataforma
      const allStudentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student")
      );
      const allStudentsSnapshot = await getDocs(allStudentsQuery);

      const allStudentsData: Student[] = [];
      for (const userDoc of allStudentsSnapshot.docs) {
        const userData = userDoc.data();
        allStudentsData.push({
          id: userDoc.id,
          name: userData.name || "Sin nombre",
          email: userData.email,
          avatarUrl: userData.avatarUrl,
        });
      }

      setAllPlatformStudents(allStudentsData);
    } catch (error) {
      console.error("Error cargando estudiantes:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const getCurrentStudentsList = () => {
    return studentTab === 'course' ? students : allPlatformStudents;
  };

  const toggleSelectAll = () => {
    const currentList = getCurrentStudentsList();
    if (selectedStudents.size === currentList.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(currentList.map(s => s.id)));
    }
  };

  const handlePreview = () => {
    let formattedDate = 'Lunes 4 de noviembre de 2024';
    let formattedTime = '10:00 AM';
    
    if (sessionDate) {
      const formatted = formatDateTimeLocal(sessionDate);
      formattedDate = formatted.date;
      formattedTime = formatted.time;
    }

    const speakersJSON = speakers ? encodeURIComponent(JSON.stringify(speakers)) : '';

    const previewUrl = `/api/preview-reminder?studentName=Estudiante de Ejemplo&lessonType=${encodeURIComponent(lessonType)}&lessonTitle=${encodeURIComponent(lessonTitle)}&courseTitle=${encodeURIComponent(courseTitle || '')}&sessionDate=${encodeURIComponent(formattedDate)}&sessionTime=${encodeURIComponent(formattedTime)}&bannerUrl=${encodeURIComponent(bannerUrl || '')}&lessonUrl=https://www.epolitica.com.mx/dashboard/lessons/${lessonId || courseId}&speakers=${speakersJSON}`;

    window.open(previewUrl, "_blank");
  };

  const handleSend = async () => {
    if (selectedStudents.size === 0) {
      alert("Por favor selecciona al menos un estudiante");
      return;
    }

    setSending(true);
    try {
      let formattedDate = 'Fecha por confirmar';
      let formattedTime = 'Hora por confirmar';
      
      if (sessionDate) {
        const formatted = formatDateTimeLocal(sessionDate);
        formattedDate = formatted.date;
        formattedTime = formatted.time;
      }

      const response = await fetch("/api/send-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId,
          courseId,
          lessonTitle,
          courseTitle,
          lessonType,
          sessionDate: formattedDate,
          sessionTime: formattedTime,
          bannerUrl,
          lessonUrl: `https://www.epolitica.com.mx/dashboard/lessons/${lessonId || courseId}`,
          recipientIds: Array.from(selectedStudents),
          speakers,
          createdBy: userId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSendResult({
          sentCount: data.sentCount,
          failedCount: data.failedCount,
          total: data.total,
        });
        setShowResult(true);
      } else {
        alert(`Error al enviar correos: ${data.error}`);
      }
    } catch (error) {
      console.error("Error enviando correos:", error);
      alert("Error al enviar correos");
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async () => {
    if (selectedStudents.size === 0) {
      alert("Por favor selecciona al menos un estudiante");
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      alert("Por favor indica fecha y hora de envío");
      return;
    }

    setScheduling(true);
    try {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

      let formattedDate = 'Fecha por confirmar';
      let formattedTime = 'Hora por confirmar';
      
      if (sessionDate) {
        const formatted = formatDateTimeLocal(sessionDate);
        formattedDate = formatted.date;
        formattedTime = formatted.time;
      }

      const response = await fetch("/api/send-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId,
          courseId,
          lessonTitle,
          courseTitle,
          lessonType,
          sessionDate: formattedDate,
          sessionTime: formattedTime,
          bannerUrl,
          lessonUrl: `https://www.epolitica.com.mx/dashboard/lessons/${lessonId || courseId}`,
          recipientIds: Array.from(selectedStudents),
          speakers,
          scheduledDate: scheduledDateTime,
          createdBy: userId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Correo programado exitosamente");
        onClose();
      } else {
        alert(`Error al programar correo: ${data.error}`);
      }
    } catch (error) {
      console.error("Error programando correo:", error);
      alert("Error al programar correo");
    } finally {
      setScheduling(false);
    }
  };

  const handleClose = () => {
    setShowResult(false);
    setSendResult(null);
    setSelectedStudents(new Set());
    setScheduleMode(false);
    setScheduledDate("");
    setScheduledTime("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-base-300">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <IconMail size={28} className="text-primary" />
                Enviar Recordatorio
              </h2>
              <p className="text-sm text-base-content/70 mt-1">{lessonTitle}</p>
            </div>
            <button onClick={handleClose} className="btn btn-ghost btn-sm btn-circle">
              <IconX size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showResult ? (
            // Resultado del envío
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-success text-success-content rounded-full mb-4">
                <IconCheck size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-2">Correos Enviados</h3>
              <p className="text-lg mb-6">
                Se enviaron <strong>{sendResult?.sentCount}</strong> de{" "}
                <strong>{sendResult?.total}</strong> correos exitosamente
              </p>
              {sendResult && sendResult.failedCount > 0 && (
                <div className="alert alert-warning mb-4">
                  <IconAlertCircle size={20} />
                  <span>{sendResult.failedCount} correos fallaron</span>
                </div>
              )}
              <button onClick={handleClose} className="btn btn-primary">
                Cerrar
              </button>
            </div>
          ) : (
            <>
              {/* Toggle: Envío inmediato vs programado */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setScheduleMode(false)}
                  className={`btn flex-1 ${!scheduleMode ? 'btn-primary' : 'btn-outline'}`}
                >
                  <IconSend size={20} />
                  Enviar Ahora
                </button>
                <button
                  onClick={() => setScheduleMode(true)}
                  className={`btn flex-1 ${scheduleMode ? 'btn-primary' : 'btn-outline'}`}
                >
                  <IconClock size={20} />
                  Programar Envío
                </button>
              </div>

              {/* Programar fecha y hora */}
              {scheduleMode && (
                <div className="bg-base-200 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold mb-3">Fecha y hora de envío</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Fecha</span>
                      </label>
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="input input-bordered"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Hora</span>
                      </label>
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="input input-bordered"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs de estudiantes */}
              <div className="tabs tabs-bordered mb-4">
                <button
                  onClick={() => {
                    setStudentTab('course');
                    setSelectedStudents(new Set());
                  }}
                  className={`tab ${studentTab === 'course' ? 'tab-active' : ''}`}
                >
                  Inscritos al Curso ({students.length})
                </button>
                <button
                  onClick={() => {
                    setStudentTab('all');
                    setSelectedStudents(new Set());
                  }}
                  className={`tab ${studentTab === 'all' ? 'tab-active' : ''}`}
                >
                  Todos los Estudiantes ({allPlatformStudents.length})
                </button>
              </div>

              {/* Lista de estudiantes */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">
                    Estudiantes ({selectedStudents.size} de {getCurrentStudentsList().length} seleccionados)
                  </h3>
                  <button
                    onClick={toggleSelectAll}
                    className="btn btn-sm btn-outline"
                  >
                    {selectedStudents.size === getCurrentStudentsList().length ? "Deseleccionar todos" : "Seleccionar todos"}
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <span className="loading loading-spinner loading-lg"></span>
                  </div>
                ) : getCurrentStudentsList().length === 0 ? (
                  <div className="text-center py-8 text-base-content/60">
                    {studentTab === 'course' 
                      ? "No hay estudiantes inscritos en este curso"
                      : "No hay estudiantes en la plataforma"}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-base-300 rounded-lg p-2">
                    {getCurrentStudentsList().map((student) => (
                      <label
                        key={student.id}
                        className="flex items-center gap-3 p-3 hover:bg-base-200 rounded-lg cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student.id)}
                          onChange={() => toggleStudent(student.id)}
                          className="checkbox checkbox-primary"
                        />
                        <div className="avatar placeholder">
                          <div className="bg-primary text-white rounded-full w-10">
                            {student.avatarUrl ? (
                              <img src={student.avatarUrl} alt={student.name} />
                            ) : (
                              <span className="text-lg">{student.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-base-content/60">{student.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!showResult && (
          <div className="p-6 border-t border-base-300 flex justify-between">
            <button
              onClick={handlePreview}
              className="btn btn-outline gap-2"
              disabled={sending || scheduling}
            >
              <IconEye size={20} />
              Ver Preview
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="btn btn-ghost"
                disabled={sending || scheduling}
              >
                Cancelar
              </button>
              {scheduleMode ? (
                <button
                  onClick={handleSchedule}
                  className="btn btn-primary gap-2"
                  disabled={scheduling || selectedStudents.size === 0}
                >
                  {scheduling ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Programando...
                    </>
                  ) : (
                    <>
                      <IconClock size={20} />
                      Programar ({selectedStudents.size})
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  className="btn btn-primary gap-2"
                  disabled={sending || selectedStudents.size === 0}
                >
                  {sending ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <IconSend size={20} />
                      Enviar ({selectedStudents.size})
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
