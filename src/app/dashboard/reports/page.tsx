"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader } from "@/components/common/Loader";
import { PDFDownloadLink } from "@react-pdf/renderer";
import StudentReportPDF from "@/components/reports/StudentReportPDF";
import {
  IconFileAnalytics,
  IconDownload,
  IconUsers,
  IconCertificate,
  IconCalendar,
} from "@tabler/icons-react";

interface Course {
  id: string;
  title: string;
  description?: string;
  createdAt: any;
  lessonIds?: string[];
}

interface Lesson {
  id: string;
  title: string;
  order: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  state?: string;
  age?: number;
  birthDate?: string;
  gender?: string;
  hasCertificate: boolean;
  enrolledAt: string;
}

export default function ReportsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [updatingCertificate, setUpdatingCertificate] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const coursesSnapshot = await getDocs(collection(db, "courses"));
      const coursesData = coursesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Course[];
      setCourses(coursesData.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error("Error loading courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsByCourse = async (courseId: string) => {
    setLoadingStudents(true);
    setShowReport(false);

    try {
      // Obtener inscripciones del curso
      const enrollmentsQuery = query(
        collection(db, "enrollments"),
        where("courseId", "==", courseId)
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);

      // Obtener datos de cada estudiante
      const studentsPromises = enrollmentsSnapshot.docs.map(async (enrollDoc) => {
        const enrollment = enrollDoc.data();
        const studentId = enrollment.studentId;

        // Obtener datos del estudiante
        const studentQuery = query(
          collection(db, "users"),
          where("__name__", "==", studentId)
        );
        const studentSnapshot = await getDocs(studentQuery);

        if (studentSnapshot.empty) {
          return null;
        }

        const studentData = studentSnapshot.docs[0].data();

        // Calcular edad desde dateOfBirth
        let calculatedAge: number | undefined = undefined;
        const dateOfBirth = studentData.dateOfBirth;
        if (dateOfBirth) {
          const birthDate = new Date(dateOfBirth);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          calculatedAge = age;
        }

        // Traducir género a español
        const genderValue = studentData.gender || studentData.sexo || "";
        let genderInSpanish = "";
        if (genderValue.toLowerCase() === "male" || genderValue.toLowerCase() === "masculino") {
          genderInSpanish = "Masculino";
        } else if (genderValue.toLowerCase() === "female" || genderValue.toLowerCase() === "femenino") {
          genderInSpanish = "Femenino";
        } else if (genderValue) {
          genderInSpanish = genderValue;
        }

        // Verificar si descargó certificado
        const certificateDownloadsQuery = query(
          collection(db, "certificateDownloads"),
          where("courseId", "==", courseId),
          where("studentId", "==", studentId)
        );
        const certificateDownloadsSnapshot = await getDocs(certificateDownloadsQuery);
        const hasCertificate = !certificateDownloadsSnapshot.empty;

        // Concatenar nombre completo
        const fullName = [studentData.name, studentData.lastName]
          .filter(Boolean)
          .join(" ") || "N/A";

        return {
          id: studentId,
          name: fullName,
          email: studentData.email || "N/A",
          phone: studentData.phone || studentData.phoneNumber || "",
          state: studentData.state || studentData.estado || "",
          age: calculatedAge,
          birthDate: dateOfBirth || "",
          gender: genderInSpanish,
          hasCertificate,
          enrolledAt: enrollment.enrolledAt?.toDate
            ? enrollment.enrolledAt.toDate().toLocaleDateString("es-MX")
            : "N/A",
        } as Student;
      });

      const studentsData = (await Promise.all(studentsPromises)).filter(
        (s): s is Student => s !== null
      );

      setStudents(studentsData);
      setShowReport(true);
    } catch (error) {
      console.error("Error loading students:", error);
      alert("Error al cargar estudiantes");
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadLessonsByCourse = async (courseId: string) => {
    setLoadingLessons(true);
    setLessons([]);
    setSelectedLesson("");

    try {
      const courseDoc = await getDocs(
        query(collection(db, "courses"), where("__name__", "==", courseId))
      );

      if (!courseDoc.empty) {
        const courseData = courseDoc.docs[0].data();
        if (courseData.lessonIds && courseData.lessonIds.length > 0) {
          const lessonsPromises = courseData.lessonIds.map(async (lessonId: string) => {
            const lessonDoc = await getDocs(
              query(collection(db, "lessons"), where("__name__", "==", lessonId))
            );
            if (!lessonDoc.empty) {
              return {
                id: lessonDoc.docs[0].id,
                ...lessonDoc.docs[0].data(),
              } as Lesson;
            }
            return null;
          });

          const lessonsData = (await Promise.all(lessonsPromises))
            .filter((l): l is Lesson => l !== null)
            .sort((a, b) => a.order - b.order);

          setLessons(lessonsData);
        }
      }
    } catch (error) {
      console.error("Error loading lessons:", error);
    } finally {
      setLoadingLessons(false);
    }
  };

  const handleCourseSelect = (courseId: string) => {
    setSelectedCourse(courseId);
    setSelectedLesson("");
    setStudents([]);
    setShowReport(false);

    if (courseId) {
      loadLessonsByCourse(courseId);
      loadStudentsByCourse(courseId);
    } else {
      setLessons([]);
    }
  };

  const handleLessonSelect = (lessonId: string) => {
    setSelectedLesson(lessonId);
    if (lessonId && selectedCourse) {
      loadStudentsByLesson(selectedCourse, lessonId);
    } else if (selectedCourse) {
      loadStudentsByCourse(selectedCourse);
    }
  };

  const loadStudentsByLesson = async (courseId: string, lessonId: string) => {
    // Para reportes por lección, mostramos TODOS los estudiantes inscritos al curso
    // La lección solo sirve para organizar el reporte
    await loadStudentsByCourse(courseId);
  };

  const handleCertificateStatusChange = async (
    studentId: string,
    studentName: string,
    studentEmail: string,
    newStatus: boolean
  ) => {
    if (!selectedCourse) return;

    setUpdatingCertificate(studentId);
    try {
      if (newStatus) {
        // Crear registro de descarga
        await addDoc(collection(db, "certificateDownloads"), {
          courseId: selectedCourse,
          studentId: studentId,
          studentName: studentName,
          studentEmail: studentEmail,
          downloadedAt: new Date().toISOString(),
          manuallyMarked: true, // Indicar que fue marcado manualmente
        });
      } else {
        // Eliminar registro de descarga
        const downloadsQuery = query(
          collection(db, "certificateDownloads"),
          where("courseId", "==", selectedCourse),
          where("studentId", "==", studentId)
        );
        const downloadsSnapshot = await getDocs(downloadsQuery);

        for (const downloadDoc of downloadsSnapshot.docs) {
          await deleteDoc(doc(db, "certificateDownloads", downloadDoc.id));
        }
      }

      // Actualizar el estado local
      setStudents((prevStudents) =>
        prevStudents.map((student) =>
          student.id === studentId
            ? { ...student, hasCertificate: newStatus }
            : student
        )
      );
    } catch (error) {
      console.error("Error updating certificate status:", error);
      alert("Error al actualizar el estado del certificado");
    } finally {
      setUpdatingCertificate(null);
    }
  };

  if (loading) {
    return <Loader />;
  }

  const selectedCourseData = courses.find((c) => c.id === selectedCourse);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <IconFileAnalytics size={40} />
          Reportes
        </h1>
        <p className="text-base-content/70">
          Genera reportes en PDF de estudiantes inscritos por curso
        </p>
      </div>

      {/* Selector de Curso */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title mb-4">Seleccionar Curso</h2>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Curso</span>
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => handleCourseSelect(e.target.value)}
              className="select select-bordered w-full"
            >
              <option value="">Selecciona un curso...</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Lección (solo si el curso tiene lecciones) */}
          {lessons.length > 0 && (
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text font-semibold">
                  Filtrar por Lección (Opcional)
                </span>
              </label>
              <select
                value={selectedLesson}
                onChange={(e) => handleLessonSelect(e.target.value)}
                className="select select-bordered w-full"
                disabled={loadingLessons || loadingStudents}
              >
                <option value="">Todas las lecciones (reporte del curso completo)</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
              {selectedLesson && (
                <label className="label">
                  <span className="label-text-alt text-info">
                    El reporte mostrará todos los estudiantes inscritos al curso con el nombre de esta lección
                  </span>
                </label>
              )}
            </div>
          )}

          {loadingLessons && (
            <div className="flex items-center justify-center py-4">
              <span className="loading loading-spinner loading-md text-primary"></span>
              <span className="ml-3">Cargando lecciones...</span>
            </div>
          )}

          {loadingStudents && (
            <div className="flex items-center justify-center py-8">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <span className="ml-3">Cargando estudiantes...</span>
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      {showReport && !loadingStudents && (
        <>
          <div className="stats shadow w-full mb-6">
            <div className="stat">
              <div className="stat-figure text-primary">
                <IconUsers size={32} />
              </div>
              <div className="stat-title">Total Estudiantes</div>
              <div className="stat-value text-primary">{students.length}</div>
              <div className="stat-desc">Inscritos en el curso</div>
            </div>

            <div className="stat">
              <div className="stat-figure text-success">
                <IconCertificate size={32} />
              </div>
              <div className="stat-title">Con Certificado</div>
              <div className="stat-value text-success">
                {students.filter((s) => s.hasCertificate).length}
              </div>
              <div className="stat-desc">Descargaron certificado</div>
            </div>

            <div className="stat">
              <div className="stat-figure text-warning">
                <IconCalendar size={32} />
              </div>
              <div className="stat-title">Sin Certificado</div>
              <div className="stat-value text-warning">
                {students.filter((s) => !s.hasCertificate).length}
              </div>
              <div className="stat-desc">Pendientes</div>
            </div>
          </div>

          {/* Tabla de Estudiantes */}
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h2 className="card-title">Estudiantes Inscritos</h2>
                {selectedCourseData && students.length > 0 && (
                  <PDFDownloadLink
                    document={
                      <StudentReportPDF
                        courseTitle={selectedCourseData.title}
                        students={students}
                        generatedDate={new Date().toLocaleDateString("es-MX", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        lessonTitle={
                          selectedLesson
                            ? lessons.find((l) => l.id === selectedLesson)?.title
                            : undefined
                        }
                      />
                    }
                    fileName={
                      selectedLesson
                        ? `reporte-leccion-${lessons
                            .find((l) => l.id === selectedLesson)
                            ?.title.replace(/\s+/g, "-")
                            .toLowerCase()}.pdf`
                        : `reporte-${selectedCourseData.title
                            .replace(/\s+/g, "-")
                            .toLowerCase()}.pdf`
                    }
                    className="btn btn-error text-white gap-2"
                  >
                    {({ loading }) =>
                      loading ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          Generando...
                        </>
                      ) : (
                        <>
                          <IconDownload size={20} />
                          Descargar PDF
                        </>
                      )
                    }
                  </PDFDownloadLink>
                )}
              </div>

              {students.length === 0 ? (
                <div className="text-center py-12">
                  <IconUsers size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-base-content/70">
                    No hay estudiantes inscritos en este curso
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Edad</th>
                        <th>F. Nacimiento</th>
                        <th>Estado</th>
                        <th>Sexo</th>
                        <th>F. Inscripción</th>
                        <th>Certificado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id}>
                          <td className="font-semibold">{student.name}</td>
                          <td>{student.email}</td>
                          <td>{student.phone || "N/A"}</td>
                          <td>{student.age || "N/A"}</td>
                          <td>{student.birthDate || "N/A"}</td>
                          <td>{student.state || "N/A"}</td>
                          <td>{student.gender || "N/A"}</td>
                          <td>{student.enrolledAt}</td>
                          <td>
                            <select
                              value={student.hasCertificate ? "completado" : "pendiente"}
                              onChange={(e) =>
                                handleCertificateStatusChange(
                                  student.id,
                                  student.name,
                                  student.email,
                                  e.target.value === "completado"
                                )
                              }
                              disabled={updatingCertificate === student.id}
                              className={`select select-sm w-full max-w-xs ${
                                student.hasCertificate
                                  ? "select-success"
                                  : "select-warning"
                              }`}
                            >
                              <option value="pendiente">Pendiente</option>
                              <option value="completado">Completado</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Estado Inicial */}
      {!selectedCourse && !loadingStudents && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-primary mb-4 flex justify-center">
              <IconFileAnalytics size={64} stroke={2} />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Selecciona un Curso
            </h2>
            <p className="text-base-content/70">
              Elige un curso del menú superior para ver el reporte de estudiantes inscritos
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
