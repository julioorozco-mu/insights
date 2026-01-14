"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { Loader } from "@/components/common/Loader";
import RichTextContent from "@/components/ui/RichTextContent";
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
  IconEye,
  IconArrowLeft,
  IconListDetails,
  IconPhoto,
  IconTable,
  IconCheckbox,
  IconList,
  IconPaperclip,
  IconBold
} from "@tabler/icons-react";
import { checkCertificateEligibility, getEligibilityMessage } from "@/utils/certificateEligibility";
import { Course as FullCourse } from "@/types/course";
import { convertImageToPngDataUrl } from "@/utils/image";
import CertificateDOM from "@/components/certificate/CertificateDOM";
import { Survey, SurveyResponse } from "@/types/survey";

// ===== DESIGN SYSTEM COLORS (proyect.md) =====
const COLORS = {
  primary: "#192170",
  secondary: "#3C1970",
  success: "#10B981",
  error: "#EF4444",
  background: "#F1F5F9",
  surface: "#FFFFFF",
  text: {
    primary: "#111827",
    secondary: "#4B5563",
    muted: "#9CA3AF",
  },
  accent: {
    primarySoft: "#E8EAF6",
    border: "rgba(15,23,42,0.10)",
    borderStrong: "rgba(15,23,42,0.18)",
  },
};

// ===== INTERFACES =====
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

// Interfaces para contenido de lecciones (subsecciones y bloques)
type BlockType = "text" | "heading" | "image" | "video" | "gallery" | "list" | "attachment" | "table" | "quiz" | "case-study";

interface ContentBlock {
  id: string;
  type: BlockType;
  content: string;
  data?: any;
}

