"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconPlayerPlay,
  IconCheck,
  IconX,
  IconShare,
  IconDotsVertical,
  IconStar,
  IconStarFilled,
  IconMessageCircle,
  IconNote,
  IconVideo,
  IconFile,
  IconDownload,
  IconClock,
  IconSend,
  IconTrash,
  IconEdit,
  IconThumbUp,
  IconLoader2,
  IconPaperclip,
  IconHeart,
  IconHeartFilled,
  IconGift,
  IconHome,
  IconArrowLeft,
  IconFileText,
  IconPhoto,
  IconClipboardCheck,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import CourseRatingModal from "@/components/course/CourseRatingModal";
import RichTextContent from "@/components/ui/RichTextContent";

// ===== TYPES =====
interface Lesson {
  id: string;
  title: string;
  description?: string;
  type: string;
  content?: string; // JSON string con subsecciones
  videoUrl?: string;
  durationMinutes?: number;
  order: number;
  sectionId?: string;
  subsections?: Subsection[]; // Parsed subsections
}

interface Section {
  id: string;
  title: string;
  description?: string;
  order: number;
  isExpanded?: boolean;
}

interface ContentBlock {
  id: string;
  type: 'heading' | 'text' | 'richtext' | 'image' | 'video' | 'attachment' | 'list' | 'table' | 'quiz' | 'gallery';
  content: string;
  data?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    videoType?: 'youtube' | 'vimeo' | 'url';
    items?: string[];
    rows?: number;
    cols?: number;
    cells?: string[][];
    // Quiz data
    quizId?: string;
    quizTitle?: string;
    description?: string;
    styles?: any;
  };
}

interface Subsection {
  id: string;
  title: string;
  blocks?: ContentBlock[];
}

interface Resource {
  id: string;
  fileName: string;
  fileType: string;
  url: string;
  sizeKb?: number;
  category: string;
}

interface Note {
  id: string;
  content: string;
  video_timestamp: number;
  created_at: string;
  updated_at: string;
}

