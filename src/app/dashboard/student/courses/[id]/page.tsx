"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { lessonRepository } from "@/lib/repositories/lessonRepository";
import { Loader } from "@/components/common/Loader";
import { 
  IconBook, 
  IconPlayerPlay,
  IconClock,
  IconChevronDown,
  IconChevronUp,
  IconFileText,
  IconBroadcast,
  IconVideo,
  IconCertificate,
  IconDownload,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconCalendar,
  IconUser,
  IconEye
} from "@tabler/icons-react";
import { checkCertificateEligibility, getEligibilityMessage } from "@/utils/certificateEligibility";
import { Course as FullCourse } from "@/types/course";
import { convertImageToPngDataUrl } from "@/utils/image";
import CertificateDOM from "@/components/certificate/CertificateDOM";
import { Survey, SurveyResponse } from "@/types/survey";

interface Course {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  speakerName?: string;
  lessonIds?: string[];
  entrySurveyId?: string;
  exitSurveyId?: string;
  certificateTemplateId?: string;
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  type: 'video' | 'livestream' | 'hybrid';
  videoUrl?: string;
  recordedVideoUrl?: string; // URL del video grabado
  isLive?: boolean;
  agoraChannel?: string;
  agoraAppId?: string;
  liveStatus?: 'idle' | 'active' | 'ended';
  durationMinutes?: number;
  order: number;
  resourceIds?: string[];
  startDate?: string;
  endDate?: string;
  scheduledStartTime?: string;
  scheduledDate?: string; // Campo real en Firestore
}

interface Resource {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSize?: number;
}

