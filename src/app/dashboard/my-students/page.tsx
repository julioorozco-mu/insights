"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { attendanceService } from "@/lib/services/attendanceService";
import { Loader } from "@/components/common/Loader";
import { formatDate } from "@/utils/formatDate";
import { 
  IconSchool, 
  IconMail, 
  IconBook,
  IconCalendar,
  IconChartBar,
  IconClock,
  IconCheck,
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconVideo,
  IconClipboardList,
} from "@tabler/icons-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LessonAttendance } from "@/types/attendance";
import { Lesson } from "@/types/lesson";
import StudentAttendanceDetail from "@/components/students/StudentAttendanceDetail";

interface Student {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  enrolledCourses: {
    courseId: string;
    courseTitle: string;
    enrolledAt: string;
    progress: number;
  }[];
}

interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  enrolledAt: any;
  progress: number;
  completedLessons: string[];
}

export default function MyStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    const loadMyStudents = async () => {
      if (!user) return;

      try {
        // 1. Obtener cursos donde el usuario es speaker
        const myCourses = await courseRepository.findBySpeaker(user.id);
        const myCourseIds = myCourses.map(c => c.id);

        if (myCourseIds.length === 0) {
          setLoading(false);
          return;
        }

        // 2. Obtener todas las inscripciones de esos cursos
        const enrollmentsQuery = query(
          collection(db, 'enrollments'),
          where('courseId', 'in', myCourseIds)
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        
        const enrollments = enrollmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Enrollment[];

        // 3. Agrupar por estudiante
        const studentsMap = new Map<string, Student>();

        enrollments.forEach(enrollment => {
          const course = myCourses.find(c => c.id === enrollment.courseId);
          
          if (!studentsMap.has(enrollment.studentId)) {
            studentsMap.set(enrollment.studentId, {
              id: enrollment.studentId,
              name: enrollment.studentName || 'Sin nombre',
              email: enrollment.studentEmail,
              enrolledCourses: [],
            });
          }

          const student = studentsMap.get(enrollment.studentId)!;
          student.enrolledCourses.push({
            courseId: enrollment.courseId,
            courseTitle: course?.title || 'Curso desconocido',
            enrolledAt: enrollment.enrolledAt?.toDate?.()?.toISOString() || enrollment.enrolledAt,
            progress: enrollment.progress || 0,
          });
        });

        setStudents(Array.from(studentsMap.values()));
      } catch (error) {
        console.error("Error loading students:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMyStudents();
  }, [user]);

  const filteredStudents = students.filter((student) => {
    const search = searchTerm.toLowerCase();
    return (
      student.name.toLowerCase().includes(search) ||
      student.email.toLowerCase().includes(search) ||
      student.enrolledCourses.some(c => c.courseTitle.toLowerCase().includes(search))
    );
  });

  const totalEnrollments = students.reduce((acc, s) => acc + s.enrolledCourses.length, 0);
  const averageProgress = students.length > 0
    ? students.reduce((acc, s) => {
        const studentAvg = s.enrolledCourses.reduce((sum, c) => sum + c.progress, 0) / s.enrolledCourses.length;
        return acc + studentAvg;
      }, 0) / students.length
    : 0;

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Mis Estudiantes</h1>
          <p className="text-base-content/70">
            Estudiantes inscritos en tus cursos
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="stats shadow w-full mb-8">
        <div className="stat">
          <div className="stat-figure text-primary">
            <IconSchool size={32} />
          </div>
          <div className="stat-title">Total Estudiantes</div>
          <div className="stat-value text-primary">{students.length}</div>
          <div className="stat-desc">En tus cursos</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <IconBook size={32} />
          </div>
          <div className="stat-title">Total Inscripciones</div>
          <div className="stat-value text-secondary">{totalEnrollments}</div>
          <div className="stat-desc">Suma de todos los cursos</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-accent">
            <IconChartBar size={32} />
          </div>
          <div className="stat-title">Progreso Promedio</div>
          <div className="stat-value text-accent">{averageProgress.toFixed(0)}%</div>
          <div className="stat-desc">De todos los estudiantes</div>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre, email o curso..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input input-bordered w-full max-w-md"
        />
      </div>

      {filteredStudents.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-primary mb-4 flex justify-center">
              <IconSchool size={64} stroke={2} />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {searchTerm 
                ? "No se encontraron estudiantes" 
                : students.length === 0
                  ? "Aún no tienes estudiantes"
                  : "No hay estudiantes"}
            </h2>
            <p className="text-base-content/70 mb-4">
              {searchTerm 
                ? "Intenta con otro término de búsqueda" 
                : "Los estudiantes aparecerán aquí cuando se inscriban en tus cursos"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredStudents.map((student) => (
            <div key={student.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Avatar */}
                    <div className="avatar placeholder">
                      <div className="bg-primary text-primary-content rounded-full w-16">
                        <span className="text-2xl text-white">
                          {student.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Información del estudiante */}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1">
                        {student.name} {student.lastName || ''}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-base-content/70 mb-3">
                        <IconMail size={16} />
                        {student.email}
                      </div>

                      {/* Cursos inscritos */}
                      <div className="space-y-2">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <IconBook size={16} />
                          Cursos Inscritos ({student.enrolledCourses.length})
                        </div>
                        {student.enrolledCourses.map((course) => (
                          <div 
                            key={course.courseId} 
                            className="bg-base-200 p-3 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{course.courseTitle}</span>
                              <div className="badge badge-primary badge-sm text-white">
                                {course.progress}% completado
                              </div>
                            </div>
                            
                            {/* Barra de progreso */}
                            <div className="w-full bg-base-300 rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${course.progress}%` }}
                              />
                            </div>
                            
                            <div className="flex items-center gap-1 text-xs text-base-content/60 mt-2">
                              <IconCalendar size={12} />
                              Inscrito: {formatDate(course.enrolledAt)}
                            </div>

                            {/* Detalle de asistencia */}
                            <div className="mt-3">
                              <StudentAttendanceDetail
                                studentId={student.id}
                                studentName={student.name}
                                courseId={course.courseId}
                                courseTitle={course.courseTitle}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Estadísticas del estudiante */}
                  <div className="stats stats-vertical shadow">
                    <div className="stat py-2 px-4">
                      <div className="stat-title text-xs">Cursos</div>
                      <div className="stat-value text-2xl">{student.enrolledCourses.length}</div>
                    </div>
                    <div className="stat py-2 px-4">
                      <div className="stat-title text-xs">Progreso</div>
                      <div className="stat-value text-2xl">
                        {(student.enrolledCourses.reduce((acc, c) => acc + c.progress, 0) / student.enrolledCourses.length).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación (placeholder) */}
      {filteredStudents.length > 0 && (
        <div className="flex justify-center mt-6">
          <div className="join">
            <button className="join-item btn btn-sm">«</button>
            <button className="join-item btn btn-sm btn-active">1</button>
            <button className="join-item btn btn-sm">»</button>
          </div>
        </div>
      )}
    </div>
  );
}
