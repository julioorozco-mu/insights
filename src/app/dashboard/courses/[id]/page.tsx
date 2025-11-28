"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { Course } from "@/types/course";
import { Loader } from "@/components/common/Loader";
import { formatDate } from "@/utils/formatDate";
import { 
  IconPlus,
  IconBook,
  IconTrash,
  IconEdit,
  IconLock,
  IconVideo,
  IconMail
} from "@tabler/icons-react";
import { ReminderModal } from "@/components/ReminderModal";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

interface Speaker {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
}

interface Lesson {
  id: string;
  title: string;
  scheduledDate?: string;
  isLive?: boolean;
  coverImage?: string;
}

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

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolledStudentsCount, setEnrolledStudentsCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const data = await courseRepository.findById(params.id as string);
        setCourse(data);
        
        // Contar estudiantes inscritos
        const enrollmentsQuery = query(
          collection(db, 'enrollments'),
          where('courseId', '==', params.id)
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        setEnrolledStudentsCount(enrollmentsSnapshot.size);
        
        // Cargar información de los speakers
        if (data && data.speakerIds && data.speakerIds.length > 0) {
          const speakersData: Speaker[] = [];
          for (const speakerId of data.speakerIds) {
            const speakerDocRef = doc(db, 'users', speakerId);
            const speakerDoc = await getDoc(speakerDocRef);
            if (speakerDoc.exists()) {
              const speakerData = speakerDoc.data();
              speakersData.push({
                id: speakerId,
                name: speakerData.name || speakerData.email,
                email: speakerData.email,
                photoURL: speakerData.photoURL,
              });
            }
          }
          setSpeakers(speakersData);
        }
        
        // Cargar información de las lecciones
        if (data && data.lessonIds && data.lessonIds.length > 0) {
          const lessonsData: Lesson[] = [];
          for (const lessonId of data.lessonIds) {
            const lessonDocRef = doc(db, 'lessons', lessonId);
            const lessonDoc = await getDoc(lessonDocRef);
            if (lessonDoc.exists()) {
              const lessonData = lessonDoc.data();
              lessonsData.push({
                id: lessonId,
                title: lessonData.title || `Lección ${lessonsData.length + 1}`,
                scheduledDate: lessonData.scheduledDate,
                isLive: lessonData.isLive || false,
                coverImage: lessonData.coverImage,
              });
            }
          }
          setLessons(lessonsData);
        }
      } catch (error) {
        console.error("Error loading course:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [params.id]);

  const handleDeleteCourse = async () => {
    if (!course) return;
    
    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'courses', course.id));
      setShowDeleteModal(false);
      router.push('/dashboard/courses');
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Error al eliminar el curso');
    } finally {
      setDeleting(false);
    }
  };

  const handleDisableCourse = async () => {
    if (!course) return;
    
    try {
      setDisabling(true);
      await updateDoc(doc(db, 'courses', course.id), {
        isActive: false
      });
      setCourse({ ...course, isActive: false });
      setShowDisableModal(false);
    } catch (error) {
      console.error('Error disabling course:', error);
      alert('Error al deshabilitar el curso');
    } finally {
      setDisabling(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Curso no encontrado</h2>
        <button onClick={() => router.back()} className="btn btn-primary text-white">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => router.back()} className="btn btn-ghost mb-6">
        ← Volver
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-xl mb-6">
            {course.coverImageUrl && (
              <figure className="h-64">
                <img
                  src={course.coverImageUrl}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </figure>
            )}
            <div className="card-body">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-3xl font-bold">{course.title}</h1>
                {course.isActive ? (
                  <div className="badge badge-success text-white">Activo</div>
                ) : (
                  <div className="badge badge-warning text-white">Inactivo</div>
                )}
              </div>
              <p className="text-base-content/70 mb-4">{course.description}</p>
              
              {/* Ponentes con avatares */}
              {speakers.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    {speakers.map((speaker) => (
                      <div key={speaker.id} className="flex items-center gap-2 bg-base-200 rounded-full pr-4 py-1">
                        <div className="avatar">
                          <div className="w-8 h-8 rounded-full">
                            {speaker.photoURL ? (
                              <img src={speaker.photoURL} alt={speaker.name} />
                            ) : (
                              <div className="bg-primary text-primary-content flex items-center justify-center w-full h-full text-sm font-bold text-white">
                                {speaker.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-medium">{speaker.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Fecha del evento */}
              {course.startDate && (
                <div className="mb-4 rounded-lg p-4 flex items-center gap-3" style={{ backgroundColor: '#13542a' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  <div>
                    <div className="font-semibold text-white">Fecha del evento</div>
                    <div className="text-sm text-white">
                      {(() => {
                        const { date, time } = formatDateTimeLocal(course.startDate);
                        return `${date}, ${time}`;
                      })()}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-4 text-sm text-base-content/60">
                <span>Creado: {formatDate(course.createdAt)}</span>
                <span>•</span>
                <span>{course.lessonIds?.length || 0} lecciones</span>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h2 className="card-title">Lecciones</h2>
                <Link 
                  href={`/dashboard/courses/${course.id}/lessons/new`}
                  className="btn btn-sm btn-primary text-white gap-2"
                >
                  <IconPlus size={16} />
                  Agregar Lección
                </Link>
              </div>
              {!course.lessonIds || course.lessonIds.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-primary mb-4 flex justify-center">
                    <IconBook size={48} stroke={2} />
                  </div>
                  <p className="text-base-content/70 mb-4">
                    No hay lecciones aún. Agrega contenido a tu curso.
                  </p>
                  <Link 
                    href={`/dashboard/courses/${course.id}/lessons/new`}
                    className="btn btn-primary text-white gap-2"
                  >
                    <IconPlus size={20} />
                    Crear Primera Lección
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {lessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-4 bg-base-200 rounded-lg gap-4"
                    >
                      {/* Portada miniatura */}
                      {(lesson as any).coverImage && (
                        <img 
                          src={(lesson as any).coverImage} 
                          alt={lesson.title}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      
                      <div className="flex items-center gap-3 flex-1">
                        <div className="badge badge-primary text-white">{index + 1}</div>
                        <IconBook size={20} />
                        <div className="flex-1">
                          <span className="font-medium">{lesson.title}</span>
                          {lesson.scheduledDate && (
                            <p className="text-xs text-base-content/60 mt-1">
                              {(() => {
                                const { date, time } = formatDateTimeLocal(lesson.scheduledDate);
                                return `${date}, ${time}`;
                              })()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Botón Enviar Recordatorio - Solo para admin */}
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => {
                              setSelectedLesson(lesson);
                              setShowReminderModal(true);
                            }}
                            className="btn btn-sm btn-primary text-white gap-1"
                            title="Enviar recordatorio"
                          >
                            <IconMail size={16} />
                            Recordatorio
                          </button>
                        )}
                        {/* Botón Iniciar Conferencia - Solo para speakers */}
                        {user?.role === 'speaker' && (
                          <Link
                            href={`/dashboard/lessons/${lesson.id}`}
                            className={`btn btn-sm gap-1 ${
                              lesson.isLive 
                                ? 'btn-error text-white animate-pulse' 
                                : 'btn-success text-white'
                            }`}
                          >
                            <IconVideo size={16} />
                            {lesson.isLive ? 'En Vivo' : 'Iniciar Conferencia'}
                          </Link>
                        )}
                        <Link
                          href={`/dashboard/lessons/${lesson.id}/edit`}
                          className="btn btn-sm btn-ghost gap-1"
                        >
                          <IconEdit size={16} />
                          Editar
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title mb-4">Información</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-base-content/60">Ponentes</p>
                  <p className="font-medium">{course.speakerIds?.length || 0} ponente(s)</p>
                </div>
                {course.durationMinutes && (
                  <div>
                    <p className="text-sm text-base-content/60">Duración</p>
                    <p className="font-medium text-lg">
                      {Math.floor(course.durationMinutes / 60)} horas
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-base-content/60">Estado</p>
                  <p className="font-medium text-white">
                    {course.isActive ? "Activo" : "Inactivo"}
                  </p>
                </div>
              </div>
              <div className="card-actions mt-6 flex-col gap-2">
                <Link href={`/dashboard/courses/${course.id}/manage`} className="btn btn-primary w-full text-white gap-2">
                  <IconEdit size={20} />
                  Gestionar Curso
                </Link>
                
                {/* Botones de Eliminar/Deshabilitar (solo admin) */}
                {user?.role === 'admin' && (
                  <>
                    {enrolledStudentsCount === 0 ? (
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="btn btn-error w-full gap-2 text-white"
                        disabled={deleting}
                      >
                        <IconTrash size={20} />
                        Eliminar Curso
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowDisableModal(true)}
                        className="w-full gap-2 text-white btn"
                        style={{ backgroundColor: '#000000' }}
                        disabled={disabling || !course.isActive}
                      >
                        <IconLock size={20} />
                        {course.isActive ? `Deshabilitar Curso` : 'Curso Deshabilitado'}
                      </button>
                    )}
                  </>
                )}
              </div>
              
              {/* Información adicional para admin */}
              {user?.role === 'admin' && enrolledStudentsCount > 0 && (
                <div className="mt-4 rounded-lg p-4 flex items-start gap-3" style={{ backgroundColor: '#13542a' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <div className="text-sm text-white">
                    <p className="font-semibold ">Estudiantes inscritos: {enrolledStudentsCount}</p>
                    <p className="text-xs">No se puede eliminar un curso con estudiantes inscritos. Puedes deshabilitarlo para ocultarlo de nuevos estudiantes.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación - Eliminar Curso */}
      {showDeleteModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <IconTrash size={24} className="text-error" />
              Eliminar Curso
            </h3>
            <p className="py-4">
              ¿Estás seguro de que deseas eliminar el curso <strong>"{course?.title}"</strong>?
            </p>
            <div className="alert alert-warning mb-4 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span className="text-sm">Esta acción no se puede deshacer. Todos los datos del curso se eliminarán permanentemente.</span>
            </div>
            <div className="modal-action">
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-error text-white" 
                onClick={handleDeleteCourse}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <IconTrash size={20} />
                    Eliminar Curso
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => !deleting && setShowDeleteModal(false)}>
            <button>close</button>
          </div>
        </div>
      )}

      {/* Modal de Confirmación - Deshabilitar Curso */}
      {showDisableModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <IconLock size={24} style={{ color: '#000000' }} />
              Deshabilitar Curso
            </h3>
            <p className="py-4">
              ¿Deseas deshabilitar el curso <strong>"{course?.title}"</strong>?
            </p>
            <div className="mb-4 rounded-lg p-4 flex items-start gap-3" style={{ backgroundColor: '#13542a' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <div className="text-sm text-white">
                <p className="font-semibold mb-1">Estudiantes inscritos: {enrolledStudentsCount}</p>
                <p>El curso ya no será visible para nuevos estudiantes, pero los <strong>{enrolledStudentsCount} estudiantes inscritos</strong> podrán seguir accediendo para ver lecciones y descargar constancias.</p>
              </div>
            </div>
            <div className="modal-action">
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowDisableModal(false)}
                disabled={disabling}
              >
                Cancelar
              </button>
              <button 
                className="btn text-white" 
                style={{ backgroundColor: '#000000' }}
                onClick={handleDisableCourse}
                disabled={disabling}
              >
                {disabling ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Deshabilitando...
                  </>
                ) : (
                  <>
                    <IconLock size={20} />
                    Deshabilitar Curso
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => !disabling && setShowDisableModal(false)}>
            <button>close</button>
          </div>
        </div>
      )}
      
      {/* Modal de Recordatorio */}
      {course && selectedLesson && (
        <ReminderModal
          isOpen={showReminderModal}
          onClose={() => {
            setShowReminderModal(false);
            setSelectedLesson(null);
          }}
          lessonId={selectedLesson.id}
          courseId={course.id}
          lessonTitle={selectedLesson.title}
          courseTitle={course.title}
          lessonType="Lección"
          sessionDate={selectedLesson.scheduledDate}
          bannerUrl={(selectedLesson as any).coverImage || course.coverImageUrl}
          speakers={speakers.map(s => ({
            id: s.id,
            name: s.name,
            photoURL: s.photoURL,
            role: undefined,
          }))}
          userId={user?.id || ''}
        />
      )}
    </div>
  );
}