interface QuestionAuthor {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

interface Answer {
  id: string;
  answerText: string;
  isInstructorAnswer: boolean;
  isAccepted: boolean;
  upvotes: number;
  createdAt: string;
  author: QuestionAuthor | null;
}

interface Question {
  id: string;
  questionText: string;
  videoTimestamp: number;
  isResolved: boolean;
  upvotes: number;
  createdAt: string;
  author: QuestionAuthor | null;
  answers: Answer[];
  answersCount: number;
}

interface CourseInfo {
  id: string;
  title: string;
  teacherIds: string[];
}

// ===== TOKENS (Cinema Mode Design) =====
const TOKENS = {
  colors: {
    topbar: "#111118",
    accent: "#A435F0",
    accentSoft: "#F3E8FF",
    backgroundApp: "#F3F4F6",
    canvas: "#FFFFFF",
    textPrimary: "#111827",
    textSecondary: "#4B5563",
    textMuted: "#9CA3AF",
    textLink: "#A435F0",
    textOnDark: "#F9FAFB",
    success: "#22C55E",
    border: "rgba(15, 23, 42, 0.1)",
  },
  spacing: {
    topbarHeight: "64px",
  }
};

// ===== HELPER: Format timestamp =====
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ===== HELPER: Format file size =====
function formatFileSize(kb?: number): string {
  if (!kb) return '';
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// ===== HELPER: Get file icon based on type =====
function getFileIcon(fileType: string) {
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('image')) return '🖼️';
  if (fileType.includes('video')) return '🎬';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📑';
  return '📎';
}

// ===== HELPER: Extract YouTube video ID =====
function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// ===== HELPER: Extract path from Supabase Storage URL =====
const extractStoragePath = (url: string): { bucket: string; path: string } | null => {
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
  if (match) {
    return { bucket: match[1], path: decodeURIComponent(match[2]) };
  }
  return null;
};

// ===== HELPER: Get content type icons for a subsection =====
const getSubsectionContentIcons = (blocks: ContentBlock[] | undefined): React.ReactElement[] => {
  if (!blocks || blocks.length === 0) {
    return [<IconFileText key="default" size={12} title="Documento" />];
  }

  const hasText = blocks.some(b => ['text', 'richtext', 'table', 'heading', 'list'].includes(b.type));
  const hasGallery = blocks.some(b => b.type === 'gallery');
  const hasVideo = blocks.some(b => b.type === 'video');
  const hasAttachment = blocks.some(b => b.type === 'attachment');
  const hasQuiz = blocks.some(b => b.type === 'quiz');

  const icons: React.ReactElement[] = [];

  // Si tiene quiz, solo puede combinarse con adjunto
  if (hasQuiz) {
    icons.push(<IconClipboardCheck key="quiz" size={12} title="Evaluación" />);
    if (hasAttachment) {
      icons.push(<IconPaperclip key="attachment" size={12} title="Adjunto" />);
    }
    return icons;
  }

  // Para otros tipos, combinar todos los que apliquen
  if (hasText) {
    icons.push(<IconFileText key="text" size={12} title="Documento" />);
  }
  if (hasGallery) {
    icons.push(<IconPhoto key="gallery" size={12} title="Galería" />);
  }
  if (hasVideo) {
    icons.push(<IconVideo key="video" size={12} title="Video" />);
  }
  if (hasAttachment) {
    icons.push(<IconPaperclip key="attachment" size={12} title="Adjunto" />);
  }

  // Si no hay ningún tipo reconocido, mostrar documento por defecto
  if (icons.length === 0) {
    icons.push(<IconFileText key="default" size={12} title="Documento" />);
  }

  return icons;
};

// ===== COMPONENT: Attachment Block (con URL firmada) =====
function AttachmentBlock({ block }: { block: ContentBlock }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileSize = block.data?.fileSize ? formatFileSize(block.data.fileSize / 1024) : '';

  const handleDownload = async () => {
    // Si ya tenemos URL firmada válida, usarla
    if (signedUrl) {
      window.open(signedUrl, '_blank');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Extraer bucket y path de la URL pública guardada
      console.log('[AttachmentBlock] URL original:', block.content);
      const storageInfo = extractStoragePath(block.content);
      console.log('[AttachmentBlock] Storage info:', storageInfo);

      if (!storageInfo) {
        // Si no es URL de Supabase Storage, abrir directamente
        console.log('[AttachmentBlock] No es URL de Supabase, abriendo directamente');
        window.open(block.content, '_blank');
        return;
      }

      // Obtener URL firmada
      const apiUrl = `/api/student/getSignedUrl?bucket=${storageInfo.bucket}&path=${encodeURIComponent(storageInfo.path)}&expiresIn=3600`;
      console.log('[AttachmentBlock] Llamando API:', apiUrl);
      const res = await fetch(apiUrl);
      console.log('[AttachmentBlock] Response status:', res.status);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al obtener acceso al archivo');
      }

      const data = await res.json();
      setSignedUrl(data.signedUrl);
      window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      console.error('Error getting signed URL:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      setError(err?.message || 'Error al acceder al archivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-4 flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
        <IconPaperclip className="w-5 h-5 text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{block.data?.fileName || 'Archivo adjunto'}</p>
        {fileSize && <p className="text-xs text-gray-500">{fileSize}</p>}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Cargando...' : 'Ver archivo'}
      </button>
    </div>
  );
}

// ===== COMPONENT: Quiz Block =====
interface QuizOption {
  label: string;
  value: string;
  imageUrl?: string;
  isCorrect?: boolean;
}

interface QuizQuestion {
  id: string;
  type: string;
  questionText: string;
  options?: QuizOption[];
  correctAnswer?: string | string[];
  isRequired?: boolean;
}

interface QuizData {
  id: string;
  title: string;
  description?: string;
  type: string;
  questions: QuizQuestion[];
}

function QuizBlock({
  quizId,
  quizTitle,
  courseId,
  lessonId,
  subsectionIndex,
  totalSubsections,
  onProgressUpdate,
  onQuizScoreUpdate,
  userId,
}: {
  quizId?: string;
  quizTitle?: string;
  courseId: string;
  lessonId?: string;
  subsectionIndex?: number;
  totalSubsections?: number;
  onProgressUpdate?: (subsectionIndex: number, isCompleted: boolean) => void;
  onQuizScoreUpdate?: (
    lessonId: string,
    subsectionIndex: number,
    score: { correct: number; total: number } | null
  ) => void;
  userId?: string;
}) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Función para obtener el mensaje de retroalimentación basado en el número de aciertos
  const getFeedbackMessage = (correctAnswers: number): { title: string; message: string; type: 'low' | 'medium' | 'high' } => {
    if (correctAnswers <= 4) {
      return {
        title: 'Necesitas reforzar',
        message: 'Los resultados indican que todavía hay dudas importantes sobre los conceptos de democracia, ciudadanía y ciudadanía universitaria. Se recomienda releer las definiciones básicas, revisar los recursos digitales y regresar al mapa conceptual para reforzar la comprensión antes de avanzar.',
        type: 'low'
      };
    } else if (correctAnswers <= 7) {
      return {
        title: 'Buen progreso',
        message: 'Se reconoce un dominio intermedio de los conceptos; hay una base, pero aún existen áreas por clarificar. Es conveniente revisar con atención las preguntas falladas y contrastarlas con ejemplos concretos de la vida universitaria para fortalecer la comprensión.',
        type: 'medium'
      };
    } else {
      return {
        title: '¡Excelente trabajo!',
        message: 'Los resultados muestran una comprensión adecuada de los conceptos básicos, lo que permite avanzar al siguiente tema con confianza. Se sugiere seguir conectando estas ideas con experiencias reales de participación y ejercicios de ciudadanía universitaria.',
        type: 'high'
      };
    }
  };

  useEffect(() => {
    if (!quizId) {
      setLoading(false);
      setError("No se encontró el ID del quiz");
      return;
    }

    const loadQuiz = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/student/getSurvey?surveyId=${quizId}&courseId=${courseId}`);
        if (!res.ok) throw new Error('Error al cargar el quiz');

        const data = await res.json();
        const survey = data.survey;

        if (survey) {
          const quizData = {
            id: survey.id,
            title: survey.title,
            description: survey.description,
            type: survey.type,
            questions: survey.questions || [],
          };
          setQuiz(quizData);

          // Cargar respuestas guardadas si existen
          if (userId && survey.id) {
            try {
              const savedAnswersRes = await fetch(
                `/api/student/getQuizResponse?surveyId=${survey.id}&userId=${userId}`
              );
              if (savedAnswersRes.ok) {
                const savedData = await savedAnswersRes.json();
                if (savedData.response && savedData.response.answers) {
                  // Restaurar respuestas guardadas
                  const savedAnswers: Record<string, string | string[]> = {};
                  savedData.response.answers.forEach((ans: any) => {
                    savedAnswers[ans.questionId] = ans.answer;
                  });
                  setAnswers(savedAnswers);
                  // Si hay respuestas guardadas, marcar como enviado y calcular score
                  if (Object.keys(savedAnswers).length > 0) {
                    setSubmitted(true);
                    setShowResults(true);
                    // Calcular score
                    let correctCount = 0;
                    quizData.questions.forEach((q: any) => {
                      const userAnswer = savedAnswers[q.id];
                      if (q.options && q.options.some((o: any) => o.isCorrect)) {
                        const correctOptions = q.options.filter((o: any) => o.isCorrect).map((o: any) => o.value);
                        if (q.type === 'multiple_choice') {
                          const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
                          if (correctOptions.length === userAnswers.length &&
                            correctOptions.every((c: string) => userAnswers.includes(c))) {
                            correctCount++;
                          }
                        } else {
                          if (correctOptions.includes(userAnswer as string)) {
                            correctCount++;
                          }
                        }
                      } else if (q.correctAnswer) {
                        if (Array.isArray(q.correctAnswer)) {
                          if (Array.isArray(userAnswer) &&
                            userAnswer.length === q.correctAnswer.length &&
                            userAnswer.every((a: string) => q.correctAnswer?.includes(a))) {
                            correctCount++;
                          }
                        } else if (userAnswer === q.correctAnswer) {
                          correctCount++;
                        }
                      }
                    });
                    setScore({ correct: correctCount, total: quizData.questions.length });
                    if (onQuizScoreUpdate && lessonId && subsectionIndex !== undefined) {
                      onQuizScoreUpdate(lessonId, subsectionIndex, {
                        correct: correctCount,
                        total: quizData.questions.length,
                      });
                    }

                    // Solo actualizar progreso si el quiz fue APROBADO (≥60%)
                    // Esto evita que la siguiente lección se desbloquee si no se aprobó el quiz
                    const percentage = correctCount / quizData.questions.length;
                    const isQuizPassed = percentage >= 0.6;

                    if (isQuizPassed && onProgressUpdate && subsectionIndex !== undefined && totalSubsections !== undefined) {
                      const isLastSubsection = subsectionIndex === totalSubsections - 1;
                      // Usar setTimeout para asegurar que el estado se actualice después del render
                      setTimeout(() => {
                        onProgressUpdate(subsectionIndex, isLastSubsection);
                      }, 100);
                    }
                  }
                }
              }
            } catch (err) {
              console.error('Error loading saved answers:', err);
              // Continuar sin respuestas guardadas
            }
          }
        } else {
          setError('Quiz no encontrado');
        }
      } catch (err: any) {
        console.error("Error loading quiz:", err);
        setError(err.message || "Error al cargar el quiz");
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [quizId, courseId, userId]);

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!quiz || !quizId || !userId) return;

    setSavingAnswers(true);

    try {
      // Calcular score
      let correctCount = 0;
      quiz.questions.forEach(q => {
        const userAnswer = answers[q.id];

        // Verificar usando isCorrect en las opciones
        if (q.options && q.options.some(o => o.isCorrect)) {
          const correctOptions = q.options.filter(o => o.isCorrect).map(o => o.value);

          if (q.type === 'multiple_choice') {
            // Para multiple choice, todas las correctas deben estar seleccionadas
            const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
            if (correctOptions.length === userAnswers.length &&
              correctOptions.every(c => userAnswers.includes(c))) {
              correctCount++;
            }
          } else {
            // Para single choice
            if (correctOptions.includes(userAnswer as string)) {
              correctCount++;
            }
          }
        } else if (q.correctAnswer) {
          // Fallback a correctAnswer si no hay isCorrect
          if (Array.isArray(q.correctAnswer)) {
            if (Array.isArray(userAnswer) &&
              userAnswer.length === q.correctAnswer.length &&
              userAnswer.every(a => q.correctAnswer?.includes(a))) {
              correctCount++;
            }
          } else if (userAnswer === q.correctAnswer) {
            correctCount++;
          }
        }
      });

      // Preparar respuestas para guardar
      const answersToSave = quiz.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || '',
      }));

      // Guardar respuestas en la base de datos
      const saveRes = await fetch('/api/student/submitQuiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: quizId,
          courseId,
          lessonId: lessonId || null,
          answers: answersToSave,
        }),
      });

      if (!saveRes.ok) {
        console.error('Error saving quiz answers');
        // Continuar de todas formas para mostrar el resultado
      }

      setScore({ correct: correctCount, total: quiz.questions.length });
      setSubmitted(true);
      setShowResults(true);
      setShowFeedbackModal(true);
      if (onQuizScoreUpdate && lessonId && subsectionIndex !== undefined) {
        onQuizScoreUpdate(lessonId, subsectionIndex, {
          correct: correctCount,
          total: quiz.questions.length,
        });
      }

      // Actualizar progreso cuando se completa el quiz
      if (onProgressUpdate && subsectionIndex !== undefined && totalSubsections !== undefined) {
        // Marcar esta subsección como completada
        const isLastSubsection = subsectionIndex === totalSubsections - 1;
        onProgressUpdate(subsectionIndex, isLastSubsection);
      }
    } catch (err) {
      console.error('Error submitting quiz:', err);
    } finally {
      setSavingAnswers(false);
    }
  };

  const handleRetry = async () => {
    // Resetear respuestas localmente
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    setShowResults(false);
    if (onQuizScoreUpdate && lessonId && subsectionIndex !== undefined) {
      onQuizScoreUpdate(lessonId, subsectionIndex, null);
    }

    // Eliminar respuestas guardadas de la base de datos
    if (quizId && userId) {
      try {
        await fetch('/api/student/deleteQuizResponse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            surveyId: quizId,
            userId,
          }),
        });
      } catch (err) {
        console.error('Error deleting quiz response:', err);
        // Continuar de todas formas
      }
    }
  };

  if (loading) {
    return (
      <div className="my-6 p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
        <div className="flex items-center justify-center gap-3 text-purple-600">
          <IconLoader2 className="w-6 h-6 animate-spin" />
          <span className="font-medium">Cargando quiz...</span>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="my-6 p-6 bg-red-50 rounded-xl border border-red-200">
        <div className="flex items-center gap-3 text-red-600">
          <IconX className="w-6 h-6" />
          <span className="font-medium">{error || "No se pudo cargar el quiz"}</span>
        </div>
      </div>
    );
  }

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'single_choice': 'Selección única',
      'multiple_choice': 'Selección múltiple',
      'short_text': 'Respuesta corta',
      'long_text': 'Respuesta larga',
      'dropdown': 'Desplegable',
      'quiz': 'Quiz',
    };
    return labels[type] || type;
  };

  const isCorrectAnswer = (questionId: string, optionValue: string) => {
    const question = quiz.questions.find(q => q.id === questionId);
    if (!question) return false;

    // Primero verificar si la opción tiene isCorrect marcado
    const option = question.options?.find(o => o.value === optionValue);
    if (option?.isCorrect) return true;

    // Si no, verificar contra correctAnswer
    if (!question.correctAnswer) return false;

    if (Array.isArray(question.correctAnswer)) {
      return question.correctAnswer.includes(optionValue);
    }
    return question.correctAnswer === optionValue;
  };

  return (
    <div className="my-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 overflow-hidden">
      {/* Header */}
      <div className="bg-[#192170] text-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <IconCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{quiz.title || quizTitle || "Quiz"}</h3>
            {quiz.description && (
              <p className="text-white/80 text-sm mt-1">{quiz.description}</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-white/70">
          <span>{quiz.questions.length} preguntas</span>
          {score && (
            <span className="bg-white/20 px-3 py-1 rounded-full font-semibold">
              Puntuación: {score.correct}/{score.total} ({Math.round((score.correct / score.total) * 100)}%)
            </span>
          )}
        </div>
      </div>

      {/* Questions */}
      <div className="p-6 space-y-6">
        {quiz.questions.map((question, index) => (
          <div
            key={question.id}
            className={cn(
              "p-5 rounded-xl border transition-all",
              showResults && question.correctAnswer
                ? isCorrectAnswer(question.id, answers[question.id] as string)
                  ? "bg-green-50 border-green-300"
                  : "bg-red-50 border-red-300"
                : "bg-white border-gray-200"
            )}
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="w-8 h-8 bg-[#192170] text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{question.questionText}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {getQuestionTypeLabel(question.type)}
                  {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                </p>
              </div>
            </div>

            {/* Options for choice questions */}
            {['single_choice', 'multiple_choice', 'dropdown', 'quiz'].includes(question.type) && question.options && (
              <div className="space-y-2 ml-11">
                {question.options.map((option, optIndex) => {
                  const optionValue = option.value;
                  const optionLabel = option.label;

                  const isSelected = question.type === 'multiple_choice'
                    ? (answers[question.id] as string[] || []).includes(optionValue)
                    : answers[question.id] === optionValue;

                  // Solo mostrar feedback para respuestas SELECCIONADAS
                  // No revelar cuáles son las correctas si no las seleccionó
                  const optionIsCorrect = option.isCorrect || isCorrectAnswer(question.id, optionValue);
                  const isSelectedAndCorrect = showResults && isSelected && optionIsCorrect;
                  const isSelectedAndWrong = showResults && isSelected && !optionIsCorrect;

                  return (
                    <label
                      key={optIndex}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                        submitted ? "cursor-default" : "hover:bg-gray-50",
                        isSelected && !showResults && "bg-purple-50 border-purple-300",
                        isSelectedAndCorrect && "bg-green-100 border-green-400",
                        isSelectedAndWrong && "bg-red-100 border-red-400",
                        !isSelected && !isSelectedAndCorrect && !isSelectedAndWrong && "border-gray-200"
                      )}
                    >
                      <input
                        type={question.type === 'multiple_choice' ? 'checkbox' : 'radio'}
                        name={question.id}
                        value={optionValue}
                        checked={isSelected}
                        disabled={submitted}
                        onChange={(e) => {
                          if (question.type === 'multiple_choice') {
                            const current = (answers[question.id] as string[]) || [];
                            if (e.target.checked) {
                              handleAnswerChange(question.id, [...current, optionValue]);
                            } else {
                              handleAnswerChange(question.id, current.filter(o => o !== optionValue));
                            }
                          } else {
                            handleAnswerChange(question.id, optionValue);
                          }
                        }}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span className={cn(
                        "flex-1",
                        isSelectedAndCorrect && "font-semibold text-green-700",
                        isSelectedAndWrong && "text-red-700"
                      )}>
                        {optionLabel}
                      </span>
                      {isSelectedAndCorrect && (
                        <IconCheck className="w-5 h-5 text-green-600" />
                      )}
                      {isSelectedAndWrong && (
                        <IconX className="w-5 h-5 text-red-600" />
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            {/* Text input for text questions */}
            {['short_text', 'long_text'].includes(question.type) && (
              <div className="ml-11">
                {question.type === 'short_text' ? (
                  <input
                    type="text"
                    value={(answers[question.id] as string) || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    disabled={submitted}
                    placeholder="Escribe tu respuesta..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50"
                  />
                ) : (
                  <textarea
                    value={(answers[question.id] as string) || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    disabled={submitted}
                    placeholder="Escribe tu respuesta..."
                    rows={4}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 resize-none"
                  />
                )}
              </div>
            )}
          </div>
        ))}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-purple-200">
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length === 0 || savingAnswers}
              className="px-6 py-3 bg-[#192170] text-white rounded-lg font-semibold hover:bg-[#141a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {savingAnswers ? (
                <>
                  <IconLoader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <IconCheck className="w-5 h-5" />
                  Enviar respuestas
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-purple-100 text-purple-700 rounded-lg font-semibold hover:bg-purple-200 transition-colors flex items-center gap-2"
            >
              Intentar de nuevo
            </button>
          )}

          {score && (() => {
            const percentage = score.correct / score.total;
            const passed = percentage >= 0.6;
            return (
              <div className={cn(
                "text-lg font-bold px-4 py-2 rounded-lg",
                passed
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              )}>
                {passed ? "¡Aprobado! " : "No aprobado - "}
                {Math.round(percentage * 100)}%
                {!passed && (
                  <span className="text-sm font-normal ml-2">
                    (Se requiere 60%)
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Modal de Retroalimentación General */}
      {showFeedbackModal && score && (() => {
        const feedback = getFeedbackMessage(score.correct);
        const bgColor = feedback.type === 'high' ? 'bg-emerald-50' : feedback.type === 'medium' ? 'bg-amber-50' : 'bg-red-50';
        const borderColor = feedback.type === 'high' ? 'border-emerald-200' : feedback.type === 'medium' ? 'border-amber-200' : 'border-red-200';
        const titleColor = feedback.type === 'high' ? 'text-emerald-700' : feedback.type === 'medium' ? 'text-amber-700' : 'text-red-700';
        const iconBgColor = feedback.type === 'high' ? 'bg-emerald-100' : feedback.type === 'medium' ? 'bg-amber-100' : 'bg-red-100';
        const iconColor = feedback.type === 'high' ? 'text-emerald-600' : feedback.type === 'medium' ? 'text-amber-600' : 'text-red-600';
        const buttonColor = feedback.type === 'high' ? 'bg-emerald-600 hover:bg-emerald-700' : feedback.type === 'medium' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700';

        return (
          <dialog className="modal modal-open">
            <div className={cn("modal-box max-w-lg", bgColor, borderColor, "border-2")}>
              <div className="flex flex-col items-center text-center">
                {/* Icono */}
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", iconBgColor)}>
                  {feedback.type === 'high' ? (
                    <IconStar className={cn("w-8 h-8", iconColor)} />
                  ) : feedback.type === 'medium' ? (
                    <IconThumbUp className={cn("w-8 h-8", iconColor)} />
                  ) : (
                    <IconNote className={cn("w-8 h-8", iconColor)} />
                  )}
                </div>

                {/* Puntuación */}
                <div className="mb-4">
                  <span className={cn("text-4xl font-bold", titleColor)}>
                    {score.correct}/{score.total}
                  </span>
                  <p className="text-gray-500 text-sm mt-1">aciertos</p>
                </div>

                {/* Título */}
                <h3 className={cn("text-xl font-bold mb-3", titleColor)}>
                  {feedback.title}
                </h3>

                {/* Mensaje */}
                <p className="text-gray-700 leading-relaxed mb-6">
                  {feedback.message}
                </p>

                {/* Botón */}
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className={cn("px-6 py-3 text-white rounded-lg font-semibold transition-colors", buttonColor)}
                >
                  Entendido
                </button>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop bg-black/50">
              <button onClick={() => setShowFeedbackModal(false)}>close</button>
            </form>
          </dialog>
        );
      })()}
    </div>
  );
}

// ===== COMPONENT: Content Block Renderer =====
function ContentBlockRenderer({
  block,
  courseId,
  lessonId,
  subsectionIndex,
  totalSubsections,
  userId,
  onProgressUpdate,
  onQuizScoreUpdate,
}: {
  block: ContentBlock;
  courseId: string;
  lessonId?: string;
  subsectionIndex?: number;
  totalSubsections?: number;
  userId?: string;
  onProgressUpdate?: (subsectionIndex: number, isCompleted: boolean) => void;
  onQuizScoreUpdate?: (
    lessonId: string,
    subsectionIndex: number,
    score: { correct: number; total: number } | null
  ) => void;
}) {
  switch (block.type) {
    case 'heading':
      {
        // Detectar si el contenido contiene HTML
        const hasHTML = block.content && /<[a-z][\s\S]*>/i.test(block.content);

        if (hasHTML) {
          // Si tiene HTML, renderizar con dangerouslySetInnerHTML manteniendo estilos
          const styles = block.data?.styles || {};
          const fontSize = styles.fontSize ? `${parseInt(styles.fontSize) + 8}px` : '24px';
          const fontWeight = styles.bold ? '700' : '600';
          const fontStyle = styles.italic ? 'italic' : 'normal';
          const textDecoration = [
            styles.underline ? 'underline' : '',
            styles.strikethrough ? 'line-through' : ''
          ].filter(Boolean).join(' ') || 'none';
          const textAlign = styles.textAlign || 'left';
          const fontFamily = styles.fontFamily || 'inherit';
          const color = styles.color || '#192170';

          return (
            <h2
              className="mb-4 mt-6 first:mt-0"
              style={{
                fontSize,
                fontWeight,
                fontStyle,
                textDecoration,
                textAlign,
                fontFamily,
                color,
                lineHeight: 1.35,
              }}
              dangerouslySetInnerHTML={{ __html: block.content || '' }}
            />
          );
        }

        // Si no tiene HTML, renderizar con estilos personalizados
        const styles = block.data?.styles || {};
        const fontSize = styles.fontSize ? `${parseInt(styles.fontSize) + 8}px` : '24px';
        const fontWeight = styles.bold ? '700' : '600';
        const fontStyle = styles.italic ? 'italic' : 'normal';
        const textDecoration = [
          styles.underline ? 'underline' : '',
          styles.strikethrough ? 'line-through' : ''
        ].filter(Boolean).join(' ') || 'none';
        const textAlign = styles.textAlign || 'left';
        const fontFamily = styles.fontFamily || 'inherit';
        const color = styles.color || '#192170';

        return (
          <h2
            className="mb-4 mt-6 first:mt-0"
            style={{
              fontSize,
              fontWeight,
              fontStyle,
              textDecoration,
              textAlign,
              fontFamily,
              color,
              lineHeight: 1.35,
            }}
          >
            {block.content}
          </h2>
        );
      }

    case 'text':
      {
        // Detectar si el contenido contiene HTML
        const hasHTML = block.content && /<[a-z][\s\S]*>/i.test(block.content);

        if (hasHTML) {
          // Si tiene HTML, usar RichTextContent para mantener estilos consistentes
          return (
            <div className="mb-4">
              <RichTextContent html={block.content || ""} />
            </div>
          );
        }

        // Si no tiene HTML, renderizar con estilos personalizados
        const styles = block.data?.styles || {};
        const fontSize = styles.fontSize ? `${styles.fontSize}px` : '14px';
        const fontWeight = styles.bold ? '700' : '400';
        const fontStyle = styles.italic ? 'italic' : 'normal';
        const textDecoration = [
          styles.underline ? 'underline' : '',
          styles.strikethrough ? 'line-through' : ''
        ].filter(Boolean).join(' ') || 'none';
        const textAlign = styles.textAlign || 'left';
        const fontFamily = styles.fontFamily || 'inherit';
        const color = styles.color || '#374151';

        return (
          <p
            className="leading-relaxed mb-4"
            style={{
              fontSize,
              fontWeight,
              fontStyle,
              textDecoration,
              textAlign,
              fontFamily,
              color,
              lineHeight: 1.6,
            }}
          >
            {block.content}
          </p>
        );
      }

    case 'richtext':
      return (
        <div className="mb-4">
          <RichTextContent html={block.content || ""} />
        </div>
      );

    case 'image':
      return (
        <div className="my-6 rounded-lg overflow-hidden">
          <img
            src={block.content}
            alt={block.data?.description || block.data?.fileName || 'Imagen de la lección'}
            className="w-full h-auto max-h-[500px] object-contain bg-gray-100"
          />
          {(block.data?.description || block.data?.fileName) && (
            <p className="text-sm text-gray-600 mt-2 text-center italic">
              {block.data?.description || block.data?.fileName}
            </p>
          )}
        </div>
      );

    case 'video':
      const youtubeId = block.data?.videoType === 'youtube' ? getYouTubeVideoId(block.content) : null;

      if (youtubeId) {
        return (
          <div className="my-6 aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title="Video de YouTube"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        );
      }

      // Video URL directo
      return (
        <div className="my-6 aspect-video rounded-lg overflow-hidden bg-black">
          <video
            src={block.content}
            controls
            className="w-full h-full"
          />
        </div>
      );

    case 'attachment':
      return <AttachmentBlock block={block} />;

    case 'list':
      const items = block.data?.items || [];
      return (
        <ul className="my-4 space-y-2 pl-6">
          {items.map((item, index) => (
            <li key={index} className="text-gray-700 list-disc">
              {item}
            </li>
          ))}
        </ul>
      );

    case 'table':
      const cells = block.data?.cells || [];
      if (cells.length === 0) return null;

      return (
        <div className="my-6 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden">
            <tbody>
              {cells.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-100 font-semibold' : 'bg-white'}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border border-gray-300 px-4 py-2 text-gray-700"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'quiz':
      return (
        <QuizBlock
          quizId={block.data?.quizId}
          quizTitle={block.data?.quizTitle}
          courseId={courseId}
          lessonId={lessonId}
          subsectionIndex={subsectionIndex}
          totalSubsections={totalSubsections}
          onProgressUpdate={onProgressUpdate}
          onQuizScoreUpdate={onQuizScoreUpdate}
          userId={userId}
        />
      );

    default:
      return null;
  }
}

// ===== COMPONENT: Subsection Content Viewer =====
function SubsectionViewer({
  subsection,
  courseId,
  lessonId,
  subsectionIndex,
  totalSubsections,
  userId,
  onProgressUpdate,
  onQuizScoreUpdate,
  isCompleted,
  hasQuiz,
  onScrollComplete,
}: {
  subsection: Subsection | null;
  courseId: string;
  lessonId?: string;
  subsectionIndex?: number;
  totalSubsections?: number;
  userId?: string;
  onProgressUpdate?: (subsectionIndex: number, isCompleted: boolean) => void;
  onQuizScoreUpdate?: (
    lessonId: string,
    subsectionIndex: number,
    score: { correct: number; total: number } | null
  ) => void;
  isCompleted?: boolean;
  hasQuiz?: boolean;
  onScrollComplete?: () => void;
}) {
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [isObserverReady, setIsObserverReady] = useState(false);
  const endOfContentRef = useRef<HTMLDivElement>(null);

  // Reset hasReachedEnd and isObserverReady when subsection changes
  useEffect(() => {
    setHasReachedEnd(false);
    setIsObserverReady(false);
  }, [subsectionIndex, lessonId]);

  // Delay before enabling the IntersectionObserver
  // This prevents immediate completion for short content that's already visible
  useEffect(() => {
    if (isCompleted || hasQuiz) return;

    const timer = setTimeout(() => {
      setIsObserverReady(true);
    }, 500); // 500ms delay before the observer can fire

    return () => clearTimeout(timer);
  }, [subsectionIndex, lessonId, isCompleted, hasQuiz]);

  // IntersectionObserver to detect when user scrolls to the end
  // Solo se activa para contenido de lectura (sin quiz)
  // Only activates after the delay (isObserverReady = true)
  useEffect(() => {
    if (!endOfContentRef.current || isCompleted || hasQuiz || !isObserverReady) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasReachedEnd) {
            setHasReachedEnd(true);
            onScrollComplete?.();
          }
        });
      },
      {
        threshold: 1.0, // 100% visible - solo se activa cuando el elemento está completamente visible
        rootMargin: '0px',
      }
    );

    observer.observe(endOfContentRef.current);

    return () => observer.disconnect();
  }, [hasReachedEnd, isCompleted, hasQuiz, onScrollComplete, isObserverReady]);

  if (!subsection) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Selecciona una lección para ver su contenido</p>
      </div>
    );
  }

  const blocks = subsection.blocks || [];

  if (blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Esta lección no tiene contenido todavía</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {blocks.map((block) => (
        <ContentBlockRenderer
          key={block.id}
          block={block}
          courseId={courseId}
          lessonId={lessonId}
          subsectionIndex={subsectionIndex}
          totalSubsections={totalSubsections}
          userId={userId}
          onProgressUpdate={onProgressUpdate}
          onQuizScoreUpdate={onQuizScoreUpdate}
        />
      ))}

      {/* Anchor element to detect scroll to end */}
      <div ref={endOfContentRef} className="h-1" />

      {/* Indicador de lección completada */}
      {isCompleted && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-emerald-600">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <IconCheck size={18} className="text-emerald-600" />
            </div>
            <span className="font-medium">Lección completada</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Types for progress API
interface ProgressData {
  progress: number;
  completedLessons: string[];
  subsectionProgress: Record<string, number>;
  lastAccessedLessonId: string | null;
  totalLessons: number;
}

export default function LessonPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Modo preview para maestros/admins (no requiere inscripción)
  const isPreviewMode = searchParams.get("preview") === "true";

  // Get initial subsection index from URL query parameter
  const initialSubsectionIndex = searchParams.get("subsection")
    ? parseInt(searchParams.get("subsection")!, 10)
    : 0;

  // Core State
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "questions" | "notes">("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const hasFetchedRef = useRef(false);

  // Progress persistence state
  const [dbCompletedLessons, setDbCompletedLessons] = useState<string[]>([]);
  const [dbProgress, setDbProgress] = useState(0);
  const [totalDbLessons, setTotalDbLessons] = useState(0);
  const progressFetchedRef = useRef(false);

  // Resources State
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  // Notes State
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Q&A State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [questionSortBy, setQuestionSortBy] = useState<"recent" | "popular">("recent");

  // Video simulation state (para timestamp de notas)
  const [currentVideoTime, setCurrentVideoTime] = useState(0);

  // Progress tooltip state (click to pin)
  const [progressTooltipOpen, setProgressTooltipOpen] = useState(false);
  const progressTooltipRef = useRef<HTMLDivElement>(null);

  // Ref for the lesson content scroll container - used to reset scroll position when navigating
  const lessonContentScrollRef = useRef<HTMLDivElement>(null);

  // Ref for the sidebar scroll container - used to reset scroll position when navigating
  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  // Rating modal state
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [loadingRating, setLoadingRating] = useState(false);

  // More options dropdown state
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const moreOptionsRef = useRef<HTMLDivElement>(null);

  // Favorite state
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);

  // Scroll-to-complete state - tracks if user has scrolled to end of content
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  // Ref to track which subsection/lesson the scroll completion applies to
  // This prevents the "flicker" where the button appears enabled briefly when changing subsections
  const scrolledSubsectionRef = useRef<{ lessonId: string; subIndex: number } | null>(null);

  // Confirmation modal state for completing lessons
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionModalType, setCompletionModalType] = useState<'confirm' | 'error'>('confirm');
  const [completionModalMessage, setCompletionModalMessage] = useState<string>('');
  const [pendingNavigation, setPendingNavigation] = useState<{
    lessonId: string;
    fromSubIndex: number;
    toSubIndex: number;
    subsectionsLength: number;
  } | null>(null);
  const [pendingNavigationToSection, setPendingNavigationToSection] = useState<{
    lessonId: string;
    subIndex: number;
  } | null>(null);

  // Quiz scores state - stores quiz scores by lessonId-subIndex
  const [quizScores, setQuizScores] = useState<Map<string, { correct: number; total: number }>>(new Map());
  const [quizScoresLoaded, setQuizScoresLoaded] = useState(false);

  const upsertQuizScore = useCallback(
    (lessonId: string, subsectionIndex: number, score: { correct: number; total: number } | null) => {
      const key = `${lessonId}-${subsectionIndex}`;
      setQuizScores((prev) => {
        const next = new Map(prev);
        if (!score) {
          next.delete(key);
          return next;
        }
        next.set(key, score);
        return next;
      });
    },
    []
  );

  // Confetti animation state - shown when completing a section
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiMessage, setConfettiMessage] = useState<string>('');

  // Subsection State (para navegación dentro de una lección)
  // Inicializa con el valor del query parameter si existe
  const [activeSubsectionIndex, setActiveSubsectionIndex] = useState(initialSubsectionIndex);
  // Progreso de lecciones dentro de cada lección (subsections completadas de forma secuencial)
  // Este estado ahora se sincroniza con la BD
  const [completedSubsectionsByLesson, setCompletedSubsectionsByLesson] = useState<Record<string, number>>({});
  // Ref para saber si ya aplicamos el índice inicial del query param
  const initialSubsectionAppliedRef = useRef(false);

  // Flag para evitar actualizaciones duplicadas
  const isUpdatingProgressRef = useRef(false);

  // Derived State
  const courseId = params.courseId as string;
  const currentLessonId = params.lessonId as string;

  // Find current lesson
  const currentLesson = useMemo(() => {
    return lessons.find(l => l.id === currentLessonId);
  }, [lessons, currentLessonId]);

  // Parse subsections from current lesson content
  const currentSubsections = useMemo((): Subsection[] => {
    if (!currentLesson?.content) return [];
    try {
      const parsed = JSON.parse(currentLesson.content);
      return parsed.subsections || [];
    } catch {
      return [];
    }
  }, [currentLesson]);

  // Get active subsection
  const activeSubsection = useMemo(() => {
    return currentSubsections[activeSubsectionIndex] || null;
  }, [currentSubsections, activeSubsectionIndex]);

  // Navigation helpers
  const sortedLessons = useMemo(() => {
    return [...lessons].sort((a, b) => a.order - b.order);
  }, [lessons]);

  const currentIndex = sortedLessons.findIndex(l => l.id === currentLessonId);
  const prevLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null;

  // ===== CALCULATE VISUAL PROGRESS =====
  // Calcula el progreso real basado en subsecciones completadas de todas las lecciones
  // Usa el mismo algoritmo que el API para mantener consistencia
  const visualProgress = useMemo(() => {
    // Si no hay lecciones cargadas, usar el progreso de la BD o 0
    if (sortedLessons.length === 0) return dbProgress;

    let totalSubsections = 0;
    let completedSubsections = 0;

    sortedLessons.forEach(lesson => {
      // Parsear subsecciones de cada lección
      let subsections: Subsection[] = [];
      try {
        if (lesson.content) {
          const parsed = JSON.parse(lesson.content);
          subsections = parsed.subsections || [];
        }
      } catch {
        // Si falla el parse, contar como 1 subsección
      }

      const lessonSubsectionCount = subsections.length || 1;
      totalSubsections += lessonSubsectionCount;

      // Si la lección está completada en la BD, todas sus subsecciones están completadas
      if (dbCompletedLessons.includes(lesson.id)) {
        completedSubsections += lessonSubsectionCount;
      } else {
        // Contar subsecciones completadas según el progreso local
        const highestCompletedIndex = completedSubsectionsByLesson[lesson.id] ?? -1;
        if (highestCompletedIndex >= 0) {
          // +1 porque el índice es 0-based
          completedSubsections += Math.min(highestCompletedIndex + 1, lessonSubsectionCount);
        }
      }
    });

    if (totalSubsections === 0) return dbProgress;

    // Calcular progreso local (para actualizaciones en tiempo real)
    const localProgress = Math.round((completedSubsections / totalSubsections) * 100);

    // Usar el mayor entre el progreso local y el de la BD
    // Esto evita retrocesos visuales cuando la BD aún no se ha sincronizado
    return Math.max(localProgress, dbProgress);
  }, [sortedLessons, dbCompletedLessons, completedSubsectionsByLesson, dbProgress]);

  // ===== HELPER: Check if subsection has quiz =====
  const subsectionHasQuiz = useCallback((lessonId: string, subIndex: number): boolean => {
    const lesson = sortedLessons.find(l => l.id === lessonId);
    if (!lesson?.content) return false;

    try {
      const parsed = JSON.parse(lesson.content);
      const subsections = parsed.subsections || [];
      const subsection = subsections[subIndex];

      if (!subsection?.blocks) return false;

      // Verificar si algún bloque es de tipo quiz
      return subsection.blocks.some((block: any) => block.type === 'quiz');
    } catch {
      return false;
    }
  }, [sortedLessons]);

  // ===== HELPER: Update progress in background =====
  const updateProgressInBackground = useCallback(async (
    lessonId: string,
    subsectionIndex: number,
    isCompleted: boolean,
    totalSubsections: number
  ) => {
    // En modo preview, no actualizar progreso
    if (isPreviewMode) return null;
    if (!user || !courseId || isUpdatingProgressRef.current) return null;

    isUpdatingProgressRef.current = true;

    try {
      const response = await fetch('/api/student/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          userId: user.id,
          lessonId,
          subsectionIndex,
          isCompleted,
          totalSubsections,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Actualizar estado local con los datos de la BD
        setDbProgress(data.progress || 0);
        setDbCompletedLessons(data.completedLessons || []);

        // Sincronizar subsection progress si viene de la BD
        if (data.subsectionProgress) {
          setCompletedSubsectionsByLesson(prev => ({
            ...prev,
            ...data.subsectionProgress,
          }));
        }

        // Devolver los datos actualizados
        return {
          progress: data.progress || 0,
          completedLessons: data.completedLessons || [],
          subsectionProgress: data.subsectionProgress || {},
        };
      }
    } catch (error) {
      console.error('[updateProgressInBackground] Error:', error);
    } finally {
      isUpdatingProgressRef.current = false;
    }

    return null;
  }, [user, courseId, isPreviewMode]);

  const goToLessonAtSubsection = useCallback((lessonId: string, subsectionIndex: number) => {
    // Actualizar last_accessed_lesson_id/subsection en segundo plano
    if (user && courseId) {
      fetch('/api/student/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          userId: user.id,
          lessonId,
          subsectionIndex,
          isCompleted: false,
          totalSubsections: 1,
        }),
      }).catch(err => console.error('[goToLessonAtSubsection] Error updating progress:', err));
    }

    router.push(`/student/courses/${courseId}/learn/lecture/${lessonId}?subsection=${subsectionIndex}`);
  }, [router, courseId, user]);

  const getLessonSubsectionCount = useCallback((lesson: Lesson | null | undefined): number => {
    if (!lesson?.content) return 1;
    try {
      const parsed = JSON.parse(lesson.content);
      const subs = parsed?.subsections;
      return Array.isArray(subs) && subs.length > 0 ? subs.length : 1;
    } catch {
      return 1;
    }
  }, []);

  const handleSubsectionProgressUpdate = useCallback(async (subIndex: number, isCompleted: boolean) => {
    if (!currentLessonId || !user || isPreviewMode) return;

    // Actualizar estado local optimista - marcar esta subsección como completada
    setCompletedSubsectionsByLesson((prev) => {
      const currentMax = prev[currentLessonId] ?? -1;
      const newMax = Math.max(currentMax, subIndex);
      return {
        ...prev,
        [currentLessonId]: newMax,
      };
    });

    // Si es la última subsección, actualizar dbCompletedLessons de forma optimista
    if (isCompleted) {
      setDbCompletedLessons((prev) => {
        if (prev.includes(currentLessonId)) return prev;
        return [...prev, currentLessonId];
      });

      // Mostrar confetti al completar la sección
      const completedLesson = sortedLessons.find(l => l.id === currentLessonId);
      if (completedLesson) {
        setConfettiMessage(`¡Completaste "${completedLesson.title}"!`);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }

    // Actualizar progreso en segundo plano
    const currentLessonForUpdate = sortedLessons.find(l => l.id === currentLessonId);
    if (!currentLessonForUpdate?.content) return;

    try {
      const parsed = JSON.parse(currentLessonForUpdate.content);
      const totalSubs = Array.isArray(parsed?.subsections) ? parsed.subsections.length : 0;
      const result = await updateProgressInBackground(
        currentLessonId,
        subIndex,
        isCompleted,
        totalSubs
      );

      if (result?.completedLessons) {
        setDbCompletedLessons(result.completedLessons);
      }
      if (result?.subsectionProgress) {
        setCompletedSubsectionsByLesson(prev => ({
          ...prev,
          ...result.subsectionProgress,
        }));
      }
    } catch (e) {
      console.error('Error updating progress:', e);
    }
  }, [currentLessonId, user, isPreviewMode, sortedLessons, updateProgressInBackground]);

  type NavTarget = { lessonId: string; subIndex: number };

  const currentSubsectionCount = useMemo(() => {
    return currentSubsections.length > 0 ? currentSubsections.length : 1;
  }, [currentSubsections]);

  const prevNavTarget = useMemo<NavTarget | null>(() => {
    if (!currentLessonId) return null;
    if (activeSubsectionIndex > 0) {
      return { lessonId: currentLessonId, subIndex: activeSubsectionIndex - 1 };
    }
    if (!prevLesson) return null;
    return { lessonId: prevLesson.id, subIndex: Math.max(0, getLessonSubsectionCount(prevLesson) - 1) };
  }, [currentLessonId, activeSubsectionIndex, prevLesson, getLessonSubsectionCount]);

  const nextNavTarget = useMemo<NavTarget | null>(() => {
    if (!currentLessonId) return null;
    if (activeSubsectionIndex < currentSubsectionCount - 1) {
      return { lessonId: currentLessonId, subIndex: activeSubsectionIndex + 1 };
    }
    if (!nextLesson) return null;
    return { lessonId: nextLesson.id, subIndex: 0 };
  }, [currentLessonId, activeSubsectionIndex, currentSubsectionCount, nextLesson]);

  const currentHighestCompletedIndex = currentLessonId ? (completedSubsectionsByLesson[currentLessonId] ?? -1) : -1;
  const isCurrentLessonFullyCompleted = currentLessonId ? dbCompletedLessons.includes(currentLessonId) : false;
  const isCurrentSubCompletedForNav =
    !!currentLessonId && (isCurrentLessonFullyCompleted || activeSubsectionIndex <= currentHighestCompletedIndex);
  const currentSubHasQuizForNav =
    !!currentLessonId && subsectionHasQuiz(currentLessonId, activeSubsectionIndex);

  // Verificar si el quiz de la subsección actual ha sido completado
  const isCurrentQuizCompleted = currentLessonId
    ? quizScores.has(`${currentLessonId}-${activeSubsectionIndex}`)
    : false;

  // Verificar si el quiz de la subsección actual ha sido APROBADO (≥60%)
  const currentQuizScore = currentLessonId
    ? quizScores.get(`${currentLessonId}-${activeSubsectionIndex}`)
    : null;
  const isCurrentQuizPassed = currentQuizScore
    ? (currentQuizScore.correct / currentQuizScore.total) >= 0.6
    : false;

  // Para avanzar se requiere:
  // - Modo preview: siempre puede avanzar
  // - Con quiz: SIEMPRE requiere APROBAR el quiz (≥60%), sin importar si está marcado como completado
  // - Sin quiz: subsección completada O scroll hasta el final
  const canProceedToNextForNav = (() => {
    if (isPreviewMode) return true;

    // Si tiene quiz, SIEMPRE verificar que esté aprobado (≥60%)
    if (currentSubHasQuizForNav) {
      return isCurrentQuizPassed;
    }

    // Sin quiz: completada o scroll hasta el final
    return isCurrentSubCompletedForNav || hasScrolledToEnd;
  })();

  const handlePrevNavigation = useCallback(() => {
    if (!prevNavTarget || !currentLessonId) return;
    setHasScrolledToEnd(false);
    if (prevNavTarget.lessonId === currentLessonId) {
      setActiveSubsectionIndex(prevNavTarget.subIndex);
      return;
    }
    goToLessonAtSubsection(prevNavTarget.lessonId, prevNavTarget.subIndex);
  }, [prevNavTarget, currentLessonId, goToLessonAtSubsection]);

  const handleNextNavigation = useCallback(async () => {
    if (!currentLessonId) return;

    // Fin del contenido: permitir finalizar (marcar completado) en lectura sin quiz
    if (!nextNavTarget) {
      if (isPreviewMode || isCurrentSubCompletedForNav || currentSubHasQuizForNav) return;
      if (!hasScrolledToEnd) return;
      await handleSubsectionProgressUpdate(activeSubsectionIndex, true);
      return;
    }

    if (!canProceedToNextForNav) return;

    // Para lectura (sin quiz), al avanzar marcamos la subsección actual como completada
    if (!isPreviewMode && !isCurrentSubCompletedForNav && !currentSubHasQuizForNav) {
      const isLastSubsection = activeSubsectionIndex >= currentSubsectionCount - 1;
      await handleSubsectionProgressUpdate(activeSubsectionIndex, isLastSubsection);
    }

    setHasScrolledToEnd(false);
    if (nextNavTarget.lessonId === currentLessonId) {
      setActiveSubsectionIndex(nextNavTarget.subIndex);
      return;
    }
    goToLessonAtSubsection(nextNavTarget.lessonId, nextNavTarget.subIndex);
  }, [
    currentLessonId,
    nextNavTarget,
    isPreviewMode,
    isCurrentSubCompletedForNav,
    currentSubHasQuizForNav,
    hasScrolledToEnd,
    canProceedToNextForNav,
    handleSubsectionProgressUpdate,
    activeSubsectionIndex,
    currentSubsectionCount,
    goToLessonAtSubsection,
  ]);

  // ===== HELPER: Handle completion confirmation =====
  const handleConfirmCompletion = useCallback(() => {
    if (!pendingNavigation) return;

    const { lessonId, fromSubIndex, toSubIndex, subsectionsLength } = pendingNavigation;

    // Marcar la subsección como completada
    setCompletedSubsectionsByLesson((prev) => {
      const currentMax = prev[lessonId] ?? -1;
      const newMax = Math.max(currentMax, fromSubIndex);
      return {
        ...prev,
        [lessonId]: newMax,
      };
    });

    // Verificar si es la última subsección o si estamos completando toda la sección
    const isLastSubsection = fromSubIndex >= subsectionsLength - 1 || toSubIndex >= subsectionsLength - 1;

    // Si es la última, marcar la lección como completada
    if (isLastSubsection) {
      // Marcar todas las subsecciones como completadas
      setCompletedSubsectionsByLesson((prev) => ({
        ...prev,
        [lessonId]: subsectionsLength - 1,
      }));

      setDbCompletedLessons((prev) => {
        if (prev.includes(lessonId)) return prev;
        return [...prev, lessonId];
      });

      // Mostrar confetti al completar la sección
      const completedLesson = sortedLessons.find(l => l.id === lessonId);
      if (completedLesson) {
        setConfettiMessage(`¡Completaste "${completedLesson.title}"!`);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }

    // Guardar progreso en segundo plano
    updateProgressInBackground(
      lessonId,
      isLastSubsection ? subsectionsLength - 1 : fromSubIndex,
      isLastSubsection,
      subsectionsLength
    );

    // Si hay navegación pendiente a otra sección, navegar ahí
    if (pendingNavigationToSection) {
      setActiveSubsectionIndex(pendingNavigationToSection.subIndex);
      // Actualizar last_accessed_lesson_id y navegar
      if (user && courseId) {
        fetch('/api/student/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            userId: user.id,
            lessonId: pendingNavigationToSection.lessonId,
            subsectionIndex: 0,
            isCompleted: false,
            totalSubsections: 1,
          }),
        }).catch(err => console.error('[handleConfirmCompletion] Error updating progress:', err));
      }
      router.push(`/student/courses/${courseId}/learn/lecture/${pendingNavigationToSection.lessonId}`);
    } else {
      // Navegar a la siguiente subsección en la misma lección
      setActiveSubsectionIndex(toSubIndex);
    }

    // Cerrar modal y limpiar estado
    setShowCompletionModal(false);
    setPendingNavigation(null);
    setPendingNavigationToSection(null);
    // Reset scroll state for the next subsection
    setHasScrolledToEnd(false);
  }, [pendingNavigation, pendingNavigationToSection, updateProgressInBackground, user, courseId, router, sortedLessons]);

  const handleCancelCompletion = useCallback(() => {
    setShowCompletionModal(false);
    setPendingNavigation(null);
    setPendingNavigationToSection(null);
  }, []);

  // ===== FETCH DATA =====
  useEffect(() => {
    const fetchData = async () => {
      // En modo preview, no requerimos user
      if (!isPreviewMode && !user) return;
      if (!courseId) return;
      if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;
      setLoading(true);

      try {
        // Fetch lessons, sections and course info
        // En modo preview, agregar parámetro preview=true y userId opcional
        const apiUrl = isPreviewMode
          ? `/api/student/getLessons?courseId=${courseId}&preview=true`
          : `/api/student/getLessons?courseId=${courseId}`;
        const lessonsRes = await fetch(apiUrl);
        if (lessonsRes.ok) {
          const data = await lessonsRes.json();
          setLessons(data.lessons || []);
          setSections(data.sections || []);

          // Auto-expandir la sección de la lección actual
          const currentLessonData = (data.lessons || []).find((l: Lesson) => l.id === currentLessonId);
          if (currentLessonData?.sectionId) {
            setExpandedSections(new Set([currentLessonData.sectionId]));
          }

          // Set course info from API response
          if (data.course) {
            setCourseInfo({
              id: data.course.id,
              title: data.course.title || "Curso",
              teacherIds: data.course.teacherIds || [],
            });
          } else {
            setCourseInfo({
              id: courseId,
              title: "Curso",
              teacherIds: [],
            });
          }
        }

      } catch (error) {
        console.error("Error fetching course data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, user, isPreviewMode]);

  // ===== FETCH PROGRESS FROM DB =====
  useEffect(() => {
    const fetchProgress = async () => {
      // En modo preview, no cargar progreso
      if (isPreviewMode) return;
      if (!user || !courseId) return;
      if (progressFetchedRef.current) return;
      progressFetchedRef.current = true;

      try {
        const response = await fetch(
          `/api/student/progress?courseId=${courseId}&userId=${user.id}`
        );

        if (response.ok) {
          const data: ProgressData = await response.json();

          // Sincronizar estado local con BD
          setDbProgress(data.progress);
          setDbCompletedLessons(data.completedLessons);
          setTotalDbLessons(data.totalLessons);

          // Sincronizar subsection progress
          if (data.subsectionProgress && Object.keys(data.subsectionProgress).length > 0) {
            setCompletedSubsectionsByLesson(data.subsectionProgress);
          }

          // Si el usuario entró sin lessonId específico y hay un lastAccessedLessonId,
          // redirigir a esa lección
          // Nota: Este check se hace aquí porque necesitamos los datos de la BD
          if (data.lastAccessedLessonId && !currentLessonId) {
            router.replace(
              `/student/courses/${courseId}/learn/lecture/${data.lastAccessedLessonId}`
            );
          }
        }
      } catch (error) {
        console.error('[fetchProgress] Error:', error);
      }
    };

    fetchProgress();
  }, [user, courseId, currentLessonId, router, isPreviewMode]);

  // ===== FETCH QUIZ SCORES FROM DB =====
  // Cargar los scores de todos los quizzes del curso para validar desbloqueos correctamente
  useEffect(() => {
    const fetchQuizScores = async () => {
      // En modo preview, marcar como cargado pero no cargar scores
      if (isPreviewMode) {
        setQuizScoresLoaded(true);
        return;
      }
      if (!user || !courseId) return;

      try {
        const response = await fetch(
          `/api/student/getQuizScores?courseId=${courseId}`
        );

        if (response.ok) {
          const data = await response.json();
          const scores = data.scores || [];

          // Actualizar el mapa de quizScores
          if (scores.length > 0) {
            setQuizScores((prev) => {
              const next = new Map(prev);
              for (const score of scores) {
                const key = `${score.lessonId}-${score.subsectionIndex}`;
                next.set(key, { correct: score.correct, total: score.total });
              }
              return next;
            });
          }
        }
      } catch (error) {
        console.error('[fetchQuizScores] Error:', error);
      } finally {
        // Marcar como cargado incluso si hay error, para no bloquear indefinidamente
        setQuizScoresLoaded(true);
      }
    };

    fetchQuizScores();
  }, [user, courseId, isPreviewMode]);

  // ===== AUTO-COMPLETE LAST LESSON IF READING =====
  // Si es la última lección de la última sección y es de lectura, completarla automáticamente
  useEffect(() => {
    if (isPreviewMode || !user || !currentLessonId || sortedLessons.length === 0) return;

    // Verificar si es la última sección
    const currentLessonIndex = sortedLessons.findIndex(l => l.id === currentLessonId);
    const isLastSection = currentLessonIndex === sortedLessons.length - 1;

    if (!isLastSection) return;

    // Obtener subsecciones de la lección actual
    const currentLesson = sortedLessons[currentLessonIndex];
    let currentSubsections: Subsection[] = [];
    try {
      if (currentLesson?.content) {
        const parsed = JSON.parse(currentLesson.content);
        currentSubsections = parsed.subsections || [];
      }
    } catch { }

    if (currentSubsections.length === 0) return;

    // Verificar si estamos en la última subsección
    const isLastSubsection = activeSubsectionIndex === currentSubsections.length - 1;
    if (!isLastSubsection) return;

    // Verificar si ya está completada
    const highestCompleted = completedSubsectionsByLesson[currentLessonId] ?? -1;
    const isAlreadyCompleted = dbCompletedLessons.includes(currentLessonId) ||
      highestCompleted >= currentSubsections.length - 1;

    if (isAlreadyCompleted) return;

    // Verificar si es de lectura (no tiene quiz)
    const hasQuiz = subsectionHasQuiz(currentLessonId, activeSubsectionIndex);

    if (!hasQuiz) {
      // Es la última lección, última subsección, y es de lectura
      // Completar automáticamente después de un breve delay
      const timer = setTimeout(() => {
        // Marcar como completada
        setCompletedSubsectionsByLesson(prev => ({
          ...prev,
          [currentLessonId]: currentSubsections.length - 1,
        }));

        setDbCompletedLessons(prev => {
          if (prev.includes(currentLessonId)) return prev;
          return [...prev, currentLessonId];
        });

        // Guardar en BD
        updateProgressInBackground(
          currentLessonId,
          currentSubsections.length - 1,
          true,
          currentSubsections.length
        );
      }, 1000); // Esperar 1 segundo antes de marcar como completada

      return () => clearTimeout(timer);
    }
  }, [
    isPreviewMode,
    user,
    currentLessonId,
    sortedLessons,
    activeSubsectionIndex,
    completedSubsectionsByLesson,
    dbCompletedLessons,
    subsectionHasQuiz,
    updateProgressInBackground
  ]);

  // ===== LOAD QUIZ SCORES =====
  // Cargar las calificaciones de quizzes completados
  useEffect(() => {
    if (isPreviewMode || !user || sortedLessons.length === 0) return;

    const loadQuizScores = async () => {
      const scoresMap = new Map<string, { correct: number; total: number }>();

      // Recorrer todas las lecciones y subsecciones para encontrar quizzes
      for (const lesson of sortedLessons) {
        let subsections: Subsection[] = [];
        try {
          if (lesson.content) {
            const parsed = JSON.parse(lesson.content);
            subsections = parsed.subsections || [];
          }
        } catch { }

        for (let subIndex = 0; subIndex < subsections.length; subIndex++) {
          const subsection = subsections[subIndex];
          // Buscar bloques de tipo quiz
          const quizBlock = subsection.blocks?.find((b: any) => b.type === 'quiz');
          if (quizBlock?.data?.quizId) {
            try {
              const res = await fetch(
                `/api/student/getQuizResponse?surveyId=${quizBlock.data.quizId}&userId=${user.id}`
              );
              if (res.ok) {
                const data = await res.json();
                if (data.response?.answers) {
                  // Obtener el quiz para calcular el score
                  const quizRes = await fetch(
                    `/api/student/getSurvey?surveyId=${quizBlock.data.quizId}&courseId=${courseId}`
                  );
                  if (quizRes.ok) {
                    const quizData = await quizRes.json();
                    const questions = quizData.survey?.questions || [];

                    // Calcular score
                    let correct = 0;
                    const savedAnswers: Record<string, any> = {};
                    data.response.answers.forEach((ans: any) => {
                      savedAnswers[ans.questionId] = ans.answer;
                    });

                    questions.forEach((q: any) => {
                      const userAnswer = savedAnswers[q.id];
                      if (q.options?.some((o: any) => o.isCorrect)) {
                        const correctOptions = q.options.filter((o: any) => o.isCorrect).map((o: any) => o.value);
                        if (q.type === 'multiple_choice') {
                          const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
                          if (correctOptions.length === userAnswers.length &&
                            correctOptions.every((c: string) => userAnswers.includes(c))) {
                            correct++;
                          }
                        } else {
                          if (correctOptions.includes(userAnswer)) {
                            correct++;
                          }
                        }
                      } else if (q.correctAnswer) {
                        if (Array.isArray(q.correctAnswer)) {
                          if (Array.isArray(userAnswer) &&
                            userAnswer.length === q.correctAnswer.length &&
                            userAnswer.every((a: string) => q.correctAnswer?.includes(a))) {
                            correct++;
                          }
                        } else if (userAnswer === q.correctAnswer) {
                          correct++;
                        }
                      }
                    });

                    scoresMap.set(`${lesson.id}-${subIndex}`, { correct, total: questions.length });
                  }
                }
              }
            } catch (err) {
              // Silenciar errores, simplemente no mostrar calificación
            }
          }
        }
      }

      if (scoresMap.size > 0) {
        setQuizScores(scoresMap);
      }
    };

    loadQuizScores();
  }, [isPreviewMode, user, sortedLessons, courseId]);

  // ===== VERIFY LESSON UNLOCK STATUS =====
  // Verificar si la lección actual está desbloqueada y redirigir si no lo está
  useEffect(() => {
    if (isPreviewMode) return; // En modo preview, permitir acceso a todas las lecciones
    if (lessons.length === 0 || !currentLessonId) return;
    if (!dbCompletedLessons.length && Object.keys(completedSubsectionsByLesson).length === 0) {
      // Si no hay progreso cargado aún, esperar
      return;
    }

    const currentLessonIndex = sortedLessons.findIndex(l => l.id === currentLessonId);
    if (currentLessonIndex === -1) return;

    // Verificar si la lección está desbloqueada
    let isUnlocked = false;
    if (currentLessonIndex === 0) {
      // Primera lección: siempre desbloqueada
      isUnlocked = true;
    } else {
      // Verificar que la lección anterior esté completamente completada
      const previousLesson = sortedLessons[currentLessonIndex - 1];
      if (previousLesson) {
        const prevHighestIndex = completedSubsectionsByLesson[previousLesson.id] ?? -1;
        const prevIsCompleted = dbCompletedLessons.includes(previousLesson.id);
        let prevSubsections: Subsection[] = [];
        try {
          if (previousLesson.content) {
            const parsed = JSON.parse(previousLesson.content);
            prevSubsections = parsed.subsections || [];
          }
        } catch (e) { }
        const prevTotalSubsections = prevSubsections.length || 1;
        // La lección anterior debe estar completamente completada
        isUnlocked = prevIsCompleted || (prevHighestIndex >= 0 && prevHighestIndex >= prevTotalSubsections - 1);
      }
    }

    // Verificar también si la lección actual ya está completada (si es así, permitir acceso)
    const currentLesson = sortedLessons.find(l => l.id === currentLessonId);
    const isCurrentLessonCompleted = currentLesson ? dbCompletedLessons.includes(currentLessonId) : false;

    if (!isUnlocked && !isCurrentLessonCompleted) {
      // Encontrar la primera lección desbloqueada
      let firstUnlockedLesson = sortedLessons[0];
      for (let i = 0; i < sortedLessons.length; i++) {
        const lesson = sortedLessons[i];
        if (i === 0) {
          firstUnlockedLesson = lesson;
          break;
        }
        const prevLesson = sortedLessons[i - 1];
        const prevHighestIndex = completedSubsectionsByLesson[prevLesson.id] ?? -1;
        const prevIsCompleted = dbCompletedLessons.includes(prevLesson.id);
        let prevSubsections: Subsection[] = [];
        try {
          if (prevLesson.content) {
            const parsed = JSON.parse(prevLesson.content);
            prevSubsections = parsed.subsections || [];
          }
        } catch (e) { }
        const prevTotalSubsections = prevSubsections.length || 1;
        const prevIsCompletedFully = prevIsCompleted || (prevHighestIndex >= 0 && prevHighestIndex >= prevTotalSubsections - 1);

        if (prevIsCompletedFully) {
          firstUnlockedLesson = lesson;
          break;
        } else {
          break; // No hay más lecciones desbloqueadas
        }
      }

      // Redirigir a la primera lección desbloqueada
      router.replace(`/student/courses/${courseId}/learn/lecture/${firstUnlockedLesson.id}?subsection=0`);
      return;
    }

    // Verificar también que la subsección actual esté desbloqueada o completada
    if (currentLesson && initialSubsectionIndex !== undefined) {
      let subsections: Subsection[] = [];
      try {
        if (currentLesson.content) {
          const parsed = JSON.parse(currentLesson.content);
          subsections = parsed.subsections || [];
        }
      } catch (e) { }

      if (subsections.length > 0 && initialSubsectionIndex > 0) {
        const highestCompletedIndex = completedSubsectionsByLesson[currentLessonId] ?? -1;
        const isLessonFullyCompleted = dbCompletedLessons.includes(currentLessonId);
        // Verificar si la subsección ya está completada
        const isSubsectionCompleted = isLessonFullyCompleted || initialSubsectionIndex <= highestCompletedIndex;
        // Verificar si está desbloqueada (la anterior está completada)
        const isSubsectionUnlocked = isLessonFullyCompleted || initialSubsectionIndex <= highestCompletedIndex + 1;

        // Si no está completada ni desbloqueada, redirigir
        if (!isSubsectionCompleted && !isSubsectionUnlocked) {
          // Redirigir a la primera subsección desbloqueada
          const firstUnlockedIndex = isLessonFullyCompleted ? 0 : Math.max(0, highestCompletedIndex + 1);
          router.replace(`/student/courses/${courseId}/learn/lecture/${currentLessonId}?subsection=${firstUnlockedIndex}`);
        }
      }
    }
  }, [lessons, currentLessonId, dbCompletedLessons, completedSubsectionsByLesson, sortedLessons, isPreviewMode, courseId, router, initialSubsectionIndex]);

  // ===== SYNC COMPLETED LESSONS =====
  // Este efecto verifica si hay lecciones con todas las subsecciones completadas
  // pero que no están marcadas como completadas en la BD, y las sincroniza
  useEffect(() => {
    const syncCompletedLessons = async () => {
      // En modo preview, no sincronizar progreso
      if (isPreviewMode) return;
      if (!user || !courseId || lessons.length === 0) return;
      if (Object.keys(completedSubsectionsByLesson).length === 0) return;

      // Verificar cada lección
      for (const lesson of lessons) {
        // Si ya está completada en la BD, saltar
        if (dbCompletedLessons.includes(lesson.id)) continue;

        // Parsear subsecciones
        let subsectionsCount = 1;
        try {
          if (lesson.content) {
            const parsed = JSON.parse(lesson.content);
            if (parsed.subsections && Array.isArray(parsed.subsections)) {
              subsectionsCount = parsed.subsections.length;
            }
          }
        } catch {
          // Si falla, asumir 1 subsección
        }

        // Verificar si todas las subsecciones están completadas
        const highestCompletedIndex = completedSubsectionsByLesson[lesson.id] ?? -1;
        if (highestCompletedIndex >= subsectionsCount - 1) {
          // Todas las subsecciones completadas, marcar lección como completada
          console.log(`[SyncCompletedLessons] Sincronizando lección "${lesson.title}" como completada`);
          try {
            const response = await fetch('/api/student/progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                courseId,
                userId: user.id,
                lessonId: lesson.id,
                subsectionIndex: subsectionsCount - 1, // Última subsección
                isCompleted: true,
                totalSubsections: subsectionsCount,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              setDbProgress(data.progress || 0);
              setDbCompletedLessons(data.completedLessons || []);
            }
          } catch (error) {
            console.error('[SyncCompletedLessons] Error:', error);
          }
        }
      }
    };

    syncCompletedLessons();
  }, [user, courseId, lessons, completedSubsectionsByLesson, dbCompletedLessons, isPreviewMode]);

  // Set subsection index when lesson changes or from URL query parameter
  useEffect(() => {
    // Si hay un query parameter de subsección y no lo hemos aplicado aún
    const subsectionParam = searchParams.get("subsection");
    if (subsectionParam !== null && !initialSubsectionAppliedRef.current) {
      const index = parseInt(subsectionParam, 10);
      if (!isNaN(index) && index >= 0) {
        setActiveSubsectionIndex(index);
        initialSubsectionAppliedRef.current = true;
        // Expandir la sección de la lección actual
        setExpandedSections(prev => new Set([...prev, currentLessonId]));
      }
    } else if (subsectionParam === null) {
      // Si no hay query param, resetear a 0 cuando cambia la lección
      setActiveSubsectionIndex(0);
      initialSubsectionAppliedRef.current = false;
    }
    // Reset scroll state when changing subsection/lesson
    setHasScrolledToEnd(false);
    // Reset the actual scroll position of the content pane to top
    if (lessonContentScrollRef.current) {
      lessonContentScrollRef.current.scrollTop = 0;
    }
  }, [currentLessonId, searchParams]);

  // Reset scroll position when active subsection changes (navigation via buttons)
  // Resets main window scroll, content scroll, and sidebar scroll
  useEffect(() => {
    // Reset main window/page scroll (scrollbar on the right edge of the window)
    window.scrollTo(0, 0);
    // Reset content container scroll
    if (lessonContentScrollRef.current) {
      lessonContentScrollRef.current.scrollTop = 0;
    }
    // Reset sidebar scroll
    if (sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollTop = 0;
    }
    setHasScrolledToEnd(false);
  }, [activeSubsectionIndex]);

  // Close progress tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (progressTooltipRef.current && !progressTooltipRef.current.contains(event.target as Node)) {
        setProgressTooltipOpen(false);
      }
    };

    if (progressTooltipOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [progressTooltipOpen]);

  // Fetch user's course rating
  useEffect(() => {
    const fetchUserRating = async () => {
      if (!user || !courseId) return;

      setLoadingRating(true);
      try {
        const response = await fetch(
          `/api/student/rating?courseId=${courseId}&userId=${user.id}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.review) {
            setUserRating(data.review.rating);
          }
        }
      } catch (error) {
        console.error('[fetchUserRating] Error:', error);
      } finally {
        setLoadingRating(false);
      }
    };

    fetchUserRating();
  }, [user, courseId]);

  // Fetch favorite status
  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      if (!user || !courseId) return;

      try {
        const response = await fetch(
          `/api/student/favorites?courseId=${courseId}&userId=${user.id}`
        );
        if (response.ok) {
          const data = await response.json();
          setIsFavorite(data.isFavorite);
        }
      } catch (error) {
        console.error('[fetchFavoriteStatus] Error:', error);
      }
    };

    fetchFavoriteStatus();
  }, [user, courseId]);

  // Close more options dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreOptionsRef.current && !moreOptionsRef.current.contains(event.target as Node)) {
        setMoreOptionsOpen(false);
      }
    };

    if (moreOptionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreOptionsOpen]);

  // Fetch resources when lesson changes
  useEffect(() => {
    const fetchResources = async () => {
      if (!currentLessonId) return;
      setLoadingResources(true);

      try {
        const res = await fetch(`/api/student/lesson-resources?lessonId=${currentLessonId}`);
        if (res.ok) {
          const data = await res.json();
          setResources(data.resources || []);
        }
      } catch (error) {
        console.error("Error fetching resources:", error);
      } finally {
        setLoadingResources(false);
      }
    };

    fetchResources();
  }, [currentLessonId]);

  // Fetch notes when lesson changes or tab opens
  const fetchNotes = useCallback(async () => {
    if (isPreviewMode || !currentLessonId || !user) return;
    setLoadingNotes(true);

    try {
      const res = await fetch(`/api/student/notes?lessonId=${currentLessonId}&userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoadingNotes(false);
    }
  }, [currentLessonId, user, isPreviewMode]);

  useEffect(() => {
    if (activeTab === "notes") {
      fetchNotes();
    }
  }, [activeTab, fetchNotes]);

  // Fetch questions when lesson changes or tab opens
  const fetchQuestions = useCallback(async () => {
    if (isPreviewMode || !currentLessonId) return;
    setLoadingQuestions(true);

    try {
      const res = await fetch(`/api/student/questions?lessonId=${currentLessonId}&sortBy=${questionSortBy}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoadingQuestions(false);
    }
  }, [currentLessonId, questionSortBy, isPreviewMode]);

  useEffect(() => {
    if (activeTab === "questions") {
      fetchQuestions();
    }
  }, [activeTab, fetchQuestions]);

  // ===== HANDLERS =====
  const goToLesson = useCallback((lessonId: string) => {
    // Actualizar last_accessed_lesson_id en segundo plano
    if (user && courseId) {
      fetch('/api/student/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          userId: user.id,
          lessonId,
          subsectionIndex: 0, // Empezando en la primera subsección
          isCompleted: false,
          totalSubsections: 1,
        }),
      }).catch(err => console.error('[goToLesson] Error updating progress:', err));
    }

    router.push(`/student/courses/${courseId}/learn/lecture/${lessonId}`);
  }, [router, courseId, user]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Note Handlers
  const handleCreateNote = async () => {
    if (!newNoteContent.trim() || !user || !currentLessonId) return;
    setSavingNote(true);

    try {
      const res = await fetch('/api/student/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          lessonId: currentLessonId,
          courseId: courseId,
          content: newNoteContent.trim(),
          videoTimestamp: currentVideoTime,
        }),
      });

      if (res.ok) {
        setNewNoteContent("");
        fetchNotes();
      }
    } catch (error) {
      console.error("Error creating note:", error);
    } finally {
      setSavingNote(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingNoteContent.trim() || !user) return;
    setSavingNote(true);

    try {
      const res = await fetch('/api/student/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId,
          userId: user.id,
          content: editingNoteContent.trim(),
        }),
      });

      if (res.ok) {
        setEditingNoteId(null);
        setEditingNoteContent("");
        fetchNotes();
      }
    } catch (error) {
      console.error("Error updating note:", error);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!user || !confirm("¿Estás seguro de eliminar esta nota?")) return;

    try {
      const res = await fetch(`/api/student/notes?noteId=${noteId}&userId=${user.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchNotes();
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  // Favorite Handler
  const handleToggleFavorite = async () => {
    if (!user || !courseId || loadingFavorite) return;

    setLoadingFavorite(true);
    try {
      if (isFavorite) {
        // Remove from favorites
        const response = await fetch(
          `/api/student/favorites?courseId=${courseId}&userId=${user.id}`,
          { method: 'DELETE' }
        );
        if (response.ok) {
          setIsFavorite(false);
        }
      } else {
        // Add to favorites
        const response = await fetch('/api/student/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, userId: user.id }),
        });
        if (response.ok) {
          setIsFavorite(true);
        }
      }
    } catch (error) {
      console.error('[handleToggleFavorite] Error:', error);
    } finally {
      setLoadingFavorite(false);
      setMoreOptionsOpen(false);
    }
  };

  // Question Handlers
  const handleSubmitQuestion = async () => {
    if (!newQuestionText.trim() || !user || !currentLessonId) return;
    setSubmittingQuestion(true);

    try {
      const res = await fetch('/api/student/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          lessonId: currentLessonId,
          courseId: courseId,
          questionText: newQuestionText.trim(),
          videoTimestamp: currentVideoTime,
        }),
      });

      if (res.ok) {
        setNewQuestionText("");
        fetchQuestions();
      }
    } catch (error) {
      console.error("Error submitting question:", error);
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleSubmitReply = async (questionId: string) => {
    if (!replyText.trim() || !user) return;
    setSubmittingReply(true);

    try {
      const res = await fetch('/api/student/questions/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          questionId: questionId,
          answerText: replyText.trim(),
        }),
      });

      if (res.ok) {
        setReplyText("");
        setReplyingToId(null);
        fetchQuestions();
      }
    } catch (error) {
      console.error("Error submitting reply:", error);
    } finally {
      setSubmittingReply(false);
    }
  };

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: TOKENS.colors.topbar }}>
        <div className="flex flex-col items-center gap-4 text-white">
          <IconLoader2 className="w-8 h-8 animate-spin" />
          <span>Cargando lección...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: TOKENS.colors.backgroundApp }}>

      {/* ===== TOP BAR (Dark Mode) ===== */}
      <header
        className="flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 shrink-0"
        style={{ height: TOKENS.spacing.topbarHeight, backgroundColor: TOKENS.colors.topbar }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Icono Casa - Navega al dashboard */}
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
            title="Ir al inicio"
          >
            <IconHome size={20} />
          </button>

          {/* Logo MU */}
          <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white font-bold text-xs shrink-0">
            MU
          </div>

          <div className="h-6 w-[1px] bg-gray-700 mx-2 hidden sm:block shrink-0"></div>

          {/* Flecha izquierda + Título del curso - Navega a la página del curso */}
          <button
            onClick={() => router.push(`/dashboard/student/courses/${courseId}`)}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors hidden sm:block"
            title="Volver al curso"
          >
            <div className="flex items-center gap-2">
              <IconArrowLeft size={18} className="shrink-0" />
              <span className="text-sm font-medium truncate max-w-[150px] md:max-w-md">
                {courseInfo?.title || "Volver al curso"}
              </span>
            </div>
          </button>

          {/* Versión móvil - Solo flecha */}
          <button
            onClick={() => router.push(`/dashboard/student/courses/${courseId}`)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors sm:hidden"
            title="Volver al curso"
          >
            <IconArrowLeft size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-4 text-white">
          {/* Ocultar controles de calificación, progreso, compartir y opciones en modo preview */}
          {!isPreviewMode && (
            <>
              {/* Progress Indicator */}
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-300">
                <button
                  onClick={() => {
                    // Solo permitir reseña si el curso está al 100%
                    if (visualProgress >= 100) {
                      setIsRatingModalOpen(true);
                    } else {
                      // Mostrar mensaje informativo
                      alert(`Completa el curso al 100% para dejar una reseña. Tu progreso actual es ${visualProgress}%.`);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1.5 transition-colors group",
                    visualProgress >= 100
                      ? "text-yellow-400 cursor-pointer hover:text-yellow-300"
                      : "text-gray-500 cursor-not-allowed opacity-60"
                  )}
                  title={visualProgress >= 100
                    ? (userRating ? "Editar calificación" : "Calificar este curso")
                    : `Completa el curso al 100% para dejar una reseña (${visualProgress}%)`}
                  disabled={visualProgress < 100}
                >
                  {loadingRating ? (
                    <IconLoader2 size={16} className="animate-spin" />
                  ) : userRating ? (
                    <>
                      {/* Mostrar estrellas llenas según la calificación */}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <IconStar
                            key={star}
                            size={14}
                            className={star <= userRating ? "fill-yellow-400" : "fill-transparent stroke-yellow-400/50"}
                            strokeWidth={1.5}
                          />
                        ))}
                      </div>
                      <span className="font-medium text-yellow-400/90 group-hover:text-yellow-300">
                        Tu calificación
                      </span>
                    </>
                  ) : (
                    <>
                      <IconStar size={16} fill="currentColor" />
                      <span className="font-medium">Calificar</span>
                    </>
                  )}
                </button>
                <div className="h-4 w-[1px] bg-gray-700 mx-2"></div>
                {/* Progress Circle with Tooltip (hover + click to pin) */}
                <div className="relative group" ref={progressTooltipRef}>
                  <div
                    className="flex items-center cursor-pointer hover:text-white"
                    onClick={() => setProgressTooltipOpen(!progressTooltipOpen)}
                  >
                    {/* Circle Progress Chart con porcentaje dentro */}
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        {/* Background circle */}
                        <circle
                          cx="18" cy="18" r="15.9155"
                          fill="none"
                          stroke="#374151"
                          strokeWidth="3"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="18" cy="18" r="15.9155"
                          fill="none"
                          stroke="#A855F7"
                          strokeWidth="3"
                          strokeDasharray={`${visualProgress}, 100`}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dasharray 0.3s ease' }}
                        />
                      </svg>
                      {/* Percentage text inside circle */}
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                        {visualProgress}%
                      </span>
                    </div>
                  </div>

                  {/* Tooltip - appears on hover OR when pinned (clicked) */}
                  <div className={cn(
                    "absolute top-full right-0 mt-2 w-64 transition-all duration-200 z-50",
                    progressTooltipOpen
                      ? "opacity-100 visible"
                      : "opacity-0 invisible group-hover:opacity-100 group-hover:visible"
                  )}>
                    {/* Arrow */}
                    <div className="absolute -top-2 right-6 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white"></div>
                    {/* Tooltip content */}
                    <div className="bg-white rounded-lg shadow-xl p-4">
                      {/* Close button when pinned */}
                      {progressTooltipOpen && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProgressTooltipOpen(false);
                          }}
                          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <IconX size={14} />
                        </button>
                      )}
                      <p className="text-gray-900 font-bold text-base mb-1 pr-6">
                        {(() => {
                          // Calcular total de subsecciones completadas y totales
                          let totalSubs = 0;
                          let completedSubs = 0;
                          sortedLessons.forEach(lesson => {
                            let subs: Subsection[] = [];
                            try {
                              if (lesson.content) {
                                const parsed = JSON.parse(lesson.content);
                                subs = parsed.subsections || [];
                              }
                            } catch { }
                            const count = subs.length || 1;
                            totalSubs += count;
                            if (dbCompletedLessons.includes(lesson.id)) {
                              completedSubs += count;
                            } else {
                              const idx = completedSubsectionsByLesson[lesson.id] ?? -1;
                              if (idx >= 0) completedSubs += Math.min(idx + 1, count);
                            }
                          });
                          return `${completedSubs} de ${totalSubs} completados.`;
                        })()}
                      </p>
                      <p className="text-gray-500 text-sm">
                        Acaba los niveles para obtener una insignia.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button className="p-2 rounded hover:bg-white/10 transition-colors">
                <IconShare size={18} />
              </button>

              {/* More Options Dropdown */}
              <div className="relative" ref={moreOptionsRef}>
                <button
                  onClick={() => setMoreOptionsOpen(!moreOptionsOpen)}
                  className="p-2 rounded hover:bg-white/10 transition-colors"
                >
                  <IconDotsVertical size={18} />
                </button>

                {/* Dropdown Menu */}
                {moreOptionsOpen && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Arrow */}
                    <div className="absolute -top-2 right-3 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white"></div>

                    {/* Marcar como favorito */}
                    <button
                      onClick={handleToggleFavorite}
                      disabled={loadingFavorite}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
                    >
                      {loadingFavorite ? (
                        <IconLoader2 size={20} className="text-purple-500 animate-spin" />
                      ) : isFavorite ? (
                        <IconHeartFilled size={20} className="text-red-500" />
                      ) : (
                        <IconHeart size={20} className="text-gray-600" />
                      )}
                      <span className={cn(
                        "text-sm font-medium",
                        isFavorite ? "text-red-600" : "text-gray-700"
                      )}>
                        {isFavorite ? "Quitar de favoritos" : "Marcar como favorito"}
                      </span>
                    </button>

                    {/* Separator */}
                    <div className="my-1 border-t border-gray-100"></div>

                    {/* Regalar esta Microcredencial */}
                    <button
                      onClick={() => {
                        setMoreOptionsOpen(false);
                        // TODO: Implementar funcionalidad de regalo
                        alert('Próximamente: Podrás regalar esta microcredencial a un amigo.');
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <IconGift size={20} className="text-purple-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Regalar esta Microcredencial
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Indicador de modo preview */}
          {isPreviewMode && (
            <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-300 text-xs font-medium">
              Vista Previa
            </div>
          )}
        </div>
      </header>

      {/* ===== MAIN CONTENT (Split Screen) ===== */}
      <main className="flex flex-1 overflow-hidden">

        {/* ZONE A: Main Content Stage (Left) */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Lesson Content Area */}
          <div ref={lessonContentScrollRef} className="flex-1 bg-white p-6 md:p-8 overflow-y-auto">
            <SubsectionViewer
              subsection={activeSubsection}
              courseId={courseId}
              lessonId={currentLessonId}
              subsectionIndex={activeSubsectionIndex}
              totalSubsections={(() => {
                const currentLesson = sortedLessons.find(l => l.id === currentLessonId);
                if (!currentLesson?.content) return 1;
                try {
                  const parsed = JSON.parse(currentLesson.content);
                  return parsed.subsections?.length || 1;
                } catch {
                  return 1;
                }
              })()}
              userId={user?.id}
              onQuizScoreUpdate={upsertQuizScore}
              isCompleted={(() => {
                if (!currentLessonId) return false;
                const highestCompletedIndex = completedSubsectionsByLesson[currentLessonId] ?? -1;
                const isLessonFullyCompleted = dbCompletedLessons.includes(currentLessonId);
                return isLessonFullyCompleted || activeSubsectionIndex <= highestCompletedIndex;
              })()}
              hasQuiz={subsectionHasQuiz(currentLessonId, activeSubsectionIndex)}
              onProgressUpdate={handleSubsectionProgressUpdate}
              onScrollComplete={() => {
                // Notificar que el usuario ha hecho scroll hasta el final
                setHasScrolledToEnd(true);
                // Marcar la subsección como completada automáticamente (solo para lecturas sin quiz)
                // Esto desbloquea la siguiente subsección en el sidebar
                if (!isPreviewMode && !isCurrentSubCompletedForNav && !currentSubHasQuizForNav) {
                  const isLastSubsection = activeSubsectionIndex >= currentSubsectionCount - 1;
                  handleSubsectionProgressUpdate(activeSubsectionIndex, isLastSubsection);
                }
              }}
            />
          </div>

          {/* Lesson Navigation Controls - Fixed at bottom of main content pane */}
          <div className="shrink-0 pt-4 pb-4 px-6 md:px-8 bg-white border-t border-gray-200">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
              <button
                onClick={handlePrevNavigation}
                disabled={!prevNavTarget}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all shadow-lg",
                  prevNavTarget
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-70"
                )}
              >
                <IconChevronLeft size={20} />
                Anterior
              </button>

              <button
                onClick={handleNextNavigation}
                disabled={nextNavTarget ? !canProceedToNextForNav : (isPreviewMode || isCurrentSubCompletedForNav || currentSubHasQuizForNav || !hasScrolledToEnd)}
                className={cn(
                  "flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all shadow-lg",
                  (nextNavTarget ? canProceedToNextForNav : (!isPreviewMode && !isCurrentSubCompletedForNav && !currentSubHasQuizForNav && hasScrolledToEnd))
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
                    : "bg-purple-100 text-purple-300 cursor-not-allowed opacity-70"
                )}
              >
                {nextNavTarget ? "Siguiente" : "Finalizar"}
                <IconChevronRight size={20} />
              </button>
            </div>

            {!isPreviewMode && nextNavTarget && !isCurrentSubCompletedForNav && (
              <div className="max-w-4xl mx-auto mt-2 text-center">
                {currentSubHasQuizForNav ? (
                  // Subsección con quiz: requiere APROBAR el quiz (≥60%)
                  !isCurrentQuizCompleted ? (
                    <p className="text-xs text-gray-500">
                      Completa el quiz para habilitar "Siguiente".
                    </p>
                  ) : !isCurrentQuizPassed ? (
                    <p className="text-xs text-red-500 font-medium">
                      Necesitas obtener al menos 60% para continuar. Intenta de nuevo.
                    </p>
                  ) : null
                ) : !hasScrolledToEnd ? (
                  // Subsección sin quiz: requiere scroll hasta el final
                  <p className="text-xs text-gray-500">
                    Desplázate hasta el final para habilitar "Siguiente".
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {/* Lower Tabs & Content */}
          <div className="bg-white flex-1 flex flex-col" style={{ borderColor: TOKENS.colors.border }}>
            {/* Tab Navigation */}
            <div className="border-b px-4 md:px-8 shrink-0" style={{ borderColor: TOKENS.colors.border }}>
              <div className="flex gap-4 md:gap-8 overflow-x-auto scrollbar-hide">
                {[
                  { id: "overview", label: "Descripción general" },
                  { id: "questions", label: "Preguntas y respuestas" },
                  { id: "notes", label: "Notas" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap",
                      activeTab === tab.id
                        ? "border-black text-black"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">

              {/* ===== OVERVIEW TAB ===== */}
              {activeTab === "overview" && currentLesson && (
                <div className="max-w-4xl animate-in fade-in duration-200">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">{currentLesson.title}</h1>

                  {currentLesson.description && (
                    <div className="prose prose-sm max-w-none text-gray-700 mb-8">
                      <p>{currentLesson.description}</p>
                    </div>
                  )}

                  {/* Resources Section */}
                  {resources.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <IconPaperclip size={20} />
                        Recursos de la lección
                      </h3>
                      <div className="grid gap-3">
                        {resources.map((resource) => (
                          <a
                            key={resource.id}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors group"
                            style={{ borderColor: TOKENS.colors.border }}
                          >
                            <span className="text-2xl">{getFileIcon(resource.fileType)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate group-hover:text-purple-600">
                                {resource.fileName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatFileSize(resource.sizeKb)}
                              </p>
                            </div>
                            <IconDownload size={20} className="text-gray-400 group-hover:text-purple-600" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {loadingResources && (
                    <div className="flex items-center gap-2 text-gray-500 mt-4">
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                      <span>Cargando recursos...</span>
                    </div>
                  )}
                </div>
              )}

              {/* ===== QUESTIONS TAB ===== */}
              {activeTab === "questions" && (
                <div className="max-w-4xl animate-in fade-in duration-200">
                  {/* New Question Input - Ocultar en modo preview */}
                  {!isPreviewMode && (
                    <div className="mb-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold shrink-0">
                          {user?.email?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={newQuestionText}
                            onChange={(e) => setNewQuestionText(e.target.value)}
                            placeholder={`Haz una pregunta en ${formatTimestamp(currentVideoTime)}...`}
                            className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            rows={3}
                            style={{ borderColor: TOKENS.colors.border }}
                          />
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-500">
                              <IconClock size={12} className="inline mr-1" />
                              {formatTimestamp(currentVideoTime)}
                            </span>
                            <button
                              onClick={handleSubmitQuestion}
                              disabled={!newQuestionText.trim() || submittingQuestion}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors flex items-center gap-2"
                            >
                              {submittingQuestion ? (
                                <IconLoader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <IconSend size={16} />
                              )}
                              Publicar pregunta
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mensaje en modo preview */}
                  {isPreviewMode && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Modo Vista Previa:</strong> Puedes ver las preguntas existentes, pero no puedes crear nuevas preguntas ni responder.
                      </p>
                    </div>
                  )}

                  {/* Sort Options */}
                  <div className="flex gap-4 mb-6 border-b pb-4" style={{ borderColor: TOKENS.colors.border }}>
                    <button
                      onClick={() => setQuestionSortBy("recent")}
                      className={cn(
                        "text-sm font-medium transition-colors",
                        questionSortBy === "recent" ? "text-purple-600" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      Más recientes
                    </button>
                    <button
                      onClick={() => setQuestionSortBy("popular")}
                      className={cn(
                        "text-sm font-medium transition-colors",
                        questionSortBy === "popular" ? "text-purple-600" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      Más votadas
                    </button>
                  </div>

                  {/* Questions List */}
                  {loadingQuestions ? (
                    <div className="flex items-center justify-center py-12">
                      <IconLoader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : questions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                      <IconMessageCircle size={48} className="mb-4 opacity-20" />
                      <h3 className="text-lg font-medium text-gray-900">Sin preguntas todavía</h3>
                      <p>Sé el primero en preguntar algo sobre esta lección.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {questions.map((question) => (
                        <div key={question.id} className="border-b pb-6" style={{ borderColor: TOKENS.colors.border }}>
                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold shrink-0">
                              {question.author?.avatarUrl ? (
                                <Image
                                  src={question.author.avatarUrl}
                                  alt=""
                                  width={40}
                                  height={40}
                                  className="rounded-full"
                                />
                              ) : (
                                question.author?.name?.charAt(0).toUpperCase() || "?"
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">{question.author?.name || "Usuario"}</span>
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(question.createdAt), { addSuffix: true, locale: es })}
                                </span>
                                {question.videoTimestamp > 0 && (
                                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                    {formatTimestamp(question.videoTimestamp)}
                                  </span>
                                )}
                                {question.isResolved && (
                                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded flex items-center gap-1">
                                    <IconCheck size={12} />
                                    Resuelta
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-700 mb-3">{question.questionText}</p>

                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1 text-gray-500">
                                  <IconThumbUp size={16} />
                                  <span>{question.upvotes}</span>
                                </div>
                                <button
                                  onClick={() => setExpandedQuestionId(expandedQuestionId === question.id ? null : question.id)}
                                  className="text-gray-500 hover:text-purple-600 transition-colors"
                                  disabled={isPreviewMode}
                                >
                                  {question.answersCount} respuesta{question.answersCount !== 1 ? 's' : ''}
                                </button>
                                {!isPreviewMode && (
                                  <button
                                    onClick={() => {
                                      setReplyingToId(replyingToId === question.id ? null : question.id);
                                      setExpandedQuestionId(question.id);
                                    }}
                                    className="text-purple-600 hover:text-purple-700 font-medium"
                                  >
                                    Responder
                                  </button>
                                )}
                              </div>

                              {/* Answers */}
                              {expandedQuestionId === question.id && (
                                <div className="mt-4 ml-4 pl-4 border-l-2 space-y-4" style={{ borderColor: TOKENS.colors.border }}>
                                  {question.answers.map((answer) => (
                                    <div key={answer.id} className="flex gap-3">
                                      <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
                                        answer.isInstructorAnswer
                                          ? "bg-purple-100 text-purple-600"
                                          : "bg-gray-100 text-gray-600"
                                      )}>
                                        {answer.author?.name?.charAt(0).toUpperCase() || "?"}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-medium text-gray-900 text-sm">
                                            {answer.author?.name || "Usuario"}
                                          </span>
                                          {answer.isInstructorAnswer && (
                                            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                              Instructor
                                            </span>
                                          )}
                                          {answer.isAccepted && (
                                            <span className="text-xs text-green-600">
                                              <IconCheck size={14} className="inline" /> Aceptada
                                            </span>
                                          )}
                                          <span className="text-xs text-gray-500">
                                            {formatDistanceToNow(new Date(answer.createdAt), { addSuffix: true, locale: es })}
                                          </span>
                                        </div>
                                        <p className="text-gray-700 text-sm">{answer.answerText}</p>
                                      </div>
                                    </div>
                                  ))}

                                  {/* Reply Form - Ocultar en modo preview */}
                                  {!isPreviewMode && replyingToId === question.id && (
                                    <div className="flex gap-3 mt-4">
                                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold shrink-0 text-sm">
                                        {user?.email?.charAt(0).toUpperCase() || "U"}
                                      </div>
                                      <div className="flex-1">
                                        <textarea
                                          value={replyText}
                                          onChange={(e) => setReplyText(e.target.value)}
                                          placeholder="Escribe tu respuesta..."
                                          className="w-full p-2 border rounded-lg resize-none text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                          rows={2}
                                          style={{ borderColor: TOKENS.colors.border }}
                                        />
                                        <div className="flex justify-end gap-2 mt-2">
                                          <button
                                            onClick={() => {
                                              setReplyingToId(null);
                                              setReplyText("");
                                            }}
                                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                                          >
                                            Cancelar
                                          </button>
                                          <button
                                            onClick={() => handleSubmitReply(question.id)}
                                            disabled={!replyText.trim() || submittingReply}
                                            className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-purple-700 flex items-center gap-1"
                                          >
                                            {submittingReply && <IconLoader2 className="w-3 h-3 animate-spin" />}
                                            Responder
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ===== NOTES TAB ===== */}
              {activeTab === "notes" && (
                <div className="max-w-4xl animate-in fade-in duration-200">
                  {/* New Note Input - Ocultar en modo preview */}
                  {!isPreviewMode && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                        <IconClock size={14} />
                        <span>Crear una nueva nota en {formatTimestamp(currentVideoTime)}</span>
                      </div>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={newNoteContent}
                          onChange={(e) => setNewNoteContent(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleCreateNote()}
                          placeholder="Escribe tu nota aquí..."
                          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          style={{ borderColor: TOKENS.colors.border }}
                        />
                        <button
                          onClick={handleCreateNote}
                          disabled={!newNoteContent.trim() || savingNote}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                          {savingNote ? (
                            <IconLoader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <IconNote size={18} />
                          )}
                          <span className="hidden sm:inline">Guardar</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mensaje en modo preview */}
                  {isPreviewMode && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Modo Vista Previa:</strong> Puedes ver las notas existentes, pero no puedes crear, editar ni eliminar notas.
                      </p>
                    </div>
                  )}

                  {/* Notes List */}
                  {loadingNotes ? (
                    <div className="flex items-center justify-center py-12">
                      <IconLoader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                      <IconNote size={48} className="mb-4 opacity-20" />
                      <h3 className="text-lg font-medium text-gray-900">Sin notas todavía</h3>
                      <p>Crea tu primera nota para recordar los puntos importantes.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className="p-4 border rounded-lg hover:shadow-sm transition-shadow"
                          style={{ borderColor: TOKENS.colors.border }}
                        >
                          {editingNoteId === note.id ? (
                            <div>
                              <textarea
                                value={editingNoteContent}
                                onChange={(e) => setEditingNoteContent(e.target.value)}
                                className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                rows={3}
                                style={{ borderColor: TOKENS.colors.border }}
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  onClick={() => {
                                    setEditingNoteId(null);
                                    setEditingNoteContent("");
                                  }}
                                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleUpdateNote(note.id)}
                                  disabled={!editingNoteContent.trim() || savingNote}
                                  className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-purple-700"
                                >
                                  Guardar cambios
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <button
                                    className="text-sm text-purple-600 bg-purple-50 px-2 py-0.5 rounded mb-2 hover:bg-purple-100"
                                    title="Ir a este momento del video"
                                  >
                                    {formatTimestamp(note.video_timestamp)}
                                  </button>
                                  <p className="text-gray-700">{note.content}</p>
                                </div>
                                {!isPreviewMode && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingNoteId(note.id);
                                        setEditingNoteContent(note.content);
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-purple-600 rounded transition-colors"
                                      title="Editar nota"
                                    >
                                      <IconEdit size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteNote(note.id)}
                                      className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                                      title="Eliminar nota"
                                    >
                                      <IconTrash size={16} />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-2">
                                {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: es })}
                              </p>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ZONE B: Curriculum Sidebar (Right) */}
        <aside className={cn(
          "w-[320px] lg:w-[360px] bg-white border-l flex flex-col transition-all duration-300 shrink-0",
          !sidebarOpen && "w-0 overflow-hidden border-0"
        )} style={{ borderColor: TOKENS.colors.border }}>
          {/* Sidebar Header */}
          <div className="p-4 flex items-center justify-between border-b bg-white shrink-0" style={{ borderColor: TOKENS.colors.border }}>
            <h3 className="font-bold text-gray-900">Contenido del curso</h3>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100"
            >
              <IconX size={18} />
            </button>
          </div>

          {/* Sections & Lessons List */}
          <div ref={sidebarScrollRef} className="flex-1 overflow-y-auto">
            {sortedLessons.map((lesson, lessonIndex) => {
              // Parsear subsecciones del content JSON
              let subsections: Subsection[] = [];
              try {
                if (lesson.content) {
                  const parsed = JSON.parse(lesson.content);
                  subsections = parsed.subsections || [];
                }
              } catch (e) {
                // Si falla el parse, subsections queda vacío
              }

              const isExpanded = expandedSections.has(lesson.id) ||
                (expandedSections.size === 0 && lesson.id === currentLessonId);
              const isActiveSection = lesson.id === currentLessonId;
              const totalDuration = lesson.durationMinutes || (subsections.length * 5); // Estimado 5 min por subsección

              // Progreso secuencial: índice más alto completado para esta lección
              const highestCompletedIndex = completedSubsectionsByLesson[lesson.id] ?? -1;
              // Si la lección está en completedLessons de la BD, todas las subsecciones están completadas
              const isLessonCompletedInDb = dbCompletedLessons.includes(lesson.id);
              const completedCount = isLessonCompletedInDb
                ? (subsections.length || 1)
                : (highestCompletedIndex >= 0 ? highestCompletedIndex + 1 : 0);

              // Calcular porcentaje de progreso
              const totalSubsections = subsections.length || 1;
              const sectionProgress = totalSubsections > 0
                ? Math.round((completedCount / totalSubsections) * 100)
                : 0;
              const isSectionCompleted = sectionProgress === 100;

              // Verificar si la sección está desbloqueada (para visualización)
              // La sección se muestra habilitada si:
              // 1. Es la primera sección
              // 2. La sección anterior está completada Y todos sus quizzes aprobados (≥60%)
              // 3. Es la sección siguiente a la actual (para permitir navegación con validación)
              const previousLesson = lessonIndex > 0 ? sortedLessons[lessonIndex - 1] : null;
              const prevHighestIndex = previousLesson ? (completedSubsectionsByLesson[previousLesson.id] ?? -1) : -1;
              const prevIsCompleted = previousLesson ? dbCompletedLessons.includes(previousLesson.id) : true;
              let prevSubsections: Subsection[] = [];
              let prevTotalSubsections = 1;
              if (previousLesson) {
                try {
                  if (previousLesson.content) {
                    const parsed = JSON.parse(previousLesson.content);
                    prevSubsections = parsed.subsections || [];
                    prevTotalSubsections = prevSubsections.length || 1;
                  }
                } catch (e) { }
              }

              // Verificar que TODOS los quizzes de la sección anterior estén aprobados (≥60%)
              let prevSectionQuizzesPassed = true;
              if (previousLesson && prevSubsections.length > 0) {
                for (let i = 0; i < prevSubsections.length; i++) {
                  const subHasQuiz = subsectionHasQuiz(previousLesson.id, i);
                  if (subHasQuiz) {
                    const quizScore = quizScores.get(`${previousLesson.id}-${i}`);
                    if (!quizScore || (quizScore.correct / quizScore.total) < 0.6) {
                      prevSectionQuizzesPassed = false;
                      break;
                    }
                  }
                }
              }

              // La sección está completamente desbloqueada si:
              // - Es la primera sección, O
              // - La sección anterior está completada Y sus quizzes aprobados
              const isSectionFullyUnlocked = lessonIndex === 0 ||
                ((prevIsCompleted || (prevHighestIndex >= 0 && prevHighestIndex >= prevTotalSubsections - 1))
                  && prevSectionQuizzesPassed);

              // La sección está parcialmente habilitada si es la siguiente a la actual
              // (permite clic pero muestra modal de validación)
              const currentLessonIndex = sortedLessons.findIndex(l => l.id === currentLessonId);
              const isNextSection = lessonIndex === currentLessonIndex + 1;

              // Verificar que TODOS los quizzes de la sección ACTUAL estén aprobados (≥60%)
              // Esto es necesario para bloquear la siguiente sección si hay quizzes sin aprobar en la actual
              let currentSectionQuizzesPassed = true;
              const currentLessonData = sortedLessons[currentLessonIndex];
              if (currentLessonData && quizScoresLoaded) {
                let currentLessonSubsections: Subsection[] = [];
                try {
                  if (currentLessonData.content) {
                    const parsed = JSON.parse(currentLessonData.content);
                    currentLessonSubsections = parsed.subsections || [];
                  }
                } catch (e) { }

                for (let i = 0; i < currentLessonSubsections.length; i++) {
                  const subHasQuiz = subsectionHasQuiz(currentLessonData.id, i);
                  if (subHasQuiz) {
                    const quizScore = quizScores.get(`${currentLessonData.id}-${i}`);
                    if (!quizScore || (quizScore.correct / quizScore.total) < 0.6) {
                      currentSectionQuizzesPassed = false;
                      break;
                    }
                  }
                }
              } else if (isNextSection && !quizScoresLoaded) {
                // Si los quiz scores no están cargados aún, bloquear la siguiente sección por precaución
                currentSectionQuizzesPassed = false;
              }

              // Para visualización: habilitar si está completamente desbloqueada 
              // o es la siguiente sección Y todos los quizzes de la sección actual están aprobados
              const isSectionUnlocked = isSectionFullyUnlocked || (isNextSection && currentSectionQuizzesPassed);

              return (
                <div key={lesson.id} className="border-b" style={{ borderColor: TOKENS.colors.border }}>
                  {/* Section Header (Lesson = Section) */}
                  <button
                    onClick={() => toggleSection(lesson.id)}
                    className={cn(
                      "w-full px-4 py-3 flex items-start justify-between text-left transition-colors",
                      isActiveSection ? "bg-gray-100" : "bg-gray-50 hover:bg-gray-100"
                    )}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h4 className="font-bold text-sm text-gray-900 leading-tight">
                          {lesson.title}
                        </h4>
                        {isSectionCompleted && (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse"
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: '#059669',
                              boxShadow: '0 0 8px rgba(16, 185, 129, 0.3)',
                            }}
                          >
                            <IconCheck size={12} />
                            100%
                          </span>
                        )}
                      </div>

                      {/* Barra de progreso */}
                      {totalSubsections > 0 && (
                        <div className="space-y-1 mb-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">
                              {completedCount} de {totalSubsections} lecciones
                            </span>
                            <span
                              className="font-semibold"
                              style={{ color: isSectionCompleted ? '#059669' : TOKENS.colors.accent }}
                            >
                              {sectionProgress}%
                            </span>
                          </div>
                          <div
                            className="w-full h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: '#E5E7EB' }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${sectionProgress}%`,
                                backgroundColor: isSectionCompleted ? '#10B981' : TOKENS.colors.accent,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-500">
                        {totalDuration} min
                      </p>
                    </div>
                    <IconChevronDown
                      size={18}
                      className={cn(
                        "text-gray-500 transition-transform duration-200 mt-0.5 shrink-0",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>

                  {/* Subsections (Real Lessons) */}
                  {isExpanded && (
                    <div className="bg-white">
                      {subsections.length > 0 ? (
                        subsections.map((subsection, subIndex) => {
                          // La subsección activa es la que coincide con el índice actual
                          const isActiveSubsection = isActiveSection && subIndex === activeSubsectionIndex;

                          // Considerar completadas todas las subsecciones hasta highestCompletedIndex
                          // O si la lección entera está marcada como completada en la BD
                          const highestCompletedIndexForLesson = completedSubsectionsByLesson[lesson.id] ?? -1;
                          const isLessonFullyCompleted = dbCompletedLessons.includes(lesson.id);
                          const isCompleted = isLessonFullyCompleted || subIndex <= highestCompletedIndexForLesson;

                          // Verificar si la subsección tiene quiz y su estado de aprobación
                          const subHasQuiz = subsectionHasQuiz(lesson.id, subIndex);
                          const subQuizScore = quizScores.get(`${lesson.id}-${subIndex}`);
                          const isSubQuizPassed = subQuizScore
                            ? (subQuizScore.correct / subQuizScore.total) >= 0.6
                            : false;

                          // Verificar si la subsección está desbloqueada visualmente
                          let isSubsectionUnlocked = false;

                          // Verificar si hay CUALQUIER subsección anterior sin completar o quiz sin aprobar
                          // Esta lógica es más estricta: verifica TODAS las subsecciones anteriores
                          let hasIncompletePreviousSubsection = false;
                          for (let i = 0; i < subIndex; i++) {
                            // Verificar si la subsección anterior está completada
                            const prevSubIsCompleted = isLessonFullyCompleted || i <= highestCompletedIndexForLesson;

                            // Verificar si la subsección anterior tiene quiz
                            const prevHasQuiz = subsectionHasQuiz(lesson.id, i);

                            if (prevHasQuiz) {
                              // Si tiene quiz, verificar que esté APROBADO (≥60%)
                              const prevScore = quizScores.get(`${lesson.id}-${i}`);
                              if (!prevScore || (prevScore.correct / prevScore.total) < 0.6) {
                                hasIncompletePreviousSubsection = true;
                                break;
                              }
                            } else {
                              // Sin quiz: la subsección debe estar marcada como completada
                              if (!prevSubIsCompleted) {
                                hasIncompletePreviousSubsection = true;
                                break;
                              }
                            }
                          }

                          if (subIndex === 0) {
                            // Primera subsección desbloqueada solo si:
                            // - Es la lección actual, O
                            // - La sección está completamente desbloqueada (incluye verificación de quizzes)
                            isSubsectionUnlocked = lesson.id === currentLessonId || isSectionFullyUnlocked;
                          } else if (hasIncompletePreviousSubsection) {
                            // Si hay alguna subsección anterior incompleta o quiz sin aprobar, bloquear
                            isSubsectionUnlocked = false;
                          } else if (isCompleted || isLessonFullyCompleted) {
                            // Si ya está completada y NO hay subsección anterior incompleta, desbloqueada
                            isSubsectionUnlocked = true;
                          } else if (lesson.id === currentLessonId) {
                            // Estamos en la sección actual
                            const isCurrentlyActive = subIndex === activeSubsectionIndex;
                            const isNextToActive = subIndex === activeSubsectionIndex + 1;

                            // Verificar si la subsección ACTIVA tiene quiz no aprobado
                            const activeSubHasQuiz = subsectionHasQuiz(lesson.id, activeSubsectionIndex);
                            const activeQuizScore = quizScores.get(`${lesson.id}-${activeSubsectionIndex}`);
                            const isActiveQuizPassed = activeQuizScore
                              ? (activeQuizScore.correct / activeQuizScore.total) >= 0.6
                              : false;

                            // Si la subsección activa tiene quiz sin aprobar, bloquear la siguiente
                            const isActiveSubBlocked = activeSubHasQuiz && !isActiveQuizPassed;

                            // Verificar si la subsección activa (sin quiz) no ha sido completada (scroll)
                            const activeSubIsCompleted = activeSubsectionIndex <= highestCompletedIndexForLesson;
                            const isActiveNonQuizIncomplete = !activeSubHasQuiz && !activeSubIsCompleted;

                            if (isNextToActive && (isActiveSubBlocked || isActiveNonQuizIncomplete)) {
                              // Bloquear la siguiente si la actual tiene quiz sin aprobar O no se ha hecho scroll
                              isSubsectionUnlocked = false;
                            } else {
                              isSubsectionUnlocked = subIndex <= highestCompletedIndexForLesson + 1 || isCurrentlyActive;
                            }
                          } else if (isSectionFullyUnlocked) {
                            // Para otras secciones desbloqueadas, permitir acceso secuencial
                            isSubsectionUnlocked = subIndex === 0 || subIndex <= highestCompletedIndexForLesson + 1;
                          } else {
                            isSubsectionUnlocked = false;
                          }

                          const handleSubsectionClick = () => {
                            // No permitir navegación si está completamente bloqueada
                            if (!isSubsectionUnlocked) {
                              // Mostrar modal de error indicando qué falta
                              const currentSubIndex = activeSubsectionIndex;
                              const currentSubCompleted = currentSubIndex <= highestCompletedIndexForLesson;

                              if (!currentSubCompleted) {
                                const currentHasQuiz = subsectionHasQuiz(lesson.id, currentSubIndex);
                                const currentSubsection = subsections[currentSubIndex];

                                if (currentHasQuiz) {
                                  setCompletionModalType('error');
                                  setCompletionModalMessage(`Debes completar el cuestionario de la lección "${currentSubsection?.title || 'actual'}" antes de poder avanzar.`);
                                } else {
                                  setCompletionModalType('error');
                                  setCompletionModalMessage(`Debes completar la lección "${currentSubsection?.title || 'actual'}" antes de poder avanzar a esta sección.`);
                                }
                                setShowCompletionModal(true);
                              }
                              return;
                            }

                            if (lesson.id === currentLessonId) {
                              // Si ya estamos en esta misma lección
                              const previousIndex = activeSubsectionIndex;
                              const nextIndex = subIndex;

                              // Si hace clic en la misma subsección, no hacer nada
                              if (nextIndex === previousIndex) {
                                return;
                              }

                              // Si va a una subsección anterior (ya completada), navegar directamente
                              if (nextIndex < previousIndex) {
                                setActiveSubsectionIndex(nextIndex);
                                return;
                              }

                              // Si la subsección actual ya está completada, navegar directamente
                              const currentSubCompleted = previousIndex <= highestCompletedIndexForLesson;
                              if (currentSubCompleted) {
                                setActiveSubsectionIndex(nextIndex);
                                return;
                              }

                              // Verificar si la subsección actual tiene quiz
                              const currentHasQuiz = subsectionHasQuiz(lesson.id, previousIndex);
                              const currentSubsection = subsections[previousIndex];

                              if (currentHasQuiz) {
                                // Verificar si el quiz ha sido completado
                                const quizKey = `${lesson.id}-${previousIndex}`;
                                const quizScore = quizScores.get(quizKey);

                                if (!quizScore) {
                                  // Quiz no completado
                                  setCompletionModalType('error');
                                  setCompletionModalMessage(`Debes completar el cuestionario de la lección "${currentSubsection?.title || 'actual'}" antes de avanzar.`);
                                  setShowCompletionModal(true);
                                  return;
                                }

                                // Verificar si el quiz fue aprobado (≥60%)
                                const quizPercentage = quizScore.correct / quizScore.total;
                                if (quizPercentage < 0.6) {
                                  setCompletionModalType('error');
                                  setCompletionModalMessage(`Debes obtener al menos 60% en el cuestionario para avanzar. Tu puntuación actual: ${Math.round(quizPercentage * 100)}%. Intenta de nuevo.`);
                                  setShowCompletionModal(true);
                                  return;
                                }
                              }

                              // Si es una lección de lectura (sin quiz), verificar que haya hecho scroll
                              // Si no ha hecho scroll, mostrar error. Si ha hecho scroll, mostrar modal de confirmación
                              if (!hasScrolledToEnd) {
                                setCompletionModalType('error');
                                setCompletionModalMessage(`Debes revisar todo el contenido de esta lección antes de continuar. Desplázate hasta el final.`);
                                setShowCompletionModal(true);
                                return;
                              }

                              // Si ha hecho scroll, mostrar modal de confirmación
                              setCompletionModalType('confirm');
                              setCompletionModalMessage('');
                              setPendingNavigation({
                                lessonId: lesson.id,
                                fromSubIndex: previousIndex,
                                toSubIndex: nextIndex,
                                subsectionsLength: subsections.length,
                              });
                              setShowCompletionModal(true);
                            } else {
                              // Navegar a otra lección/sección
                              if (!isSectionUnlocked) {
                                return;
                              }

                              // Si la sección está completamente desbloqueada, navegar directamente
                              if (isSectionFullyUnlocked) {
                                setActiveSubsectionIndex(subIndex);
                                goToLesson(lesson.id);
                                return;
                              }

                              // Si es la siguiente sección pero la actual no está completa,
                              // mostrar modal de validación
                              const currentLesson = sortedLessons.find(l => l.id === currentLessonId);
                              if (!currentLesson) return;

                              let currentSubsections: Subsection[] = [];
                              try {
                                if (currentLesson.content) {
                                  const parsed = JSON.parse(currentLesson.content);
                                  currentSubsections = parsed.subsections || [];
                                }
                              } catch { }

                              const currentHighestIndex = completedSubsectionsByLesson[currentLessonId] ?? -1;
                              const currentIsFullyCompleted = dbCompletedLessons.includes(currentLessonId) ||
                                (currentHighestIndex >= currentSubsections.length - 1);

                              if (currentIsFullyCompleted) {
                                // La sección actual está completa, navegar
                                setActiveSubsectionIndex(subIndex);
                                goToLesson(lesson.id);
                              } else {
                                // La sección actual no está completa, mostrar modal
                                const activeSubIndex = activeSubsectionIndex;
                                const currentSubCompleted = activeSubIndex <= currentHighestIndex;

                                if (!currentSubCompleted) {
                                  const currentHasQuiz = subsectionHasQuiz(currentLessonId, activeSubIndex);
                                  const currentSubsection = currentSubsections[activeSubIndex];

                                  if (currentHasQuiz) {
                                    setCompletionModalType('error');
                                    setCompletionModalMessage(`Debes completar el cuestionario de la lección "${currentSubsection?.title || 'actual'}" antes de avanzar a la siguiente sección.`);
                                    setShowCompletionModal(true);
                                  } else {
                                    // Mostrar modal de confirmación para completar la sección actual
                                    setCompletionModalType('confirm');
                                    setCompletionModalMessage('');
                                    setPendingNavigation({
                                      lessonId: currentLessonId,
                                      fromSubIndex: activeSubIndex,
                                      toSubIndex: currentSubsections.length - 1, // Marcar hasta el final
                                      subsectionsLength: currentSubsections.length,
                                    });
                                    // Guardar la navegación pendiente a la nueva sección
                                    setPendingNavigationToSection({
                                      lessonId: lesson.id,
                                      subIndex: subIndex,
                                    });
                                    setShowCompletionModal(true);
                                  }
                                } else {
                                  // La subsección actual está completa pero no la sección completa
                                  // Mostrar mensaje indicando cuántas faltan
                                  const remaining = currentSubsections.length - currentHighestIndex - 1;
                                  setCompletionModalType('error');
                                  setCompletionModalMessage(`Debes completar ${remaining} lección${remaining > 1 ? 'es' : ''} más de la sección "${currentLesson.title}" antes de avanzar a la siguiente sección.`);
                                  setShowCompletionModal(true);
                                }
                              }
                            }
                          };

                          return (
                            <div
                              key={subsection.id}
                              onClick={handleSubsectionClick}
                              className={cn(
                                "pl-6 pr-4 py-2.5 flex gap-3 transition-colors relative",
                                isSubsectionUnlocked
                                  ? "cursor-pointer hover:bg-gray-50"
                                  : "cursor-not-allowed opacity-60",
                                isActiveSubsection && "bg-purple-100"
                              )}
                            >
                              {/* Indicador de lección activa - barra vertical morada */}
                              {isActiveSubsection && (
                                <div
                                  className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full"
                                  style={{ backgroundColor: TOKENS.colors.accent }}
                                />
                              )}
                              {/* Círculo de estado */}
                              <div className="pt-0.5 shrink-0">
                                <div
                                  className={cn(
                                    "w-4 h-4 border-2 rounded-full flex items-center justify-center",
                                    isActiveSubsection
                                      ? "bg-purple-600 border-purple-600"
                                      : isCompleted
                                        ? "bg-purple-50 border-purple-600"
                                        : isSubsectionUnlocked
                                          ? "border-gray-300 bg-white"
                                          : "border-gray-300 bg-gray-100"
                                  )}
                                >
                                  {(isActiveSubsection || isCompleted) && (
                                    <IconCheck
                                      size={10}
                                      className={isActiveSubsection ? "text-white" : "text-purple-600"}
                                    />
                                  )}
                                </div>
                              </div>

                              {/* Subsection Info */}
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-sm leading-tight",
                                  isActiveSubsection ? "text-gray-900 font-medium" :
                                    isSubsectionUnlocked ? "text-gray-700" : "text-gray-400"
                                )}>
                                  {subIndex + 1}. {subsection.title}
                                </p>
                                <div className={cn(
                                  "flex items-center gap-1.5 mt-1 text-xs",
                                  isSubsectionUnlocked ? "text-gray-500" : "text-gray-400"
                                )}>
                                  {/* Iconos según tipo de contenido */}
                                  <div className="flex items-center gap-1">
                                    {getSubsectionContentIcons(subsection.blocks)}
                                  </div>
                                  <span>5 min</span>
                                  {/* Quiz score badge */}
                                  {quizScores.has(`${lesson.id}-${subIndex}`) && (() => {
                                    const score = quizScores.get(`${lesson.id}-${subIndex}`)!;
                                    const percentage = Math.round((score.correct / score.total) * 100);
                                    const isGood = percentage >= 70;
                                    return (
                                      <span
                                        className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                                        style={{
                                          backgroundColor: isGood ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                          color: isGood ? '#059669' : '#D97706',
                                        }}
                                      >
                                        {score.correct}/{score.total} ({percentage}%)
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        // Si no hay subsecciones, mostrar la lección como único item
                        <div
                          onClick={() => {
                            setActiveSubsectionIndex(0);
                            goToLesson(lesson.id);
                          }}
                          className={cn(
                            "pl-6 pr-4 py-2.5 flex gap-3 cursor-pointer transition-colors relative",
                            isActiveSection
                              ? "bg-purple-100"
                              : "hover:bg-gray-50"
                          )}
                        >
                          {/* Indicador de lección activa - barra vertical morada */}
                          {isActiveSection && (
                            <div
                              className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full"
                              style={{ backgroundColor: TOKENS.colors.accent }}
                            />
                          )}
                          <div className="pt-0.5 shrink-0">
                            <div className={cn(
                              "w-4 h-4 border-2 rounded-full flex items-center justify-center",
                              isActiveSection
                                ? "bg-purple-600 border-purple-600"
                                : isSectionCompleted
                                  ? "bg-purple-50 border-purple-600"
                                  : "border-gray-300 bg-white"
                            )}>
                              {(isActiveSection || isSectionCompleted) && <IconCheck size={10} className={isActiveSection ? "text-white" : "text-purple-600"} />}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm leading-tight",
                              isActiveSection ? "text-gray-900 font-medium" : "text-gray-700"
                            )}>
                              1. {lesson.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                              <IconFileText size={12} title="Documento" />
                              <span>{lesson.durationMinutes || 5} min</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        </aside>

        {/* Toggle Sidebar Button (cuando está cerrado) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 bg-white border border-r-0 p-2 rounded-l-lg shadow-lg z-20 hover:bg-gray-50"
            style={{ borderColor: TOKENS.colors.border }}
          >
            <IconChevronLeft size={20} />
          </button>
        )}
      </main>

      {/* Course Rating Modal */}
      {user && (
        <CourseRatingModal
          isOpen={isRatingModalOpen}
          onClose={() => setIsRatingModalOpen(false)}
          courseId={courseId}
          userId={user.id}
          courseName={courseInfo?.title}
          courseProgress={visualProgress}
          onRatingSubmitted={(review) => {
            setUserRating(review.rating);
          }}
          onRatingDeleted={() => {
            setUserRating(null);
          }}
        />
      )}

      {/* Modal de confirmación/error para completar lección */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              {completionModalType === 'confirm' ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <IconCheck className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      ¡Excelente trabajo! 🎉
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    ¿Listo para continuar a la siguiente lección?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancelCompletion}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Seguir revisando
                    </button>
                    <button
                      onClick={handleConfirmCompletion}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
                    >
                      ¡Continuar! →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <IconX className="w-6 h-6 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Lección incompleta
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    {completionModalMessage || 'Debes completar la lección actual antes de avanzar.'}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancelCompletion}
                      className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                    >
                      Entendido
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confetti Animation - Celebración al completar sección */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[60]">
          {/* Overlay suave */}
          <div className="absolute inset-0 bg-black/10 animate-pulse" />

          {/* Confetti particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10px',
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              >
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor: [
                      '#A855F7', '#8B5CF6', '#6366F1', '#3B82F6',
                      '#10B981', '#F59E0B', '#EF4444', '#EC4899'
                    ][Math.floor(Math.random() * 8)],
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Celebration message */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 text-center animate-bounce-in transform scale-100">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Felicidades!
              </h2>
              <p className="text-gray-600">
                {confettiMessage || '¡Sección completada!'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Custom styles for confetti animation */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes bounce-in {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        :global(.animate-confetti) {
          animation: confetti-fall linear forwards;
        }
        :global(.animate-bounce-in) {
          animation: bounce-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}