export default function StudentCoursePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState<FullCourse | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [certificateEligible, setCertificateEligible] = useState(false);
  const [eligibilityReasons, setEligibilityReasons] = useState<string[]>([]);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certificateTemplate, setCertificateTemplate] = useState<any>(null);
  const [pdfCertificateTemplate, setPdfCertificateTemplate] = useState<any>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const certDomRef = useRef<HTMLDivElement | null>(null);
  const [exportSignatures, setExportSignatures] = useState<any[]>([]);
  const [entrySurvey, setEntrySurvey] = useState<Survey | null>(null);
  const [exitSurvey, setExitSurvey] = useState<Survey | null>(null);
  const [entryResponse, setEntryResponse] = useState<SurveyResponse | null>(null);
  const [exitResponse, setExitResponse] = useState<SurveyResponse | null>(null);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [currentSurvey, setCurrentSurvey] = useState<Survey | null>(null);
  const [currentResponse, setCurrentResponse] = useState<SurveyResponse | null>(null);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string | string[]>>({});
  const [submittingSurvey, setSubmittingSurvey] = useState(false);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [lessonSurveyData, setLessonSurveyData] = useState<Record<string, {
    entrySurvey: Survey | null;
    exitSurvey: Survey | null;
    entryResponse: SurveyResponse | null;
    exitResponse: SurveyResponse | null;
    canAnswerEntry: boolean;
    canAnswerExit: boolean;
  }>>({});
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  const [currentLessonResources, setCurrentLessonResources] = useState<any[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewResource, setPreviewResource] = useState<any>(null);
  const [showSurveyResultModal, setShowSurveyResultModal] = useState(false);
  const [surveyResultType, setSurveyResultType] = useState<'success' | 'error'>('success');
  const [surveyResultMessage, setSurveyResultMessage] = useState('');
  const [timeUntilExitSurveyEnabled, setTimeUntilExitSurveyEnabled] = useState<string | null>(null);
  const [enableTimeForExitSurvey, setEnableTimeForExitSurvey] = useState<Date | null>(null);

  useEffect(() => {
    const loadCourseData = async () => {
      if (!user) return;

      try {
        // Cargar curso
        const courseData = await courseRepository.findById(params.id as string);
        if (!courseData) {
          router.push('/dashboard/enrolled-courses');
          return;
        }
        setCourse(courseData);

        // Cargar plantilla de certificado si existe
        if (courseData.certificateTemplateId) {
          const { data: templateDoc } = await supabaseClient
            .from(TABLES.CERTIFICATE_TEMPLATES)
            .select('*')
            .eq('id', courseData.certificateTemplateId)
            .single();
          if (templateDoc) {
            const tpl = {
              id: templateDoc.id,
              title: templateDoc.title,
              description: templateDoc.description,
              backgroundUrl: templateDoc.background_url,
              elements: templateDoc.elements,
              pageSize: templateDoc.page_size,
              orientation: templateDoc.orientation,
              designWidth: templateDoc.design_width,
              designHeight: templateDoc.design_height,
              signatures: templateDoc.signatures,
            } as any;
            setCertificateTemplate(tpl);

            // Helper to convert background via server proxy first
            const toDataUrl = async (url: string): Promise<string> => {
              try {
                const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
                if (res.ok) {
                  const json = await res.json();
                  if (json?.dataUrl) return json.dataUrl as string;
                }
              } catch {}
              try {
                return await convertImageToPngDataUrl(url);
              } catch {
                return url; // as-is
              }
            };

            if (tpl.backgroundUrl) {
              try {
                const dataUrl = await toDataUrl(tpl.backgroundUrl);
                setPdfCertificateTemplate({ ...tpl, backgroundUrl: dataUrl });
              } catch (e) {
                console.warn('No se pudo convertir el fondo del certificado:', e);
                setPdfCertificateTemplate(tpl);
              }
            } else {
              setPdfCertificateTemplate(tpl);
            }
          }
        }

        // Verificar inscripción
        const { data: enrollmentData } = await supabaseClient
          .from(TABLES.STUDENT_ENROLLMENTS)
          .select('id')
          .eq('course_id', params.id)
          .eq('student_id', user.id)
          .limit(1);
        
        if (!enrollmentData || enrollmentData.length === 0) {
          alert('No estás inscrito en este curso');
          router.push('/dashboard/enrolled-courses');
          return;
        }

        // Cargar lecciones
        if (courseData.lessonIds && courseData.lessonIds.length > 0) {
          const lessonsPromises = courseData.lessonIds.map(async (lessonId: string) => {
            const lessonData = await lessonRepository.findById(lessonId);
            if (lessonData) {
              return {
                id: lessonData.id,
                title: lessonData.title,
                description: lessonData.description,
                type: lessonData.type as 'video' | 'livestream' | 'hybrid',
                videoUrl: lessonData.videoUrl,
                recordedVideoUrl: lessonData.recordedVideoUrl,
                isLive: lessonData.isLive,
                agoraChannel: lessonData.agoraChannel,
                agoraAppId: lessonData.agoraAppId,
                liveStatus: lessonData.liveStatus as 'idle' | 'active' | 'ended' | undefined,
                durationMinutes: lessonData.durationMinutes,
                order: lessonData.order || 0,
                resourceIds: lessonData.resourceIds,
                scheduledDate: (lessonData as any).scheduledDate || lessonData.scheduledStartTime,
                entrySurveyId: (lessonData as any).entrySurveyId,
                exitSurveyId: (lessonData as any).exitSurveyId,
              } as Lesson;
            }
            return null;
          });

          const lessonsData = (await Promise.all(lessonsPromises))
            .filter((l): l is Lesson => l !== null)
            .sort((a, b) => a.order - b.order);
          
          setLessons(lessonsData);

          // Cargar encuestas/respuestas por lección y calcular gating
          const map: Record<string, any> = {};
          for (const l of lessonsData) {
            map[l.id] = {
              entrySurvey: null,
              exitSurvey: null,
              entryResponse: null,
              exitResponse: null,
              canAnswerEntry: false,
              canAnswerExit: false,
            };

            // Encuesta de entrada
            if ((l as any).entrySurveyId) {
              const { data: sDoc } = await supabaseClient
                .from(TABLES.SURVEYS)
                .select('*')
                .eq('id', (l as any).entrySurveyId)
                .single();
              if (sDoc) {
                map[l.id].entrySurvey = { id: sDoc.id, title: sDoc.title, type: sDoc.type, questions: sDoc.questions } as Survey;
                const { data: respQ } = await supabaseClient
                  .from(TABLES.SURVEY_RESPONSES)
                  .select('*')
                  .eq('survey_id', sDoc.id)
                  .eq('user_id', user.id)
                  .limit(1);
                if (respQ && respQ.length > 0) {
                  map[l.id].entryResponse = { id: respQ[0].id, surveyId: respQ[0].survey_id, answers: respQ[0].answers } as any;
                }
              }
            }

            // Encuesta de salida
            if ((l as any).exitSurveyId) {
              const { data: sDoc } = await supabaseClient
                .from(TABLES.SURVEYS)
                .select('*')
                .eq('id', (l as any).exitSurveyId)
                .single();
              if (sDoc) {
                map[l.id].exitSurvey = { id: sDoc.id, title: sDoc.title, type: sDoc.type, questions: sDoc.questions } as Survey;
                const { data: respQ } = await supabaseClient
                  .from(TABLES.SURVEY_RESPONSES)
                  .select('*')
                  .eq('survey_id', sDoc.id)
                  .eq('user_id', user.id)
                  .limit(1);
                if (respQ && respQ.length > 0) {
                  map[l.id].exitResponse = { id: respQ[0].id, surveyId: respQ[0].survey_id, answers: respQ[0].answers } as any;
                }
              }
            }
          }

          const computeGating = (base: Record<string, any>) => {
            const sorted = [...lessonsData];
            const requireSequential = !!courseData.certificateRules?.requireSequentialLessons;
            const exitAfterStart = !!courseData.certificateRules?.exitSurveyAfterLessonStart;
            const now = new Date();
            const newMap: Record<string, any> = { ...base };
            let priorDone = true;

            for (const lesson of sorted) {
              const d = newMap[lesson.id] || {
                entrySurvey: null,
                exitSurvey: null,
                entryResponse: null,
                exitResponse: null,
                canAnswerEntry: false,
                canAnswerExit: false,
              };

              let canEntry = !!d.entrySurvey; // hay encuesta
              let canExit = !!d.exitSurvey;   // hay encuesta

              if (requireSequential && !priorDone) {
                canEntry = false;
                canExit = false;
              }

              // Para salida: requiere entrada respondida
              if (d.exitSurvey) {
                canExit = canExit && !!d.entryResponse;
                // La validación de tiempo se hace al momento de enviar, no al habilitar el botón
                // Esto permite ver las preguntas antes de que pase 1 hora
              }

              d.canAnswerEntry = canEntry;
              d.canAnswerExit = canExit;
              newMap[lesson.id] = d;

              console.log(`✅ Resultado lección ${lesson.id}:`, {
                canAnswerEntry: canEntry,
                canAnswerExit: canExit
              });

              // Considerar "completado" si no hay encuestas o si respondió las asignadas
              const prevEntryOk = !d.entrySurvey || !!d.entryResponse;
              const prevExitOk = !d.exitSurvey || !!d.exitResponse;
              priorDone = prevEntryOk && prevExitOk;
            }

            return newMap;
          };

          const finalGating = computeGating(map);
          setLessonSurveyData(finalGating);
        }

        // Cargar ponentes
        if (courseData.speakerIds && courseData.speakerIds.length > 0) {
          const { data: speakersData } = await supabaseClient
            .from(TABLES.USERS)
            .select('id, name, email, avatar_url')
            .in('id', courseData.speakerIds);
          setSpeakers((speakersData || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            avatarUrl: s.avatar_url,
          })));
        }

        // Cargar encuestas de entrada y salida del curso
        console.log('🔍 Buscando encuestas para courseId:', params.id);
        const { data: surveysData } = await supabaseClient
          .from(TABLES.SURVEYS)
          .select('*')
          .eq('course_id', params.id);
        console.log('📊 Encuestas encontradas con courseId:', surveysData?.length || 0);
        
        if (!surveysData || surveysData.length === 0) {
          // Si no hay encuestas con courseId, buscar en el curso las referencias
          console.log('🔍 Buscando encuestas en el documento del curso...');
          if (courseData.entrySurveyId) {
            console.log('📋 Cargando encuesta de entrada:', courseData.entrySurveyId);
            const { data: entryDoc } = await supabaseClient
              .from(TABLES.SURVEYS).select('*').eq('id', courseData.entrySurveyId).single();
            if (entryDoc) {
              setEntrySurvey({ id: entryDoc.id, title: entryDoc.title, type: entryDoc.type, questions: entryDoc.questions } as Survey);
            }
          }
          if (courseData.exitSurveyId) {
            console.log('📋 Cargando encuesta de salida:', courseData.exitSurveyId);
            const { data: exitDoc } = await supabaseClient
              .from(TABLES.SURVEYS).select('*').eq('id', courseData.exitSurveyId).single();
            if (exitDoc) {
              setExitSurvey({ id: exitDoc.id, title: exitDoc.title, type: exitDoc.type, questions: exitDoc.questions } as Survey);
            }
          }
        } else {
          surveysData.forEach((surveyDoc: any) => {
            const surveyData = { id: surveyDoc.id, title: surveyDoc.title, type: surveyDoc.type, questions: surveyDoc.questions } as Survey;
            console.log('📋 Encuesta:', surveyData.title, 'Tipo:', surveyData.type);
            if (surveyData.type === 'entry') {
              setEntrySurvey(surveyData);
            } else if (surveyData.type === 'exit') {
              setExitSurvey(surveyData);
            }
          });
        }

        // Cargar respuestas del estudiante
        const { data: responsesData } = await supabaseClient
          .from(TABLES.SURVEY_RESPONSES)
          .select('*')
          .eq('course_id', params.id)
          .eq('user_id', user.id);
        (responsesData || []).forEach((responseDoc: any) => {
          const responseData = { id: responseDoc.id, surveyId: responseDoc.survey_id, answers: responseDoc.answers } as SurveyResponse;
          
          // Asignar respuesta basándose en el surveyId específico
          if (responseData.surveyId === courseData.entrySurveyId) {
            setEntryResponse(responseData);
          } else if (responseData.surveyId === courseData.exitSurveyId) {
            setExitResponse(responseData);
          }
        });
      } catch (error) {
        console.error('Error loading course:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [params.id, user, router]);

  // Polling para actualizar estado de lecciones (isLive)
  useEffect(() => {
    if (!course?.lessonIds || course.lessonIds.length === 0) return;

    const pollLessons = async () => {
      for (const lessonId of course.lessonIds) {
        const lessonData = await lessonRepository.findById(lessonId);
        if (lessonData) {
          const updatedLesson = {
            id: lessonData.id,
            title: lessonData.title,
            description: lessonData.description,
            type: lessonData.type as 'video' | 'livestream' | 'hybrid',
            videoUrl: lessonData.videoUrl,
            recordedVideoUrl: lessonData.recordedVideoUrl,
            isLive: lessonData.isLive,
            agoraChannel: lessonData.agoraChannel,
            agoraAppId: lessonData.agoraAppId,
            liveStatus: lessonData.liveStatus as 'idle' | 'active' | 'ended' | undefined,
            durationMinutes: lessonData.durationMinutes,
            order: lessonData.order || 0,
            resourceIds: lessonData.resourceIds,
            scheduledDate: (lessonData as any).scheduledDate || lessonData.scheduledStartTime,
            entrySurveyId: (lessonData as any).entrySurveyId,
            exitSurveyId: (lessonData as any).exitSurveyId,
          } as Lesson;
          
          setLessons((prevLessons) =>
            prevLessons.map((l) =>
              l.id === lessonId ? updatedLesson : l
            )
          );
        }
      }
    };

    const interval = setInterval(pollLessons, 5000);
    return () => clearInterval(interval);
  }, [course?.lessonIds]);

  const toggleLesson = (lessonId: string) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  const computeLessonGatingFromState = (base: Record<string, any>) => {
    if (!course) return base;
    const sorted = [...lessons].sort((a, b) => a.order - b.order);
    const requireSequential = !!course.certificateRules?.requireSequentialLessons;
    const exitAfterStart = !!course.certificateRules?.exitSurveyAfterLessonStart;
    const now = new Date();
    const newMap: Record<string, any> = { ...base };
    let priorDone = true;

    for (const lesson of sorted) {
      const d = newMap[lesson.id] || {
        entrySurvey: null,
        exitSurvey: null,
        entryResponse: null,
        exitResponse: null,
        canAnswerEntry: false,
        canAnswerExit: false,
      };

      let canEntry = !!d.entrySurvey;
      let canExit = !!d.exitSurvey;

      if (requireSequential && !priorDone) {
        canEntry = false;
        canExit = false;
      }

      if (d.exitSurvey) {
        // La encuesta de salida solo requiere que se haya respondido la de entrada
        // La validación de tiempo se hace al momento de enviar
        canExit = canExit && !!d.entryResponse;
      }

      d.canAnswerEntry = canEntry;
      d.canAnswerExit = canExit;
      newMap[lesson.id] = d;

      const prevEntryOk = !d.entrySurvey || !!d.entryResponse;
      const prevExitOk = !d.exitSurvey || !!d.exitResponse;
      priorDone = prevEntryOk && prevExitOk;
    }

    return newMap;
  };

  const openSurvey = (lessonId: string | null, survey: Survey, response: SurveyResponse | null) => {
    setCurrentLessonId(lessonId);
    setCurrentSurvey(survey);
    setCurrentResponse(response);
    if (response) {
      // Si ya respondió, cargar las respuestas
      const answersMap: Record<string, string | string[]> = {};
      response.answers.forEach((ans) => {
        answersMap[ans.questionId] = ans.answer;
      });
      setSurveyAnswers(answersMap);
    } else {
      setSurveyAnswers({});
    }
    setShowSurveyModal(true);
    
    // Calcular tiempo restante para encuesta de salida
    if (survey.type === 'exit' && !response) {
      let lessonStartTime: Date | null = null;
      
      if (lessonId) {
        const currentLesson = lessons.find(l => l.id === lessonId);
        if (currentLesson) {
          const startTimeStr = currentLesson.startDate || currentLesson.scheduledStartTime || currentLesson.scheduledDate;
          if (startTimeStr) {
            lessonStartTime = new Date(startTimeStr);
          }
        }
      } else {
        if (course?.startDate) {
          lessonStartTime = new Date(course.startDate);
        }
      }
      
      if (lessonStartTime) {
        const oneHourAfterStart = new Date(lessonStartTime.getTime() + 60 * 60 * 1000);
        setEnableTimeForExitSurvey(oneHourAfterStart);
      }
    }
  };

  const handleSurveyAnswerChange = (questionId: string, answer: string | string[]) => {
    setSurveyAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  // Timer para actualizar tiempo restante cada segundo
  useEffect(() => {
    if (!enableTimeForExitSurvey || !showSurveyModal) {
      setTimeUntilExitSurveyEnabled(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const timeRemaining = enableTimeForExitSurvey.getTime() - now.getTime();

      if (timeRemaining <= 0) {
        setTimeUntilExitSurveyEnabled(null);
        setEnableTimeForExitSurvey(null);
      } else {
        const totalMinutes = Math.floor(timeRemaining / (60 * 1000));
        const days = Math.floor(totalMinutes / (24 * 60));
        const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
        const minutes = totalMinutes % 60;
        
        let timeStr = '';
        
        if (days > 0) {
          // Si hay días: "3 días 14 horas y 30 minutos"
          timeStr = `${days} día${days > 1 ? 's' : ''} ${hours} hora${hours !== 1 ? 's' : ''} y ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
        } else if (hours > 0) {
          // Si hay horas pero no días: "14 horas y 30 minutos"
          timeStr = `${hours} hora${hours !== 1 ? 's' : ''} y ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
        } else {
          // Si solo hay minutos: "30 minutos"
          timeStr = `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
        }
        
        setTimeUntilExitSurveyEnabled(timeStr);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [enableTimeForExitSurvey, showSurveyModal]);

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

  const formatLessonDateTime = (lesson: Lesson): string => {
    if (!lesson.startDate && !lesson.scheduledStartTime && !lesson.scheduledDate) return '';
    
    const startTime = lesson.startDate || lesson.scheduledStartTime || lesson.scheduledDate;
    const startDate = new Date(startTime!);
    
    // Obtener componentes UTC y tratarlos como locales
    const year = startDate.getUTCFullYear();
    const month = startDate.getUTCMonth();
    const day = startDate.getUTCDate();
    const hours = startDate.getUTCHours();
    const minutes = startDate.getUTCMinutes();
    
    const localDate = new Date(year, month, day, hours, minutes);
    
    // Formato de fecha
    const dateStr = localDate.toLocaleDateString('es-MX', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    
    // Si hay fecha de fin, mostrar rango
    if (lesson.endDate) {
      const endDate = new Date(lesson.endDate);
      const endYear = endDate.getUTCFullYear();
      const endMonth = endDate.getUTCMonth();
      const endDay = endDate.getUTCDate();
      const endHours = endDate.getUTCHours();
      const endMinutes = endDate.getUTCMinutes();
      
      const localEndDate = new Date(endYear, endMonth, endDay, endHours, endMinutes);
      
      const endDateStr = localEndDate.toLocaleDateString('es-MX', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
      
      const startTimeStr = localDate.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
      
      const endTimeStr = localEndDate.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
      
      return `${dateStr} - ${endDateStr} • ${startTimeStr} a ${endTimeStr}`;
    } else {
      // Solo fecha de inicio
      const timeStr = localDate.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
      
      return `${dateStr} • ${timeStr}`;
    }
  };

  const handleSubmitSurvey = async () => {
    if (!currentSurvey || !user || !course) return;

    // Validar preguntas requeridas
    const unansweredRequired: string[] = [];
    currentSurvey.questions.forEach((question) => {
      if (question.isRequired) {
        const answer = surveyAnswers[question.id];
        // Verificar si la respuesta está vacía
        if (!answer || 
            (typeof answer === 'string' && answer.trim() === '') ||
            (Array.isArray(answer) && answer.length === 0)) {
          unansweredRequired.push(question.questionText);
        }
      }
    });

    if (unansweredRequired.length > 0) {
      setSurveyResultType('error');
      setSurveyResultMessage(
        `Por favor, completa las siguientes preguntas obligatorias:\n\n${unansweredRequired.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      );
      setShowSurveyResultModal(true);
      return;
    }

    // Validación de tiempo para encuesta de salida (1 hora después del inicio)
    // Solo validar si no ha respondido aún
    if (currentSurvey.type === 'exit' && !currentResponse) {
      const now = new Date();
      let lessonStartTime: Date | null = null;
      
      // Obtener la fecha de inicio de la lección actual
      if (currentLessonId) {
        const currentLesson = lessons.find(l => l.id === currentLessonId);
        if (currentLesson) {
          const startTimeStr = currentLesson.startDate || currentLesson.scheduledStartTime || currentLesson.scheduledDate;
          if (startTimeStr) {
            const dateObj = new Date(startTimeStr);
            // Construir fecha usando componentes UTC para evitar conversión de zona horaria
            const year = dateObj.getUTCFullYear();
            const month = dateObj.getUTCMonth();
            const day = dateObj.getUTCDate();
            const hours = dateObj.getUTCHours();
            const minutes = dateObj.getUTCMinutes();
            lessonStartTime = new Date(year, month, day, hours, minutes);
          }
        }
      } else {
        // Para encuestas a nivel de curso, usar la fecha de inicio del curso
        if (course.startDate) {
          const dateObj = new Date(course.startDate);
          const year = dateObj.getUTCFullYear();
          const month = dateObj.getUTCMonth();
          const day = dateObj.getUTCDate();
          const hours = dateObj.getUTCHours();
          const minutes = dateObj.getUTCMinutes();
          lessonStartTime = new Date(year, month, day, hours, minutes);
        }
      }
      
      if (lessonStartTime) {
        const oneHourAfterStart = new Date(lessonStartTime.getTime() + 60 * 60 * 1000);
        
        if (now < oneHourAfterStart) {
          const timeRemaining = oneHourAfterStart.getTime() - now.getTime();
          const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
          const minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
          
          setSurveyResultType('error');
          setSurveyResultMessage(
            `La encuesta de salida estará disponible 1 hora después del inicio de la lección.\n\n` +
            `Tiempo restante para habilitar la encuesta: ${hoursRemaining}h ${minutesRemaining}m\n` +
            `Se habilita el día de la lección a partir del siguiente horario:\n ${oneHourAfterStart.toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit'
            })}`
          );
          setShowSurveyResultModal(true);
          return;
        }
      }
    }

    setSubmittingSurvey(true);
    try {
      const answers = currentSurvey.questions.map((q) => ({
        questionId: q.id,
        answer: surveyAnswers[q.id] || '',
      }));

      const responseData: any = {
        surveyId: currentSurvey.id,
        userId: user.id,
        userName: user.name,
        courseId: course.id,
        answers,
        submittedAt: new Date().toISOString(),
      };
      
      // Solo agregar lessonId si existe (para encuestas de lección)
      if (currentLessonId) {
        responseData.lessonId = currentLessonId;
      }

      const { data: existingResponse } = await supabaseClient
        .from(TABLES.SURVEY_RESPONSES)
        .select('id')
        .eq('survey_id', currentSurvey.id)
        .eq('user_id', user.id)
        .limit(1);

      if (existingResponse && existingResponse.length > 0) {
        setSurveyResultType('error');
        setSurveyResultMessage('Ya has respondido esta encuesta');
        setShowSurveyResultModal(true);
        setShowSurveyModal(false);
        return;
      }

      const { data: docRef, error: insertError } = await supabaseClient
        .from(TABLES.SURVEY_RESPONSES)
        .insert({
          survey_id: currentSurvey.id,
          user_id: user.id,
          course_id: params.id,
          lesson_id: currentLessonId || null,
          answers: responseData.answers,
          submitted_at: responseData.submittedAt,
        })
        .select('id')
        .single();
      if (insertError) throw insertError;
      
      const newResponse = { id: docRef?.id, ...responseData } as SurveyResponse;
      if (currentLessonId && lessonSurveyData[currentLessonId]) {
        const map = { ...lessonSurveyData } as Record<string, any>;
        const d = { ...(map[currentLessonId] || {}) };
        if (currentSurvey.type === 'entry') {
          d.entryResponse = newResponse;
        } else if (currentSurvey.type === 'exit') {
          d.exitResponse = newResponse;
        }
        map[currentLessonId] = d;
        setLessonSurveyData(computeLessonGatingFromState(map));
      } else {
        // compatibilidad: encuestas a nivel de curso
        if (currentSurvey.type === 'entry') {
          setEntryResponse(newResponse);
        } else if (currentSurvey.type === 'exit') {
          setExitResponse(newResponse);
        }
      }

      setSurveyResultType('success');
      setSurveyResultMessage('¡Encuesta enviada correctamente!');
      setShowSurveyResultModal(true);
      setShowSurveyModal(false);
    } catch (error) {
      console.error('Error submitting survey:', error);
      setSurveyResultType('error');
      setSurveyResultMessage('Error al enviar la encuesta. Por favor, intenta nuevamente.');
      setShowSurveyResultModal(true);
    } finally {
      setSubmittingSurvey(false);
    }
  };

  const handleCheckEligibility = async () => {
    if (!course || !user) return;

    setCheckingEligibility(true);
    try {
      const result = await checkCertificateEligibility(course.id, user.id, course);
      setCertificateEligible(result.eligible);
      setEligibilityReasons(result.reasons);
      setShowCertificateModal(true);
    } catch (error) {
      console.error("Error checking eligibility:", error);
      alert("Error al verificar elegibilidad");
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleOpenResources = async (lesson: Lesson) => {
    if (!lesson.resourceIds || lesson.resourceIds.length === 0) {
      return;
    }

    try {
      const { data: resourcesData } = await supabaseClient
        .from(TABLES.FILE_ATTACHMENTS)
        .select('*')
        .in('id', lesson.resourceIds);
      
      const resources = (resourcesData || []).map((data: any) => ({
        id: data.id,
        title: data.metadata?.title || data.name || 'Sin título',
        fileUrl: data.url,
        fileType: data.type,
        fileName: data.name,
        fileSize: data.size,
      })) as Resource[];
      
      setCurrentLessonResources(resources);
      setShowResourcesModal(true);
    } catch (error) {
      console.error('Error loading resources:', error);
      alert('Error al cargar los recursos');
    }
  };

  const handlePreviewResource = (resource: Resource) => {
    setPreviewResource(resource);
    setShowPreviewModal(true);
  };

  const handleDownloadResource = (resource: Resource) => {
    window.open(resource.fileUrl, '_blank');
  };

  const canPreview = (fileType: string) => {
    return fileType.includes('pdf') || 
           fileType.includes('image') || 
           fileType.includes('video') ||
           fileType.includes('audio');
  };

  if (loading) {
    return <Loader />;
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Curso no encontrado</h2>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <button onClick={() => router.back()} className="btn btn-ghost mb-6">
        ← Volver a Mis Cursos
      </button>

      {/* Header del Curso */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {course.coverImageUrl && (
              <div className="w-full md:w-48 h-48 md:h-32 flex-shrink-0">
                <img
                  src={course.coverImageUrl}
                  alt={course.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{course.title}</h1>
              {course.description && (
                <p className="text-base-content/70 mb-4">{course.description}</p>
              )}

              {/* Información del curso: Ponentes y Fecha */}
              <div className="flex flex-col md:flex-row md:flex-wrap gap-4 md:gap-6 mb-4">
                {/* Ponentes */}
                {speakers.length > 0 && (
                  <div className="flex items-start md:items-center gap-3">
                    <IconUser size={20} className="text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-base-content/60">
                        {speakers.length === 1 ? 'Ponente' : 'Ponentes'}
                      </p>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 mt-1">
                        {speakers.map((speaker) => (
                          <div key={speaker.id} className="flex items-center gap-2">
                            <div className="avatar">
                              <div className="w-8 h-8 rounded-full">
                                {speaker.avatarUrl ? (
                                  <img src={speaker.avatarUrl} alt={speaker.name} />
                                ) : (
                                  <div className="bg-primary text-white flex items-center justify-center w-full h-full text-xs font-semibold">
                                    {speaker.name?.charAt(0)}{speaker.lastName?.charAt(0) || ''}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-medium">
                              {speaker.name} {speaker.lastName || ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Fecha y Hora */}
                {course.startDate && (
                  <div className="flex items-start md:items-center gap-3">
                    <IconCalendar size={20} className="text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-base-content/60">Fecha del curso</p>
                      <p className="text-sm font-medium mt-1">
                        {(() => {
                          const { date } = formatDateTimeLocal(course.startDate);
                          return date;
                        })()}
                        {course.endDate && (
                          <>
                            {' - '}
                            {(() => {
                              const endDate = new Date(course.endDate);
                              const year = endDate.getUTCFullYear();
                              const month = endDate.getUTCMonth();
                              const day = endDate.getUTCDate();
                              const localEndDate = new Date(year, month, day);
                              return localEndDate.toLocaleDateString('es-MX', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              });
                            })()}
                          </>
                        )}
                      </p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <IconClock size={16} />
                        {formatDateTimeLocal(course.startDate).time}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Botón de Certificado */}
              {course.certificateTemplateId && (
                <button
                  onClick={handleCheckEligibility}
                  disabled={checkingEligibility}
                  className="btn btn-primary text-white gap-2 mt-4 w-full md:w-auto"
                >
                  {checkingEligibility ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Verificando...
                    </>
                  ) : (
                    <>
                      <IconCertificate size={20} />
                      Descargar Certificado
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Lecciones */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">Lecciones del Curso</h2>
        
        {lessons.length === 0 ? (
          <div className="text-center py-12">
            <IconBook size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-base-content/70">No hay lecciones disponibles</p>
          </div>
        ) : (
          lessons.map((lesson, index) => {
            const isExpanded = expandedLessons.has(lesson.id);
            
            return (
              <div key={lesson.id} className="card bg-base-100 shadow-xl">
                {/* Portada de la lección */}
                {(lesson as any).coverImage && (
                  <figure>
                    <img 
                      src={(lesson as any).coverImage} 
                      alt={lesson.title}
                      className="w-full h-48 object-cover"
                    />
                  </figure>
                )}
                
                <div className="card-body">
                  {/* Header de la Lección */}
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleLesson(lesson.id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="badge badge-lg">{index + 1}</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{lesson.title}</h3>
                        <div className="flex flex-col gap-2 mt-2 sm:flex-row sm:items-center sm:gap-2">
                          {/* Badges y tipo */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {lesson.type === 'video' && (
                              <div className="badge badge-info badge-sm text-white">Video Grabado</div>
                            )}
                            {lesson.type === 'livestream' && (
                              <div className="badge badge-error badge-sm text-white">Livestream</div>
                            )}
                            {lesson.isLive && (
                              <div className="badge badge-success badge-sm gap-1 text-white">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                                EN VIVO
                              </div>
                            )}
                          </div>
                          
                          {/* Duración y Fecha en líneas separadas en móvil */}
                          <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                            {lesson.durationMinutes && (
                              <div className="flex items-center gap-1 text-sm text-base-content/60">
                                <IconClock size={16} />
                                <span>{lesson.durationMinutes} min</span>
                              </div>
                            )}
                            {formatLessonDateTime(lesson) && (
                              <div className="flex items-center gap-1 text-sm text-base-content/60">
                                <IconCalendar size={16} />
                                <span>{formatLessonDateTime(lesson)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm btn-circle">
                      {isExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                    </button>
                  </div>

                  {/* Contenido Expandido */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-base-300">
                      {lesson.description && (
                        <p className="text-base-content/70 mb-4">{lesson.description}</p>
                      )}

                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-2">
                        {/* Botón Ver Video Grabado - Prioridad si existe recordedVideoUrl */}
                        {(lesson.recordedVideoUrl || (!lesson.isLive && lesson.videoUrl)) && (
                          <Link
                            href={`/dashboard/student/courses/${params.id}/livestream/${lesson.id}`}
                            className="btn btn-sm btn-primary text-white gap-2 w-full sm:w-auto"
                          >
                            <IconVideo size={18} />
                            <span className="text-xs sm:text-sm">Ver Video</span>
                          </Link>
                        )}

                        {/* Botón Unirse a Conferencia (solo si está en vivo y NO hay video grabado) */}
                        {lesson.isLive && !lesson.recordedVideoUrl && (
                          <Link
                            href={`/dashboard/student/courses/${params.id}/livestream/${lesson.id}`}
                            className="btn btn-sm btn-error text-white gap-2 w-full sm:w-auto animate-pulse"
                          >
                            <IconBroadcast size={18} />
                            <span className="text-xs sm:text-sm">Unirse a Conferencia</span>
                          </Link>
                        )}
                        
                        {/* No disponible solo si no hay video grabado ni streaming en vivo */}
                        {!lesson.recordedVideoUrl && !lesson.isLive && !lesson.videoUrl && (
                          <button className="btn btn-sm btn-disabled gap-2 w-full sm:w-auto">
                            <IconVideo size={18} />
                            <span className="text-xs sm:text-sm">No disponible</span>
                          </button>
                        )}

                        {/* Botón Recursos */}
                        <button 
                          className="btn btn-sm btn-outline gap-2 w-full sm:w-auto"
                          onClick={() => handleOpenResources(lesson)}
                          disabled={!lesson.resourceIds || lesson.resourceIds.length === 0}
                        >
                          <IconFileText size={18} />
                          <span className="text-xs sm:text-sm">Recursos {lesson.resourceIds && lesson.resourceIds.length > 0 && `(${lesson.resourceIds.length})`}</span>
                        </button>

                        {/* Botón Encuesta de Entrada (lección o curso) */}
                        {(() => {
                          const ls = lessonSurveyData[lesson.id];
                          // Usar encuesta de lección o del curso
                          const survey = ls?.entrySurvey || entrySurvey;
                          const response = ls?.entryResponse || entryResponse;
                          
                          if (survey) {
                            const responded = !!response;
                            // Si es encuesta de lección, verificar canAnswerEntry
                            // Si es encuesta de curso, siempre habilitada
                            const disabled = !responded && ls?.entrySurvey && !ls.canAnswerEntry;
                            return (
                              <button
                                onClick={() => openSurvey(ls?.entrySurvey ? lesson.id : null, survey, response)}
                                disabled={disabled}
                                className={`btn btn-sm gap-2 w-full sm:w-auto ${responded ? 'btn-success' : 'btn-info'} text-white`}
                              >
                                <IconFileText size={18} />
                                <span className="text-xs sm:text-sm">{responded ? 'Ver Encuesta de Entrada' : 'Encuesta de Entrada'}</span>
                              </button>
                            );
                          }
                          return null;
                        })()}

                        {/* Botón Encuesta de Salida (lección o curso) */}
                        {(() => {
                          const ls = lessonSurveyData[lesson.id];
                          // Usar encuesta de lección o del curso
                          const survey = ls?.exitSurvey || exitSurvey;
                          const response = ls?.exitResponse || exitResponse;
                          
                          if (survey) {
                            const responded = !!response;
                            // Para encuesta de curso, requiere que haya respondido la de entrada
                            const needsEntry = !ls?.exitSurvey && exitSurvey && !entryResponse;
                            // Si es encuesta de lección, verificar canAnswerExit
                            const disabled = !responded && (needsEntry || (ls?.exitSurvey && !ls.canAnswerExit));
                            return (
                              <button
                                onClick={() => openSurvey(ls?.exitSurvey ? lesson.id : null, survey, response)}
                                disabled={disabled}
                                className={`btn btn-sm gap-2 w-full sm:w-auto ${responded ? 'btn-success' : 'btn-warning'} text-white`}
                              >
                                <IconFileText size={18} />
                                <span className="text-xs sm:text-sm">{responded ? 'Ver Encuesta de Salida' : 'Encuesta de Salida'}</span>
                              </button>
                            );
                          }
                          return null;
                        })()}
                        
                        {/* Mensaje si no hay encuestas */}
                        {(() => {
                          const ls = lessonSurveyData[lesson.id];
                          const hasAnyEntry = ls?.entrySurvey || entrySurvey;
                          const hasAnyExit = ls?.exitSurvey || exitSurvey;
                          
                          if (!hasAnyEntry && !hasAnyExit) {
                            return (
                              <div className="text-sm text-base-content/60 italic w-full sm:w-auto">
                                Esta lección no tiene encuestas
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Encuesta */}
      {showSurveyModal && currentSurvey && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowSurveyModal(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
              <IconX size={20} />
            </button>

            {/* Timer para encuesta de salida */}
            {currentSurvey.type === 'exit' && !currentResponse && timeUntilExitSurveyEnabled && (
              <div className="alert alert-warning mb-4 flex items-center gap-3">
                <div>
                  <p className="font-semibold text-white">Podrás completar la encuesta en : {timeUntilExitSurveyEnabled}</p>
                </div>
              </div>
            )}

            <h3 className="font-bold text-2xl mb-2">{currentSurvey.title}</h3>
            {currentSurvey.description && (
              <p className="text-base-content/70 mb-6">{currentSurvey.description}</p>
            )}

            {currentResponse ? (
              /* Modo visualización - Ya respondió */
              <div className="space-y-6">
                {currentSurvey.questions.map((question, index) => {
                  const answer = surveyAnswers[question.id];
                  return (
                    <div key={question.id} className="card bg-base-200 p-4">
                      <p className="font-semibold mb-3">
                        {index + 1}. {question.questionText}
                        {question.isRequired && <span className="text-error ml-1">*</span>}
                      </p>

                      {(question.type === 'short_text' || question.type === 'text') && (
                        <div className="p-3 bg-base-100 rounded">
                          {answer || '(Sin respuesta)'}
                        </div>
                      )}

                      {question.type === 'long_text' && (
                        <div className="p-3 bg-base-100 rounded whitespace-pre-wrap">
                          {answer || '(Sin respuesta)'}
                        </div>
                      )}

                      {question.type === 'single_choice' && (
                        <div className="space-y-2">
                          {question.options?.map((option) => (
                            <div key={option.value} className="flex items-center gap-2">
                              <input
                                type="radio"
                                checked={answer === option.value}
                                disabled
                                className="radio radio-sm"
                              />
                              <span className={answer === option.value ? 'font-semibold' : ''}>
                                {option.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type === 'multiple_choice' && (
                        <div className="space-y-2">
                          {question.options?.map((option) => (
                            <div key={option.value} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={Array.isArray(answer) && answer.includes(option.value)}
                                disabled
                                className="checkbox checkbox-sm"
                              />
                              <span className={Array.isArray(answer) && answer.includes(option.value) ? 'font-semibold' : ''}>
                                {option.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type === 'dropdown' && (
                        <div className="p-3 bg-base-100 rounded">
                          {question.options?.find(o => o.value === answer)?.label || answer || '(Sin respuesta)'}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="alert alert-success text-white">
                  <IconCheck size={24} />
                  <span>Ya has respondido esta encuesta</span>
                </div>
              </div>
            ) : (
              /* Modo respuesta - Aún no ha respondido */
              <div className="space-y-6">
                {currentSurvey.questions.map((question, index) => (
                  <div key={question.id} className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">
                        {index + 1}. {question.questionText}
                        {question.isRequired && <span className="text-error ml-1">*</span>}
                      </span>
                    </label>

                    {(question.type === 'short_text' || question.type === 'text') && (
                      <input
                        type="text"
                        value={(surveyAnswers[question.id] as string) || ''}
                        onChange={(e) => handleSurveyAnswerChange(question.id, e.target.value)}
                        className="input input-bordered"
                        placeholder="Tu respuesta"
                      />
                    )}

                    {question.type === 'long_text' && (
                      <textarea
                        value={(surveyAnswers[question.id] as string) || ''}
                        onChange={(e) => handleSurveyAnswerChange(question.id, e.target.value)}
                        className="textarea textarea-bordered h-24"
                        placeholder="Tu respuesta"
                      />
                    )}

                    {question.type === 'single_choice' && (
                      <div className="space-y-2 mt-2">
                        {question.options?.map((option) => (
                          <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={question.id}
                              value={option.value}
                              checked={surveyAnswers[question.id] === option.value}
                              onChange={(e) => handleSurveyAnswerChange(question.id, e.target.value)}
                              className="radio"
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {question.type === 'multiple_choice' && (
                      <div className="space-y-2 mt-2">
                        {question.options?.map((option) => (
                          <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Array.isArray(surveyAnswers[question.id]) && (surveyAnswers[question.id] as string[]).includes(option.value)}
                              onChange={(e) => {
                                const current = (surveyAnswers[question.id] as string[]) || [];
                                const newValue = e.target.checked
                                  ? [...current, option.value]
                                  : current.filter((v) => v !== option.value);
                                handleSurveyAnswerChange(question.id, newValue);
                              }}
                              className="checkbox"
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {question.type === 'dropdown' && (
                      <select
                        value={(surveyAnswers[question.id] as string) || ''}
                        onChange={(e) => handleSurveyAnswerChange(question.id, e.target.value)}
                        className="select select-bordered"
                      >
                        <option value="">Selecciona una opción</option>
                        {question.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Caso por defecto para tipos no reconocidos */}
                    {!['short_text', 'text', 'long_text', 'single_choice', 'multiple_choice', 'dropdown', 'number'].includes(question.type as string) && (
                      <div className="alert alert-warning">
                        <span>Tipo de pregunta no soportado: {question.type}</span>
                      </div>
                    )}
                  </div>
                ))}

                <div className="modal-action">
                  <button
                    onClick={() => setShowSurveyModal(false)}
                    className="btn btn-ghost"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmitSurvey}
                    disabled={submittingSurvey}
                    className="btn btn-primary text-white"
                  >
                    {submittingSurvey ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Enviando...
                      </>
                    ) : (
                      'Enviar Respuestas'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Certificado */}
      {showCertificateModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <button
              onClick={() => setShowCertificateModal(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
              <IconX size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              {certificateEligible ? (
                <>
                  {/* Elegible - Puede descargar */}
                  <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center mb-4">
                    <IconCheck size={48} className="text-white" />
                  </div>
                  <h3 className="font-bold text-2xl mb-2">¡Felicidades!</h3>
                  <p className="text-base-content/70 mb-6">
                    Cumples con todos los requisitos para descargar tu certificado
                  </p>

                  {pdfCertificateTemplate && user ? (
                    <button
                      onClick={async () => {
                        try {
                          setExportingPdf(true);
                          const [htmlToImage, { default: jsPDF }] = await Promise.all([
                            import('html-to-image'),
                            import('jspdf'),
                          ]);
                          // Convertir firmas a data URL si es necesario
                          const safeSigs = await Promise.all(
                            (pdfCertificateTemplate.signatures || []).map(async (s: any) => {
                              if (!s.imageUrl) return s;
                              if (typeof s.imageUrl === 'string' && s.imageUrl.startsWith('data:')) return s;
                              try {
                                const dataUrl = await convertImageToPngDataUrl(s.imageUrl);
                                return { ...s, imageUrl: dataUrl };
                              } catch (err) {
                                console.warn('Firma no pudo convertirse, se usará URL original', err);
                                return s;
                              }
                            })
                          );
                          setExportSignatures(safeSigs);
                          // Esperar a que React pinte el DOM oculto con las firmas saneadas
                          await new Promise(r => setTimeout(r, 0));
                          await new Promise(r => requestAnimationFrame(r));

                          const node = certDomRef.current;
                          if (!node) throw new Error('Certificado no disponible');

                          // Placeholder transparente 1x1 para imágenes faltantes
                          const transparentPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottQAAAABJRU5ErkJggg==';

                          let dataUrl: string | undefined;
                          try {
                            dataUrl = await htmlToImage.toPng(node, { cacheBust: true, pixelRatio: 2, imagePlaceholder: transparentPng });
                          } catch (err1) {
                            console.warn('toPng falló, intentando con menor resolución', err1);
                            try {
                              dataUrl = await htmlToImage.toPng(node, { cacheBust: true, pixelRatio: 1, imagePlaceholder: transparentPng });
                            } catch (err2) {
                              console.warn('toPng(1x) falló, intentando toJpeg', err2);
                              dataUrl = await htmlToImage.toJpeg(node, { quality: 0.95, cacheBust: true, pixelRatio: 1, imagePlaceholder: transparentPng });
                            }
                          }

                          const pageSize: 'letter' | 'legal' = pdfCertificateTemplate.pageSize || 'letter';
                          const orientation: 'portrait' | 'landscape' = pdfCertificateTemplate.orientation || 'landscape';
                          const sizes = { letter: { w: 216, h: 279 }, legal: { w: 216, h: 356 } } as const;
                          const base = sizes[pageSize];
                          const pdfW = orientation === 'landscape' ? base.h : base.w;
                          const pdfH = orientation === 'landscape' ? base.w : base.h;
                          const doc = new jsPDF({ orientation, unit: 'mm', format: [pdfW, pdfH] });
                          const imgFormat = dataUrl!.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
                          doc.addImage(dataUrl!, imgFormat as any, 0, 0, pdfW, pdfH);
                          doc.save(`certificado-${course.title.replace(/\s+/g, '-')}.pdf`);

                          // Registrar descarga de certificado en la base de datos
                          try {
                            await supabaseClient.from(TABLES.CERTIFICATE_DOWNLOADS).insert({
                              course_id: course.id,
                              student_id: user.id,
                              student_name: user.name,
                              student_email: user.email,
                              downloaded_at: new Date().toISOString(),
                              certificate_template_id: course.certificateTemplateId,
                            });
                            console.log('Descarga de certificado registrada exitosamente');
                          } catch (error) {
                            console.error('Error al registrar descarga de certificado:', error);
                            // No mostramos error al usuario para no interrumpir la descarga
                          }
                        } catch (e) {
                          console.error('Error exportando certificado:', e instanceof Error ? e.message : e);
                          alert('Error al generar certificado');
                        } finally {
                          setExportingPdf(false);
                        }
                      }}
                      className="btn btn-success text-white gap-2 btn-lg"
                      disabled={exportingPdf}
                    >
                      {exportingPdf ? (
                        <>
                          <span className="loading loading-spinner"></span>
                          Generando PDF...
                        </>
                      ) : (
                        <>
                          <IconDownload size={24} />
                          Descargar Certificado
                        </>
                      )}
                    </button>
                  ) : (
                    <button className="btn btn-ghost" disabled>
                      <span className="loading loading-spinner"></span>
                      Preparando certificado...
                    </button>
                  )}
                </>
              ) : (
                <>
                  {/* No elegible - Mostrar requisitos */}
                  <div className="w-20 h-20 bg-error rounded-full flex items-center justify-center mb-4">
                    <IconAlertCircle size={48} className="text-white" />
                  </div>
                  <h3 className="font-bold text-2xl mb-2">Certificado No Disponible</h3>
                  <p className="text-base-content/70 mb-6">
                    Aún no cumples con todos los requisitos
                  </p>

                  <div className="w-full bg-base-200 rounded-lg p-6 mb-6">
                    <h4 className="font-semibold mb-3 text-left">Requisitos Faltantes:</h4>
                    <ul className="space-y-2">
                      {eligibilityReasons.map((reason, index) => (
                        <li key={index} className="flex items-start gap-2 text-left">
                          <IconX size={20} className="text-error flex-shrink-0 mt-0.5" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Mostrar reglas del curso */}
                  {course.certificateRules && (
                    <div className="w-full bg-info/10 border border-info/20 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold mb-2 text-left flex items-center gap-2">
                        <IconAlertCircle size={20} className="text-info" />
                        Requisitos del Curso
                      </h4>
                      <ul className="text-sm space-y-1 text-left">
                        {course.certificateRules.requireEnrollmentOnly && (
                          <li className="flex items-center gap-2">
                            <IconCheck size={16} className="text-success" />
                            Solo requiere inscripción
                          </li>
                        )}
                        {course.certificateRules.requireSurveys && (
                          <li className="flex items-center gap-2">
                            <IconCheck size={16} className="text-success" />
                            Completar encuestas de entrada y salida
                          </li>
                        )}
                        {course.certificateRules.requireAttendance && (
                          <li className="flex items-center gap-2">
                            <IconCheck size={16} className="text-success" />
                            Asistir al menos 5 minutos a todas las lecciones
                          </li>
                        )}
                        <li className="flex items-center gap-2 text-primary font-semibold">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Disponible {course.certificateRules.hoursAfterStart || 1} hora(s) después del inicio
                        </li>
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={() => setShowCertificateModal(false)}
                    className="btn btn-primary text-white w-full"
                  >
                    Entendido
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recursos */}
      {showResourcesModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <button
              onClick={() => setShowResourcesModal(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
              <IconX size={20} />
            </button>

            <h3 className="font-bold text-2xl mb-4">Recursos de la Lección</h3>

            {currentLessonResources.length === 0 ? (
              <div className="text-center py-8">
                <IconFileText size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-base-content/70">No hay recursos disponibles</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentLessonResources.map((resource) => (
                  <div key={resource.id} className="card bg-base-200 p-4">
                    {/* Header con ícono y título */}
                    <div className="flex items-start gap-3 mb-3">
                      <IconFileText size={24} className="text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold">{resource.title}</h4>
                        <p className="text-sm text-base-content/60 truncate">{resource.fileName}</p>
                        {resource.fileSize && (
                          <p className="text-xs text-base-content/50">
                            {(resource.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Botones en grid responsive */}
                    <div className="flex flex-wrap gap-2">
                      {canPreview(resource.fileType) && (
                        <button
                          onClick={() => handlePreviewResource(resource)}
                          className="btn btn-sm btn-info text-white gap-1 flex-1 sm:flex-none sm:w-auto sm:min-w-[120px] sm:max-w-[200px]"
                        >
                          <IconEye size={16} />
                          Ver
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadResource(resource)}
                        className="btn btn-sm btn-primary text-white gap-1 flex-1 sm:flex-none sm:w-auto sm:min-w-[120px] sm:max-w-[200px]"
                      >
                        <IconDownload size={16} />
                        Descargar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-action">
              <button onClick={() => setShowResourcesModal(false)} className="btn">
                Cerrar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowResourcesModal(false)}>
            <button>close</button>
          </div>
        </div>
      )}

      {/* Modal de Preview */}
      {showPreviewModal && previewResource && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10"
            >
              <IconX size={20} />
            </button>

            <h3 className="font-bold text-xl mb-4">{previewResource.title}</h3>

            <div className="w-full overflow-auto max-h-[70vh]">
              {previewResource.fileType.includes('pdf') && (
                <iframe
                  src={previewResource.fileUrl}
                  className="w-full h-[70vh] border-0"
                  title={previewResource.title}
                />
              )}
              {previewResource.fileType.includes('image') && (
                <img
                  src={previewResource.fileUrl}
                  alt={previewResource.title}
                  className="w-full h-auto rounded-lg"
                />
              )}
              {previewResource.fileType.includes('video') && (
                <video
                  src={previewResource.fileUrl}
                  controls
                  className="w-full rounded-lg"
                />
              )}
              {previewResource.fileType.includes('audio') && (
                <audio
                  src={previewResource.fileUrl}
                  controls
                  className="w-full"
                />
              )}
            </div>

            <div className="modal-action">
              <button
                onClick={() => handleDownloadResource(previewResource)}
                className="btn btn-primary text-white gap-2"
              >
                <IconDownload size={20} />
                Descargar
              </button>
              <button onClick={() => setShowPreviewModal(false)} className="btn">
                Cerrar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowPreviewModal(false)}>
            <button>close</button>
          </div>
        </div>
      )}

      {/* Modal de Resultado de Encuesta */}
      {showSurveyResultModal && (
        <div className="modal modal-open">
          <div className="modal-box text-center">
            <div className="flex justify-center mb-4">
              <div className={`rounded-full p-3 ${surveyResultType === 'success' ? 'bg-success' : 'bg-error'}`}>
                {surveyResultType === 'success' ? (
                  <IconCheck size={48} className="text-white" />
                ) : (
                  <IconAlertCircle size={48} className="text-white" />
                )}
              </div>
            </div>
            <h3 className="font-bold text-2xl mb-2">
              {surveyResultType === 'success' ? '¡Éxito!' : 'Atención'}
            </h3>
            <p className="text-base-content/70 mb-6 whitespace-pre-line">
              {surveyResultMessage}
            </p>
            <button
              onClick={() => setShowSurveyResultModal(false)}
              className="btn btn-primary text-white"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* Render oculto para exportación Canvas */}
      {pdfCertificateTemplate && user && (
        <div style={{ position: 'fixed', left: -10000, top: -10000, opacity: 0, pointerEvents: 'none' }}>
          <CertificateDOM
            ref={certDomRef}
            template={pdfCertificateTemplate}
            data={{
              studentName: user.name,
              courseTitle: course?.title || '',
              completionDate: new Date().toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
            }}
            signatures={exportSignatures.length ? exportSignatures : (pdfCertificateTemplate.signatures || [])}
            backgroundSrc={pdfCertificateTemplate.backgroundUrl}
          />
        </div>
      )}
    </div>
  );
}
