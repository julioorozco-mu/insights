"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader } from "@/components/common/Loader";
import AgoraStream from "@/components/live/AgoraStream";
import { 
  IconBook, 
  IconPlayerPlay,
  IconCheck,
  IconLock,
  IconClock,
  IconVideo,
  IconChevronDown,
  IconChevronUp,
  IconFileText,
  IconBroadcast
} from "@tabler/icons-react";

interface Course {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  lessonIds?: string[];
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  type: 'video' | 'livestream' | 'hybrid';
  videoUrl?: string;
  isLive?: boolean;
  agoraChannel?: string;
  agoraAppId?: string;
  liveStatus?: 'idle' | 'active' | 'ended';
  durationMinutes?: number;
  order: number;
}

export default function StudentCoursePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadCourseData = async () => {
      if (!user) return;

      try {
        // Cargar curso
        const courseDoc = await getDoc(doc(db, 'courses', params.id as string));
        if (!courseDoc.exists()) {
          router.push('/dashboard/available-courses');
          return;
        }

        const courseData = {
          id: courseDoc.id,
          ...courseDoc.data(),
        } as Course;
        setCourse(courseData);

        // Verificar inscripción
        const enrollmentQuery = query(
          collection(db, 'enrollments'),
          where('courseId', '==', params.id),
          where('studentId', '==', user.id)
        );
        const enrollmentSnapshot = await getDocs(enrollmentQuery);
        setIsEnrolled(!enrollmentSnapshot.empty);

        if (enrollmentSnapshot.empty) {
          alert('No estás inscrito en este curso');
          router.push('/dashboard/available-courses');
          return;
        }

        // Cargar lecciones
        if (courseData.lessonIds && courseData.lessonIds.length > 0) {
          const lessonsPromises = courseData.lessonIds.map(async (lessonId) => {
            const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
            if (lessonDoc.exists()) {
              return {
                id: lessonDoc.id,
                ...lessonDoc.data(),
              } as Lesson;
            }
            return null;
          });

          const lessonsData = (await Promise.all(lessonsPromises))
            .filter((l): l is Lesson => l !== null)
            .sort((a, b) => a.order - b.order);
          
          setLessons(lessonsData);
          
          // Seleccionar primera lección por defecto
          if (lessonsData.length > 0) {
            setSelectedLesson(lessonsData[0]);
          }
        }
      } catch (error) {
        console.error('Error loading course:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [params.id, user, router]);

  // Obtener token de Agora cuando se selecciona una lección en vivo
  useEffect(() => {
    const fetchAgoraToken = async () => {
      if (!selectedLesson || !selectedLesson.isLive || !selectedLesson.agoraChannel || !user) {
        setAgoraToken(null);
        return;
      }

      try {
        const numericUid = Math.abs(user.id.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0));
        const tokenRes = await fetch(
          `/api/agora-token?channel=${selectedLesson.agoraChannel}&uid=${numericUid}&role=audience`
        );
        const tokenData = await tokenRes.json();
        setAgoraToken(tokenData.token);
      } catch (error) {
        console.error('Error fetching Agora token:', error);
      }
    };

    fetchAgoraToken();
  }, [selectedLesson, user]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="max-w-7xl mx-auto py-6">
      <button onClick={() => router.back()} className="btn btn-ghost mb-6">
        ← Volver a Mis Cursos
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reproductor de Video */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-0">
              {selectedLesson ? (
                <>
                  {/* Video Player */}
                  <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
                    {selectedLesson.isLive && selectedLesson.agoraChannel && selectedLesson.agoraAppId && agoraToken && user ? (
                      <AgoraStream
                        channel={selectedLesson.agoraChannel}
                        role="audience"
                        token={agoraToken}
                        uid={Math.abs(user.id.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0))}
                        appId={selectedLesson.agoraAppId}
                      />
                    ) : selectedLesson.videoUrl ? (
                      <video
                        src={selectedLesson.videoUrl}
                        controls
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-white">
                          <IconVideo size={64} className="mx-auto mb-4 opacity-50" />
                          <p>No hay video disponible para esta lección</p>
                          {selectedLesson.type === 'livestream' && !selectedLesson.isLive && (
                            <p className="text-sm mt-2 opacity-70">
                              El livestream aún no ha comenzado
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Información de la Lección */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-2">{selectedLesson.title}</h2>
                        <div className="flex items-center gap-2 mb-4">
                          {selectedLesson.type === 'video' && (
                            <div className="badge badge-info">Video Grabado</div>
                          )}
                          {selectedLesson.type === 'livestream' && (
                            <div className="badge badge-error">Livestream</div>
                          )}
                          {selectedLesson.type === 'hybrid' && (
                            <div className="badge badge-warning">Híbrido</div>
                          )}
                          {selectedLesson.durationMinutes && (
                            <div className="flex items-center gap-1 text-sm">
                              <IconClock size={16} />
                              {selectedLesson.durationMinutes} min
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedLesson.description && (
                      <div className="mb-4">
                        <h3 className="font-semibold mb-2">Descripción:</h3>
                        <p className="text-base-content/70">{selectedLesson.description}</p>
                      </div>
                    )}

                    {selectedLesson.isLive && (
                      <div className="alert alert-success">
                        <IconPlayerPlay size={20} />
                        <span>Esta clase está en vivo ahora. ¡Únete!</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <IconBook size={64} className="mx-auto mb-4 text-base-content/40" />
                    <p className="text-base-content/60">Selecciona una lección para comenzar</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Lecciones */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-xl sticky top-4">
            <div className="card-body">
              <h3 className="card-title mb-4">{course.title}</h3>
              
              {lessons.length === 0 ? (
                <div className="text-center py-8 text-base-content/50">
                  <IconBook size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay lecciones disponibles</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lessons.map((lesson, index) => (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedLesson?.id === lesson.id
                          ? 'bg-primary text-primary-content'
                          : 'bg-base-200 hover:bg-base-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {lesson.isLive ? (
                            <div className="badge badge-error badge-sm">LIVE</div>
                          ) : (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              selectedLesson?.id === lesson.id
                                ? 'bg-primary-content text-primary'
                                : 'bg-base-300'
                            }`}>
                              {index + 1}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm line-clamp-2">
                            {lesson.title}
                          </div>
                          {lesson.durationMinutes && (
                            <div className="flex items-center gap-1 text-xs opacity-70 mt-1">
                              <IconClock size={12} />
                              {lesson.durationMinutes} min
                            </div>
                          )}
                        </div>
                        {lesson.isLive && (
                          <IconPlayerPlay size={16} className="flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