interface Subsection {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

interface LessonContent {
  subsections: Subsection[];
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  type: 'video' | 'livestream' | 'hybrid';
  videoUrl?: string;
  recordedVideoUrl?: string;
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
  scheduledDate?: string;
  content?: string; // JSON string con subsecciones
  entrySurveyId?: string;
  exitSurveyId?: string;
}

interface Resource {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSize?: number;
}

// ===== HELPER: Parsear contenido de lección =====
function parseLessonContent(contentString?: string): LessonContent | null {
  if (!contentString) return null;
  try {
    const parsed = JSON.parse(contentString);
    if (parsed.subsections && Array.isArray(parsed.subsections)) {
      return parsed as LessonContent;
    }
    return null;
  } catch {
    return null;
  }
}

// ===== HELPER: Obtener icono por tipo de bloque =====
function getBlockIcon(type: BlockType) {
  switch (type) {
    case "heading": return IconBold;
    case "text": return IconFileText;
    case "image": return IconPhoto;
    case "video": return IconVideo;
    case "gallery": return IconPhoto;
    case "list": return IconList;
    case "attachment": return IconPaperclip;
    case "table": return IconTable;
    case "quiz": return IconCheckbox;
    default: return IconFileText;
  }
}

// ===== COMPONENTE PRINCIPAL =====
export default function StudentCoursePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  // Modo preview para maestros/admins (no requiere inscripción)
  // Teachers y admins siempre tienen acceso sin inscripción
  const isPreviewMode = searchParams.get("preview") === "true" || 
    user?.role === "teacher" || 
    user?.role === "admin";
  const [course, setCourse] = useState<FullCourse | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);
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
  // Progreso de lecciones completadas (simulado - en producción vendría de la BD)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [completedSubsections, setCompletedSubsections] = useState<Set<string>>(new Set());

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

        // Verificar inscripción usando API (bypaseando RLS)
        // En modo preview (para maestros), saltamos esta validación
        let enrollmentData: any = null;
        if (!isPreviewMode) {
          const enrollmentRes = await fetch(`/api/student/check-enrollment?courseId=${params.id}`);
          
          if (!enrollmentRes.ok) {
            console.error('Error verificando inscripción');
            alert('Error al verificar tu inscripción. Por favor recarga la página.');
            return;
          }

          enrollmentData = await enrollmentRes.json();
          
          if (!enrollmentData.isEnrolled) {
            alert('No estás inscrito en este curso');
            router.push('/dashboard/enrolled-courses');
            return;
          }

          // Cargar progreso de lecciones completadas desde la BD
          const completedLessonsSet = new Set<string>();
          if (enrollmentData.completedLessons && Array.isArray(enrollmentData.completedLessons)) {
            enrollmentData.completedLessons.forEach((lessonId: string) => {
              completedLessonsSet.add(lessonId);
            });
            setCompletedLessons(completedLessonsSet);
          }
          
          // Cargar progreso de subsecciones
          // Primero cargar desde subsectionProgress
          const subsectionSet = new Set<string>();
          if (enrollmentData.subsectionProgress) {
            Object.entries(enrollmentData.subsectionProgress).forEach(([lessonId, maxIndex]) => {
              // Marcar todas las subsecciones hasta maxIndex como completadas
              for (let i = 0; i <= (maxIndex as number); i++) {
                subsectionSet.add(`${lessonId}-sub-${i}`);
              }
            });
          }
          
          // Si una lección está en completedLessons, todas sus subsecciones están completadas
          // Esto se actualizará después de cargar las lecciones, pero por ahora marcamos un placeholder
          // que se resolverá cuando se carguen las lecciones
          setCompletedSubsections(subsectionSet);
        }

        // Cargar lecciones usando API (bypaseando RLS)
        // En modo preview, agregamos el parámetro para saltar validación de inscripción
        const lessonsUrl = isPreviewMode 
          ? `/api/student/getLessons?courseId=${params.id}&preview=true`
          : `/api/student/getLessons?courseId=${params.id}`;
        const lessonsRes = await fetch(lessonsUrl);
        
        if (lessonsRes.ok) {
          const { lessons: allLessonsData } = await lessonsRes.json();
          
          if (allLessonsData && allLessonsData.length > 0) {
            const lessonsData = allLessonsData
              .filter((lessonData: any) => lessonData.isActive !== false) // Solo lecciones activas
              .map((lessonData: any) => ({
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
                scheduledDate: lessonData.scheduledDate,
                entrySurveyId: lessonData.entrySurveyId,
                exitSurveyId: lessonData.exitSurveyId,
                content: lessonData.content, // Agregar contenido con subsecciones
              } as Lesson))
              .sort((a: Lesson, b: Lesson) => a.order - b.order);
            
            setLessons(lessonsData);

          // Actualizar completedSubsections: si una lección está completada, marcar todas sus subsecciones
          if (enrollmentData && enrollmentData.completedLessons) {
            setCompletedSubsections(prev => {
              const updated = new Set(prev);
              const completedLessonsArray = Array.isArray(enrollmentData.completedLessons) 
                ? enrollmentData.completedLessons 
                : [];
              lessonsData.forEach((lesson: Lesson) => {
                if (completedLessonsArray.includes(lesson.id)) {
                  const lessonContent = parseLessonContent(lesson.content);
                  const subsectionsCount = lessonContent?.subsections.length || 0;
                  // Marcar todas las subsecciones como completadas
                  for (let i = 0; i < subsectionsCount; i++) {
                    updated.add(`${lesson.id}-sub-${i}`);
                  }
                }
              });
              return updated;
            });
          }

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
              // canAnswerEntry: si no requiere secuencial, siempre puede; si requiere, debe haber completado la lección anterior
              d.canAnswerEntry = !requireSequential || priorDone;
              // canAnswerExit: si exitAfterStart, solo después de la fecha de inicio de la lección
              let exitAllowed = true;
              if (exitAfterStart && lesson.scheduledDate) {
                const lessonStart = new Date(lesson.scheduledDate);
                exitAllowed = now >= lessonStart;
              }
              d.canAnswerExit = d.canAnswerEntry && exitAllowed;

              // Actualizar priorDone para la siguiente lección
              if (requireSequential) {
                const entryDone = !d.entrySurvey || !!d.entryResponse;
                const exitDone = !d.exitSurvey || !!d.exitResponse;
                priorDone = entryDone && exitDone;
              }

              newMap[lesson.id] = d;
            }
            return newMap;
          };

          const gatedMap = computeGating(map);
          setLessonSurveyData(gatedMap);
          }
        }

        // Cargar encuestas a nivel de curso
        if (courseData.entrySurveyId) {
          const { data: sDoc } = await supabaseClient
            .from(TABLES.SURVEYS)
            .select('*')
            .eq('id', courseData.entrySurveyId)
            .single();
          if (sDoc) {
            setEntrySurvey({ id: sDoc.id, title: sDoc.title, type: sDoc.type, questions: sDoc.questions } as Survey);
            const { data: respQ } = await supabaseClient
              .from(TABLES.SURVEY_RESPONSES)
              .select('*')
              .eq('survey_id', sDoc.id)
              .eq('user_id', user.id)
              .limit(1);
            if (respQ && respQ.length > 0) {
              setEntryResponse({ id: respQ[0].id, surveyId: respQ[0].survey_id, answers: respQ[0].answers } as any);
            }
          }
        }

        if (courseData.exitSurveyId) {
          const { data: sDoc } = await supabaseClient
            .from(TABLES.SURVEYS)
            .select('*')
            .eq('id', courseData.exitSurveyId)
            .single();
          if (sDoc) {
            setExitSurvey({ id: sDoc.id, title: sDoc.title, type: sDoc.type, questions: sDoc.questions } as Survey);
            const { data: respQ } = await supabaseClient
              .from(TABLES.SURVEY_RESPONSES)
              .select('*')
              .eq('survey_id', sDoc.id)
              .eq('user_id', user.id)
              .limit(1);
            if (respQ && respQ.length > 0) {
              setExitResponse({ id: respQ[0].id, surveyId: respQ[0].survey_id, answers: respQ[0].answers } as any);
            }
          }
        }

        // Cargar speakers del curso
        if (courseData.speakerIds && courseData.speakerIds.length > 0) {
          const { data: speakersData } = await supabaseClient
            .from(TABLES.USERS)
            .select('id, name, last_name, avatar_url')
            .in('id', courseData.speakerIds);
          if (speakersData) {
            setSpeakers(speakersData.map((s: any) => ({
              id: s.id,
              name: s.name,
              lastName: s.last_name,
              avatarUrl: s.avatar_url,
            })));
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading course:', error);
        setLoading(false);
      }
    };

    loadCourseData();
  }, [user, params.id, router]);

  // Polling para estado de lecciones en vivo
  useEffect(() => {
    if (lessons.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const { data: lessonsData } = await supabaseClient
          .from(TABLES.LESSONS)
          .select('id, is_live, live_status, recorded_video_url')
          .in('id', lessons.map(l => l.id));

        if (lessonsData) {
          setLessons(prev => prev.map(lesson => {
            const updated = lessonsData.find((l: any) => l.id === lesson.id);
            if (updated) {
              return {
                ...lesson,
                isLive: updated.is_live,
                liveStatus: updated.live_status,
                recordedVideoUrl: updated.recorded_video_url,
              };
            }
            return lesson;
          }));
        }
      } catch (error) {
        console.error('Error polling lessons:', error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [lessons.length]);

  // Funciones auxiliares
  const formatDateTimeLocal = (dateString: string) => {
    const dateObj = new Date(dateString);
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth();
    const day = dateObj.getUTCDate();
    const hours = dateObj.getUTCHours();
    const minutes = dateObj.getUTCMinutes();
    const localDate = new Date(year, month, day, hours, minutes);
    
    return {
      date: localDate.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: localDate.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const formatLessonDateTime = (lesson: Lesson) => {
    const dateStr = lesson.startDate || lesson.scheduledStartTime || lesson.scheduledDate;
    if (!dateStr) return null;
    
    const dateObj = new Date(dateStr);
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth();
    const day = dateObj.getUTCDate();
    const hours = dateObj.getUTCHours();
    const minutes = dateObj.getUTCMinutes();
    const localDate = new Date(year, month, day, hours, minutes);
    
    return localDate.toLocaleDateString('es-MX', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

  const toggleAllLessons = () => {
    if (allExpanded) {
      setExpandedLessons(new Set());
    } else {
      setExpandedLessons(new Set(lessons.map(l => l.id)));
    }
    setAllExpanded(!allExpanded);
  };

  const computeLessonGatingFromState = (base: Record<string, any>) => {
    if (!course) return base;
    const sorted = [...lessons];
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
      d.canAnswerEntry = !requireSequential || priorDone;
      let exitAllowed = true;
      if (exitAfterStart && lesson.scheduledDate) {
        const lessonStart = new Date(lesson.scheduledDate);
        exitAllowed = now >= lessonStart;
      }
      d.canAnswerExit = d.canAnswerEntry && exitAllowed;

      if (requireSequential) {
        const entryDone = !d.entrySurvey || !!d.entryResponse;
        const exitDone = !d.exitSurvey || !!d.exitResponse;
        priorDone = entryDone && exitDone;
      }

      newMap[lesson.id] = d;
    }
    return newMap;
  };

  const openSurvey = (lessonId: string | null, survey: Survey, response: SurveyResponse | null) => {
    setCurrentLessonId(lessonId);
    setCurrentSurvey(survey);
    setCurrentResponse(response);
    if (response) {
      const answers: Record<string, string | string[]> = {};
      response.answers.forEach((a: any) => {
        answers[a.questionId] = a.answer;
      });
      setSurveyAnswers(answers);
    } else {
      setSurveyAnswers({});
    }
    setShowSurveyModal(true);
  };

  const handleSurveyAnswerChange = (questionId: string, value: string | string[]) => {
    setSurveyAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmitSurvey = async () => {
    if (!currentSurvey || !user || !course) return;

    // Validar preguntas requeridas
    const unansweredRequired: string[] = [];
    currentSurvey.questions.forEach((question) => {
      if (question.isRequired) {
        const answer = surveyAnswers[question.id];
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

    // Validación de tiempo para encuesta de salida
    if (currentSurvey.type === 'exit' && !currentResponse) {
      const now = new Date();
      let lessonStartTime: Date | null = null;
      
      if (currentLessonId) {
        const currentLesson = lessons.find(l => l.id === currentLessonId);
        if (currentLesson) {
          const startTimeStr = currentLesson.startDate || currentLesson.scheduledStartTime || currentLesson.scheduledDate;
          if (startTimeStr) {
            const dateObj = new Date(startTimeStr);
            const year = dateObj.getUTCFullYear();
            const month = dateObj.getUTCMonth();
            const day = dateObj.getUTCDate();
            const hours = dateObj.getUTCHours();
            const minutes = dateObj.getUTCMinutes();
            lessonStartTime = new Date(year, month, day, hours, minutes);
          }
        }
      } else {
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

  // Calcular estadísticas del curso
  const getTotalSubsections = () => {
    let total = 0;
    lessons.forEach(lesson => {
      const content = parseLessonContent(lesson.content);
      if (content) {
        total += content.subsections.length;
      }
    });
    return total;
  };

  const getCompletedCount = () => {
    return completedLessons.size;
  };

  if (loading) {
    return <Loader />;
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: COLORS.background }}>
        <div className="text-center">
          <IconBook size={64} className="mx-auto mb-4" style={{ color: COLORS.text.muted }} />
          <h2 className="text-2xl font-bold" style={{ color: COLORS.text.primary }}>Curso no encontrado</h2>
        </div>
      </div>
    );
  }

  const totalSubsections = getTotalSubsections();

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.background }}>
      {/* Container principal - Single Column Layout */}
      <div className="max-w-[900px] mx-auto py-8 px-4 sm:px-6">
        
        {/* Botón Volver */}
        <button 
          onClick={() => router.push(isPreviewMode ? `/dashboard/courses/${params.id}/edit` : '/dashboard/enrolled-courses')}
          className="flex items-center gap-2 mb-6 px-4 py-2 rounded-full transition-all duration-200 hover:shadow-md"
          style={{ 
            backgroundColor: COLORS.surface,
            color: COLORS.primary,
            border: `1px solid ${COLORS.accent.border}`,
          }}
        >
          <IconArrowLeft size={18} />
          <span className="font-medium text-sm">{isPreviewMode ? 'Volver al editor' : 'Volver a Mis Cursos'}</span>
        </button>

        {/* ===== COURSE HEADER CARD ===== */}
        <div 
          className="rounded-2xl overflow-hidden mb-6"
          style={{ 
            backgroundColor: COLORS.surface,
            boxShadow: '0 10px 30px rgba(15,23,42,0.10)',
          }}
        >
          {/* Imagen de portada */}
          {course.coverImageUrl && (
            <div className="w-full h-48 sm:h-64 relative overflow-hidden">
              <img
                src={course.coverImageUrl}
                alt={course.title}
                className="w-full h-full object-cover"
              />
              <div 
                className="absolute inset-0"
                style={{ 
                  background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
                }}
              />
            </div>
          )}
          
          {/* Contenido del header */}
          <div className="p-6 sm:p-8">
            {/* Título */}
            <h1 
              className="text-2xl sm:text-3xl font-bold mb-3"
              style={{ color: COLORS.primary, lineHeight: 1.25 }}
            >
              {course.title}
            </h1>
            
            {/* Descripción */}
            {course.description && (
              <RichTextContent 
                html={course.description}
                className="text-base mb-6"
              />
            )}

            {/* Meta información */}
            <div className="flex flex-wrap gap-6 mb-6">
              {/* Ponentes */}
              {speakers.length > 0 && (
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: COLORS.accent.primarySoft }}
                  >
                    <IconUser size={20} style={{ color: COLORS.primary }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: COLORS.text.muted }}>
                      {speakers.length === 1 ? 'Instructor' : 'Instructores'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {speakers.map((speaker, idx) => (
                        <span 
                          key={speaker.id || idx} 
                          className="text-sm font-medium"
                          style={{ color: COLORS.text.primary }}
                        >
                          {speaker.name} {speaker.lastName || ''}
                          {idx < speakers.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Fecha */}
              {course.startDate && (
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: COLORS.accent.primarySoft }}
                  >
                    <IconCalendar size={20} style={{ color: COLORS.primary }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: COLORS.text.muted }}>Fecha</p>
                    <p className="text-sm font-medium" style={{ color: COLORS.text.primary }}>
                      {formatDateTimeLocal(course.startDate).date}
                    </p>
                  </div>
                </div>
              )}

              {/* Lecciones */}
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: COLORS.accent.primarySoft }}
                >
                  <IconListDetails size={20} style={{ color: COLORS.primary }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: COLORS.text.muted }}>Contenido</p>
                  <p className="text-sm font-medium" style={{ color: COLORS.text.primary }}>
                    {lessons.length} {lessons.length === 1 ? 'sección' : 'secciones'}
                    {totalSubsections > 0 && ` · ${totalSubsections} lecciones`}
                  </p>
                </div>
              </div>
            </div>

            {/* Botón de Certificado */}
            {course.certificateTemplateId && (
              <button
                onClick={handleCheckEligibility}
                disabled={checkingEligibility}
                className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-200 hover:shadow-lg"
                style={{ 
                  backgroundColor: COLORS.primary,
                  color: '#FFFFFF',
                }}
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

        {/* ===== COURSE CONTENT CARD (Accordion) ===== */}
        <div 
          className="rounded-2xl overflow-hidden"
          style={{ 
            backgroundColor: COLORS.surface,
            boxShadow: '0 10px 30px rgba(15,23,42,0.10)',
          }}
        >
          {/* Header del contenido */}
          <div className="p-6 sm:p-8 border-b" style={{ borderColor: COLORS.accent.border }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 
                  className="text-xl font-semibold mb-1"
                  style={{ color: COLORS.text.primary }}
                >
                  Contenido del Curso
                </h2>
                <div className="flex items-center gap-4 text-sm" style={{ color: COLORS.text.muted }}>
                  <span className="flex items-center gap-1">
                    <IconBook size={16} />
                    {lessons.length} {lessons.length === 1 ? 'sección' : 'secciones'}
                  </span>
                  {totalSubsections > 0 && (
                    <span className="flex items-center gap-1">
                      <IconListDetails size={16} />
                      {totalSubsections} lecciones
                    </span>
                  )}
                  {getCompletedCount() > 0 && (
                    <span className="flex items-center gap-1" style={{ color: COLORS.success }}>
                      <IconCheck size={16} />
                      {getCompletedCount()} completadas
                    </span>
                  )}
                </div>
              </div>
              
              <button
                onClick={toggleAllLessons}
                className="text-sm font-medium px-4 py-2 rounded-full transition-all duration-200"
                style={{ 
                  color: COLORS.primary,
                  backgroundColor: COLORS.accent.primarySoft,
                }}
              >
                {allExpanded ? 'Colapsar todo' : 'Expandir todo'}
              </button>
            </div>
          </div>

          {/* Lista de Lecciones (Accordion) */}
          <div className="divide-y" style={{ borderColor: COLORS.accent.border }}>
            {lessons.length === 0 ? (
              <div className="text-center py-16">
                <IconBook size={64} className="mx-auto mb-4" style={{ color: COLORS.text.muted, opacity: 0.5 }} />
                <p style={{ color: COLORS.text.muted }}>No hay lecciones disponibles</p>
              </div>
            ) : (
              lessons.map((lesson, index) => {
                const isExpanded = expandedLessons.has(lesson.id);
                const lessonContent = parseLessonContent(lesson.content);
                const isCompleted = completedLessons.has(lesson.id);
                const subsectionsCount = lessonContent?.subsections.length || 0;
                
                // Calcular progreso de la sección
                // Si la lección está marcada como completada en la BD, todas las subsecciones están completadas
                let completedSubsectionsCount = 0;
                if (isCompleted) {
                  // Si la lección está completada, todas las subsecciones están completadas
                  completedSubsectionsCount = subsectionsCount;
                } else if (lessonContent && lessonContent.subsections.length > 0) {
                  // Contar subsecciones completadas individualmente
                  lessonContent.subsections.forEach((subsection, subIdx) => {
                    if (completedSubsections.has(`${lesson.id}-sub-${subIdx}`)) {
                      completedSubsectionsCount++;
                    }
                  });
                }
                const sectionProgress = subsectionsCount > 0 
                  ? Math.round((completedSubsectionsCount / subsectionsCount) * 100)
                  : 0;
                const isSectionCompleted = sectionProgress === 100;
                
                return (
                  <div key={lesson.id}>
                    {/* Accordion Header */}
                    <div 
                      className="flex items-center gap-4 p-4 sm:p-5 cursor-pointer transition-all duration-200 hover:bg-opacity-50"
                      style={{ 
                        backgroundColor: isExpanded ? COLORS.accent.primarySoft : 'transparent',
                      }}
                      onClick={() => toggleLesson(lesson.id)}
                    >
                      {/* Chevron */}
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200"
                        style={{ 
                          backgroundColor: isExpanded ? COLORS.primary : COLORS.accent.primarySoft,
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      >
                        <IconChevronDown 
                          size={18} 
                          style={{ color: isExpanded ? '#FFFFFF' : COLORS.primary }}
                        />
                      </div>
                      
                      {/* Título y meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span 
                            className="text-xs font-medium px-2 py-0.5 rounded"
                            style={{ 
                              backgroundColor: COLORS.accent.primarySoft,
                              color: COLORS.primary,
                            }}
                          >
                            Sección {index + 1}
                          </span>
                          {lesson.isLive && (
                            <span 
                              className="text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1"
                              style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
                            >
                              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                              EN VIVO
                            </span>
                          )}
                          {isSectionCompleted && (
                            <span 
                              className="text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1"
                              style={{ backgroundColor: '#D1FAE5', color: COLORS.success }}
                            >
                              <IconCheck size={12} />
                              100% Completado
                            </span>
                          )}
                        </div>
                        <h3 
                          className="font-semibold mb-2 truncate"
                          style={{ color: COLORS.text.primary }}
                        >
                          {lesson.title}
                        </h3>
                        
                        {/* Barra de progreso */}
                        {subsectionsCount > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span style={{ color: COLORS.text.muted }}>
                                {completedSubsectionsCount} de {subsectionsCount} lecciones completadas
                              </span>
                              <span 
                                className="font-semibold"
                                style={{ color: isSectionCompleted ? COLORS.success : COLORS.primary }}
                              >
                                {sectionProgress}%
                              </span>
                            </div>
                            <div 
                              className="w-full h-2 rounded-full overflow-hidden"
                              style={{ backgroundColor: COLORS.accent.primarySoft }}
                            >
                              <div 
                                className="h-full rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${sectionProgress}%`,
                                  backgroundColor: isSectionCompleted ? COLORS.success : COLORS.primary,
                                }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {lesson.description && !isExpanded && (
                          <p 
                            className="text-sm mt-2 truncate"
                            style={{ color: COLORS.text.muted }}
                          >
                            {lesson.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Progress Pill */}
                      <div 
                        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full flex-shrink-0"
                        style={{ 
                          backgroundColor: COLORS.accent.primarySoft,
                          color: COLORS.primary,
                        }}
                      >
                        <IconListDetails size={14} />
                        <span className="text-xs font-medium">
                          {subsectionsCount} {subsectionsCount === 1 ? 'lección' : 'lecciones'}
                        </span>
                      </div>
                    </div>

                    {/* Accordion Body - Contenido Expandido */}
                    {isExpanded && (
                      <div 
                        className="px-4 sm:px-5 pb-5"
                        style={{ backgroundColor: COLORS.surface }}
                      >
                        {/* Descripción de la lección */}
                        {lesson.description && (
                          <p 
                            className="text-sm mb-4 pl-12"
                            style={{ color: COLORS.text.secondary }}
                          >
                            {lesson.description}
                          </p>
                        )}

                        {/* Lista de Subsecciones */}
                        {lessonContent && lessonContent.subsections.length > 0 && (
                          <div className="pl-12 mb-4 mt-4 space-y-2">
                            {lessonContent.subsections.map((subsection, subIdx) => {
                              // Verificar si la subsección está completada usando el índice (formato: lessonId-sub-index)
                              const isSubCompleted = completedSubsections.has(`${lesson.id}-sub-${subIdx}`);
                              const blockTypes = subsection.blocks.map(b => b.type);
                              const hasVideo = blockTypes.includes('video');
                              const hasQuiz = blockTypes.includes('quiz');
                              const hasAttachment = blockTypes.includes('attachment');
                              
                              const subsectionContent = (
                                <>
                                  {/* Icono de estado */}
                                  <div 
                                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ 
                                      backgroundColor: isSubCompleted ? COLORS.success : COLORS.accent.primarySoft,
                                    }}
                                  >
                                    {isSubCompleted ? (
                                      <IconCheck size={14} style={{ color: '#FFFFFF' }} />
                                    ) : (
                                      <IconPlayerPlay size={12} style={{ color: COLORS.primary }} />
                                    )}
                                  </div>
                                  
                                  {/* Título de subsección */}
                                  <span 
                                    className="flex-1 text-sm font-medium"
                                    style={{ color: COLORS.text.primary }}
                                  >
                                    {subsection.title}
                                  </span>
                                  
                                  {/* Iconos de tipo de contenido */}
                                  <div className="flex items-center gap-2">
                                    {hasVideo && (
                                      <IconVideo size={16} style={{ color: COLORS.text.muted }} />
                                    )}
                                    {hasQuiz && (
                                      <IconCheckbox size={16} style={{ color: COLORS.text.muted }} />
                                    )}
                                    {hasAttachment && (
                                      <IconPaperclip size={16} style={{ color: COLORS.text.muted }} />
                                    )}
                                  </div>
                                </>
                              );
                              
                              const sharedStyles = {
                                backgroundColor: isSubCompleted ? '#D1FAE5' : '#F9FAFB',
                                border: `1px solid ${COLORS.accent.border}`,
                              };
                              
                              // En modo preview, permitir navegación al contenido con parámetro preview
                              if (isPreviewMode) {
                                return (
                                  <Link
                                    href={`/student/courses/${params.id}/learn/lecture/${lesson.id}?subsection=${subIdx}&preview=true`}
                                    key={`${lesson.id}-${subsection.id || subIdx}`}
                                    className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:opacity-80"
                                    style={{ ...sharedStyles, cursor: 'pointer' }}
                                  >
                                    {subsectionContent}
                                  </Link>
                                );
                              }
                              
                              return (
                                <Link
                                  href={`/student/courses/${params.id}/learn/lecture/${lesson.id}?subsection=${subIdx}`}
                                  key={`${lesson.id}-${subsection.id || subIdx}`}
                                  className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:opacity-80"
                                  style={{ ...sharedStyles, cursor: 'pointer' }}
                                >
                                  {subsectionContent}
                                </Link>
                              );
                            })}
                          </div>
                        )}

                        {/* Botones de acción - Ocultos en modo preview */}
                        {!isPreviewMode && (
                        <div className="pl-12 flex flex-wrap gap-2">
                          {/* Botón Ver Video/Unirse */}
                          {(lesson.recordedVideoUrl || (!lesson.isLive && lesson.videoUrl)) && (
                            <Link
                              href={`/dashboard/student/courses/${params.id}/livestream/${lesson.id}`}
                              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:shadow-md"
                              style={{ 
                                backgroundColor: COLORS.primary,
                                color: '#FFFFFF',
                              }}
                            >
                              <IconVideo size={16} />
                              Ver Video
                            </Link>
                          )}

                          {lesson.isLive && !lesson.recordedVideoUrl && (
                            <Link
                              href={`/dashboard/student/courses/${params.id}/livestream/${lesson.id}`}
                              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium animate-pulse transition-all duration-200"
                              style={{ 
                                backgroundColor: '#DC2626',
                                color: '#FFFFFF',
                              }}
                            >
                              <IconBroadcast size={16} />
                              Unirse a Conferencia
                            </Link>
                          )}

                          {!lesson.recordedVideoUrl && !lesson.isLive && !lesson.videoUrl && (
                            <span 
                              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                              style={{ 
                                backgroundColor: '#F3F4F6',
                                color: COLORS.text.muted,
                              }}
                            >
                              <IconVideo size={16} />
                              No disponible
                            </span>
                          )}

                          {/* Recursos */}
                          <button 
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:shadow-md disabled:opacity-50"
                            style={{ 
                              backgroundColor: COLORS.accent.primarySoft,
                              color: COLORS.primary,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenResources(lesson);
                            }}
                            disabled={!lesson.resourceIds || lesson.resourceIds.length === 0}
                          >
                            <IconFileText size={16} />
                            Recursos {lesson.resourceIds && lesson.resourceIds.length > 0 && `(${lesson.resourceIds.length})`}
                          </button>

                          {/* Encuestas */}
                          {(() => {
                            const ls = lessonSurveyData[lesson.id];
                            const survey = ls?.entrySurvey || entrySurvey;
                            const response = ls?.entryResponse || entryResponse;
                            
                            if (survey) {
                              const responded = !!response;
                              const disabled = !responded && !!ls?.entrySurvey && !ls.canAnswerEntry;
                              return (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openSurvey(ls?.entrySurvey ? lesson.id : null, survey, response);
                                  }}
                                  disabled={disabled}
                                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:shadow-md disabled:opacity-50"
                                  style={{ 
                                    backgroundColor: responded ? '#D1FAE5' : '#DBEAFE',
                                    color: responded ? COLORS.success : '#2563EB',
                                  }}
                                >
                                  <IconFileText size={16} />
                                  {responded ? 'Ver Encuesta' : 'Encuesta de Entrada'}
                                </button>
                              );
                            }
                            return null;
                          })()}

                          {(() => {
                            const ls = lessonSurveyData[lesson.id];
                            const survey = ls?.exitSurvey || exitSurvey;
                            const response = ls?.exitResponse || exitResponse;
                            
                            if (survey) {
                              const responded = !!response;
                              const needsEntry = !ls?.exitSurvey && exitSurvey && !entryResponse;
                              const disabled = !responded && (needsEntry || (!!ls?.exitSurvey && !ls.canAnswerExit));
                              return (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openSurvey(ls?.exitSurvey ? lesson.id : null, survey, response);
                                  }}
                                  disabled={disabled}
                                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:shadow-md disabled:opacity-50"
                                  style={{ 
                                    backgroundColor: responded ? '#D1FAE5' : '#FEF3C7',
                                    color: responded ? COLORS.success : '#D97706',
                                  }}
                                >
                                  <IconFileText size={16} />
                                  {responded ? 'Ver Encuesta' : 'Encuesta de Salida'}
                                </button>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        )}

                        {/* Fecha programada */}
                        {formatLessonDateTime(lesson) && (
                          <div 
                            className="pl-12 mt-3 flex items-center gap-2 text-sm"
                            style={{ color: COLORS.text.muted }}
                          >
                            <IconCalendar size={14} />
                            <span>{formatLessonDateTime(lesson)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ===== MODALES ===== */}
      
      {/* Modal de Encuesta */}
      {showSurveyModal && currentSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div 
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 sm:p-8"
            style={{ backgroundColor: COLORS.surface }}
          >
            <button
              onClick={() => setShowSurveyModal(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: COLORS.accent.primarySoft }}
            >
              <IconX size={18} style={{ color: COLORS.text.secondary }} />
            </button>

            {/* Timer para encuesta de salida */}
            {currentSurvey.type === 'exit' && !currentResponse && timeUntilExitSurveyEnabled && (
              <div 
                className="mb-4 p-4 rounded-xl flex items-center gap-3"
                style={{ backgroundColor: '#FEF3C7' }}
              >
                <IconAlertCircle size={24} style={{ color: '#D97706' }} />
                <p className="font-semibold" style={{ color: '#92400E' }}>
                  Podrás completar la encuesta en: {timeUntilExitSurveyEnabled}
                </p>
              </div>
            )}

            <h3 className="font-bold text-2xl mb-2" style={{ color: COLORS.text.primary }}>
              {currentSurvey.title}
            </h3>
            {currentSurvey.description && (
              <p className="mb-6" style={{ color: COLORS.text.secondary }}>
                {currentSurvey.description}
              </p>
            )}

            {currentResponse ? (
              /* Modo visualización */
              <div className="space-y-6">
                {currentSurvey.questions.map((question, index) => {
                  const answer = surveyAnswers[question.id];
                  return (
                    <div key={question.id} className="p-4 rounded-xl" style={{ backgroundColor: '#F9FAFB' }}>
                      <p className="font-semibold mb-3" style={{ color: COLORS.text.primary }}>
                        {index + 1}. {question.questionText}
                        {question.isRequired && <span style={{ color: COLORS.error }} className="ml-1">*</span>}
                      </p>

                      {(question.type === 'short_text' || question.type === 'text') && (
                        <div className="p-3 rounded-lg" style={{ backgroundColor: COLORS.surface }}>
                          {answer || '(Sin respuesta)'}
                        </div>
                      )}

                      {question.type === 'long_text' && (
                        <div className="p-3 rounded-lg whitespace-pre-wrap" style={{ backgroundColor: COLORS.surface }}>
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
                                style={{ accentColor: COLORS.primary }}
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
                                style={{ accentColor: COLORS.primary }}
                              />
                              <span className={Array.isArray(answer) && answer.includes(option.value) ? 'font-semibold' : ''}>
                                {option.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type === 'dropdown' && (
                        <div className="p-3 rounded-lg" style={{ backgroundColor: COLORS.surface }}>
                          {question.options?.find(o => o.value === answer)?.label || answer || '(Sin respuesta)'}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div 
                  className="flex items-center gap-3 p-4 rounded-xl"
                  style={{ backgroundColor: '#D1FAE5' }}
                >
                  <IconCheck size={24} style={{ color: COLORS.success }} />
                  <span className="font-medium" style={{ color: '#065F46' }}>Ya has respondido esta encuesta</span>
                </div>
              </div>
            ) : (
              /* Modo respuesta */
              <div className="space-y-6">
                {currentSurvey.questions.map((question, index) => (
                  <div key={question.id}>
                    <label className="block mb-2">
                      <span className="font-semibold" style={{ color: COLORS.text.primary }}>
                        {index + 1}. {question.questionText}
                        {question.isRequired && <span style={{ color: COLORS.error }} className="ml-1">*</span>}
                      </span>
                    </label>

                    {(question.type === 'short_text' || question.type === 'text') && (
                      <input
                        type="text"
                        value={(surveyAnswers[question.id] as string) || ''}
                        onChange={(e) => handleSurveyAnswerChange(question.id, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                        style={{ 
                          borderColor: COLORS.accent.border,
                          backgroundColor: COLORS.surface,
                        }}
                        placeholder="Tu respuesta"
                      />
                    )}

                    {question.type === 'long_text' && (
                      <textarea
                        value={(surveyAnswers[question.id] as string) || ''}
                        onChange={(e) => handleSurveyAnswerChange(question.id, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 h-24"
                        style={{ 
                          borderColor: COLORS.accent.border,
                          backgroundColor: COLORS.surface,
                        }}
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
                              style={{ accentColor: COLORS.primary }}
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
                              style={{ accentColor: COLORS.primary }}
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
                        className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                        style={{ 
                          borderColor: COLORS.accent.border,
                          backgroundColor: COLORS.surface,
                        }}
                      >
                        <option value="">Selecciona una opción</option>
                        {question.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowSurveyModal(false)}
                    className="px-6 py-3 rounded-full font-medium"
                    style={{ 
                      backgroundColor: '#F3F4F6',
                      color: COLORS.text.secondary,
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmitSurvey}
                    disabled={submittingSurvey}
                    className="px-6 py-3 rounded-full font-medium flex items-center gap-2"
                    style={{ 
                      backgroundColor: COLORS.primary,
                      color: '#FFFFFF',
                    }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div 
            className="w-full max-w-2xl rounded-2xl p-6 sm:p-8"
            style={{ backgroundColor: COLORS.surface }}
          >
            <button
              onClick={() => setShowCertificateModal(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: COLORS.accent.primarySoft }}
            >
              <IconX size={18} style={{ color: COLORS.text.secondary }} />
            </button>

            <div className="flex flex-col items-center text-center">
              {certificateEligible ? (
                <>
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: COLORS.success }}
                  >
                    <IconCheck size={48} style={{ color: '#FFFFFF' }} />
                  </div>
                  <h3 className="font-bold text-2xl mb-2" style={{ color: COLORS.text.primary }}>
                    ¡Felicidades!
                  </h3>
                  <p className="mb-6" style={{ color: COLORS.text.secondary }}>
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
                          await new Promise(r => setTimeout(r, 0));
                          await new Promise(r => requestAnimationFrame(r));

                          const node = certDomRef.current;
                          if (!node) throw new Error('Certificado no disponible');

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
                          }
                        } catch (e) {
                          console.error('Error exportando certificado:', e instanceof Error ? e.message : e);
                          alert('Error al generar certificado');
                        } finally {
                          setExportingPdf(false);
                        }
                      }}
                      className="flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-lg"
                      style={{ backgroundColor: COLORS.success, color: '#FFFFFF' }}
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
                    <button className="px-8 py-4 rounded-full" style={{ backgroundColor: '#F3F4F6' }} disabled>
                      <span className="loading loading-spinner"></span>
                      Preparando certificado...
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: COLORS.error }}
                  >
                    <IconAlertCircle size={48} style={{ color: '#FFFFFF' }} />
                  </div>
                  <h3 className="font-bold text-2xl mb-2" style={{ color: COLORS.text.primary }}>
                    Certificado No Disponible
                  </h3>
                  <p className="mb-6" style={{ color: COLORS.text.secondary }}>
                    Aún no cumples con todos los requisitos
                  </p>

                  <div className="w-full p-6 rounded-xl mb-6" style={{ backgroundColor: '#F9FAFB' }}>
                    <h4 className="font-semibold mb-3 text-left" style={{ color: COLORS.text.primary }}>
                      Requisitos Faltantes:
                    </h4>
                    <ul className="space-y-2">
                      {eligibilityReasons.map((reason, index) => (
                        <li key={index} className="flex items-start gap-2 text-left">
                          <IconX size={20} style={{ color: COLORS.error }} className="flex-shrink-0 mt-0.5" />
                          <span style={{ color: COLORS.text.secondary }}>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {course.certificateRules && (
                    <div 
                      className="w-full p-4 rounded-xl mb-4 border"
                      style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}
                    >
                      <h4 className="font-semibold mb-2 text-left flex items-center gap-2" style={{ color: '#1E40AF' }}>
                        <IconAlertCircle size={20} />
                        Requisitos del Curso
                      </h4>
                      <ul className="text-sm space-y-1 text-left">
                        {course.certificateRules.requireEnrollmentOnly && (
                          <li className="flex items-center gap-2">
                            <IconCheck size={16} style={{ color: COLORS.success }} />
                            Solo requiere inscripción
                          </li>
                        )}
                        {course.certificateRules.requireSurveys && (
                          <li className="flex items-center gap-2">
                            <IconCheck size={16} style={{ color: COLORS.success }} />
                            Completar encuestas de entrada y salida
                          </li>
                        )}
                        {course.certificateRules.requireAttendance && (
                          <li className="flex items-center gap-2">
                            <IconCheck size={16} style={{ color: COLORS.success }} />
                            Asistir al menos 5 minutos a todas las lecciones
                          </li>
                        )}
                        <li className="flex items-center gap-2 font-semibold" style={{ color: COLORS.primary }}>
                          <IconClock size={16} />
                          Disponible {course.certificateRules.hoursAfterStart || 1} hora(s) después del inicio
                        </li>
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={() => setShowCertificateModal(false)}
                    className="w-full px-6 py-3 rounded-full font-medium"
                    style={{ backgroundColor: COLORS.primary, color: '#FFFFFF' }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div 
            className="w-full max-w-2xl rounded-2xl p-6 sm:p-8"
            style={{ backgroundColor: COLORS.surface }}
          >
            <button
              onClick={() => setShowResourcesModal(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: COLORS.accent.primarySoft }}
            >
              <IconX size={18} style={{ color: COLORS.text.secondary }} />
            </button>

            <h3 className="font-bold text-2xl mb-4" style={{ color: COLORS.text.primary }}>
              Recursos de la Lección
            </h3>

            {currentLessonResources.length === 0 ? (
              <div className="text-center py-8">
                <IconFileText size={48} className="mx-auto mb-4" style={{ color: COLORS.text.muted, opacity: 0.5 }} />
                <p style={{ color: COLORS.text.muted }}>No hay recursos disponibles</p>
              </div>
            ) : (
              <div className="space-y-3">
                      {currentLessonResources.map((resource, idx) => (
                  <div 
                          key={resource.id || idx} 
                    className="p-4 rounded-xl"
                    style={{ backgroundColor: '#F9FAFB' }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <IconFileText size={24} style={{ color: COLORS.primary }} className="flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold" style={{ color: COLORS.text.primary }}>{resource.title}</h4>
                        <p className="text-sm truncate" style={{ color: COLORS.text.muted }}>{resource.fileName}</p>
                        {resource.fileSize && (
                          <p className="text-xs" style={{ color: COLORS.text.muted }}>
                            {(resource.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {canPreview(resource.fileType) && (
                        <button
                          onClick={() => handlePreviewResource(resource)}
                          className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium"
                          style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}
                        >
                          <IconEye size={16} />
                          Ver
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadResource(resource)}
                        className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium"
                        style={{ backgroundColor: COLORS.primary, color: '#FFFFFF' }}
                      >
                        <IconDownload size={16} />
                        Descargar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setShowResourcesModal(false)} 
                className="px-6 py-3 rounded-full font-medium"
                style={{ backgroundColor: '#F3F4F6', color: COLORS.text.secondary }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Preview */}
      {showPreviewModal && previewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div 
            className="w-full max-w-4xl max-h-[90vh] rounded-2xl p-6 sm:p-8 overflow-hidden flex flex-col"
            style={{ backgroundColor: COLORS.surface }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl" style={{ color: COLORS.text.primary }}>
                {previewResource.title}
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: COLORS.accent.primarySoft }}
              >
                <IconX size={18} style={{ color: COLORS.text.secondary }} />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {previewResource.fileType.includes('pdf') && (
                <iframe
                  src={previewResource.fileUrl}
                  className="w-full h-[70vh] border-0 rounded-lg"
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

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => handleDownloadResource(previewResource)}
                className="flex items-center gap-2 px-6 py-3 rounded-full font-medium"
                style={{ backgroundColor: COLORS.primary, color: '#FFFFFF' }}
              >
                <IconDownload size={20} />
                Descargar
              </button>
              <button 
                onClick={() => setShowPreviewModal(false)} 
                className="px-6 py-3 rounded-full font-medium"
                style={{ backgroundColor: '#F3F4F6', color: COLORS.text.secondary }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resultado de Encuesta */}
      {showSurveyResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div 
            className="w-full max-w-md rounded-2xl p-6 sm:p-8 text-center"
            style={{ backgroundColor: COLORS.surface }}
          >
            <div className="flex justify-center mb-4">
              <div 
                className="rounded-full p-3"
                style={{ backgroundColor: surveyResultType === 'success' ? COLORS.success : COLORS.error }}
              >
                {surveyResultType === 'success' ? (
                  <IconCheck size={48} style={{ color: '#FFFFFF' }} />
                ) : (
                  <IconAlertCircle size={48} style={{ color: '#FFFFFF' }} />
                )}
              </div>
            </div>
            <h3 className="font-bold text-2xl mb-2" style={{ color: COLORS.text.primary }}>
              {surveyResultType === 'success' ? '¡Éxito!' : 'Atención'}
            </h3>
            <p className="mb-6 whitespace-pre-line" style={{ color: COLORS.text.secondary }}>
              {surveyResultMessage}
            </p>
            <button
              onClick={() => setShowSurveyResultModal(false)}
              className="px-6 py-3 rounded-full font-medium"
              style={{ backgroundColor: COLORS.primary, color: '#FFFFFF' }}
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
