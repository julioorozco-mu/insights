"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import CourseRatingModal from "@/components/course/CourseRatingModal";

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
  type: 'heading' | 'text' | 'image' | 'video' | 'attachment' | 'list' | 'table';
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
function extractStoragePath(url: string): { bucket: string; path: string } | null {
  // URL format: https://xxx.supabase.co/storage/v1/object/public/BUCKET/PATH
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (match) {
    return { bucket: match[1], path: decodeURIComponent(match[2]) };
  }
  return null;
}

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

// ===== COMPONENT: Content Block Renderer =====
function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading':
      return (
        <h2 className="text-2xl font-bold text-[#192170] mb-4 mt-6 first:mt-0">
          {block.content}
        </h2>
      );
    
    case 'text':
      return (
        <p className="text-gray-700 leading-relaxed mb-4">
          {block.content}
        </p>
      );
    
    case 'image':
      return (
        <div className="my-6 rounded-lg overflow-hidden">
          <img 
            src={block.content} 
            alt={block.data?.fileName || 'Imagen de la lección'}
            className="w-full h-auto max-h-[500px] object-contain bg-gray-100"
          />
          {block.data?.fileName && (
            <p className="text-xs text-gray-500 mt-2 text-center">{block.data.fileName}</p>
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
    
    default:
      return null;
  }
}

// ===== COMPONENT: Subsection Content Viewer =====
function SubsectionViewer({ subsection }: { subsection: Subsection | null }) {
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
        <ContentBlockRenderer key={block.id} block={block} />
      ))}
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
  
  // Rating modal state
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  
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
  const visualProgress = useMemo(() => {
    if (sortedLessons.length === 0) return 0;
    
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
    
    if (totalSubsections === 0) return 0;
    return Math.round((completedSubsections / totalSubsections) * 100);
  }, [sortedLessons, dbCompletedLessons, completedSubsectionsByLesson]);

  // ===== HELPER: Update progress in background =====
  const updateProgressInBackground = useCallback(async (
    lessonId: string,
    subsectionIndex: number,
    isCompleted: boolean,
    totalSubsections: number
  ) => {
    if (!user || !courseId || isUpdatingProgressRef.current) return;
    
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
      }
    } catch (error) {
      console.error('[updateProgressInBackground] Error:', error);
    } finally {
      isUpdatingProgressRef.current = false;
    }
  }, [user, courseId]);

  // ===== FETCH DATA =====
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !courseId) return;
      if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;
      setLoading(true);

      try {
        // Fetch lessons, sections and course info
        const lessonsRes = await fetch(`/api/student/getLessons?courseId=${courseId}&userId=${user.id}`);
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
  }, [courseId, user]);

  // ===== FETCH PROGRESS FROM DB =====
  useEffect(() => {
    const fetchProgress = async () => {
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
  }, [user, courseId, currentLessonId, router]);

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
  }, [currentLessonId, searchParams]);

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
    if (!currentLessonId || !user) return;
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
  }, [currentLessonId, user]);

  useEffect(() => {
    if (activeTab === "notes") {
      fetchNotes();
    }
  }, [activeTab, fetchNotes]);

  // Fetch questions when lesson changes or tab opens
  const fetchQuestions = useCallback(async () => {
    if (!currentLessonId) return;
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
  }, [currentLessonId, questionSortBy]);

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
        <div className="flex items-center gap-4 overflow-hidden">
          <button 
            onClick={() => router.push(`/student/courses/${courseId}`)} 
            className="text-white hover:text-gray-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white font-bold text-xs">MU</div>
              <div className="h-6 w-[1px] bg-gray-700 mx-2 hidden sm:block"></div>
              <span className="text-gray-300 text-sm font-medium truncate max-w-[150px] md:max-w-md hidden sm:block">
                {courseInfo?.title ? `Microcredencial - ${courseInfo.title}` : "Volver al curso"}
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-4 text-white">
          {/* Progress Indicator */}
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-300">
            <button 
              onClick={() => setIsRatingModalOpen(true)}
              className="flex items-center gap-1 text-yellow-400 cursor-pointer hover:text-yellow-300 transition-colors"
            >
              <IconStar size={16} fill="currentColor" />
              <span className="font-medium">Calificar</span>
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
                        } catch {}
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
          
          <button className="p-2 rounded hover:bg-white/10 transition-colors">
            <IconDotsVertical size={18} />
          </button>
        </div>
      </header>

      {/* ===== MAIN CONTENT (Split Screen) ===== */}
      <main className="flex flex-1 overflow-hidden">
        
        {/* ZONE A: Main Content Stage (Left) */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          
          {/* Lesson Content Area */}
          <div className="flex-1 bg-white p-6 md:p-8 overflow-y-auto">
            <SubsectionViewer subsection={activeSubsection} />
          </div>

          {/* Lower Tabs & Content */}
          <div className="bg-white border-t flex-1 flex flex-col" style={{ borderColor: TOKENS.colors.border }}>
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
                  {/* New Question Input */}
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
                                <button className="flex items-center gap-1 text-gray-500 hover:text-purple-600 transition-colors">
                                  <IconThumbUp size={16} />
                                  <span>{question.upvotes}</span>
                                </button>
                                <button 
                                  onClick={() => setExpandedQuestionId(expandedQuestionId === question.id ? null : question.id)}
                                  className="text-gray-500 hover:text-purple-600 transition-colors"
                                >
                                  {question.answersCount} respuesta{question.answersCount !== 1 ? 's' : ''}
                                </button>
                                <button 
                                  onClick={() => {
                                    setReplyingToId(replyingToId === question.id ? null : question.id);
                                    setExpandedQuestionId(question.id);
                                  }}
                                  className="text-purple-600 hover:text-purple-700 font-medium"
                                >
                                  Responder
                                </button>
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

                                  {/* Reply Form */}
                                  {replyingToId === question.id && (
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
                  {/* New Note Input */}
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
          <div className="flex-1 overflow-y-auto">
            {sortedLessons.map((lesson) => {
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
                      <h4 className="font-bold text-sm text-gray-900 leading-tight">
                        {lesson.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {completedCount} / {subsections.length || 1} | {totalDuration} min
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

                          const handleSubsectionClick = () => {
                            if (lesson.id === currentLessonId) {
                              // Si ya estamos en esta misma lección
                              const previousIndex = activeSubsectionIndex;
                              const nextIndex = subIndex;

                              // Si el alumno avanza de forma consecutiva (ej. 0 -> 1, 1 -> 2)
                              if (nextIndex === previousIndex + 1) {
                                // Actualización optimista del estado local
                                setCompletedSubsectionsByLesson((prev) => {
                                  const currentMax = prev[lesson.id] ?? -1;
                                  const newMax = Math.max(currentMax, previousIndex);
                                  return {
                                    ...prev,
                                    [lesson.id]: newMax,
                                  };
                                });

                                // Verificar si es la última subsección (lección completada)
                                const isLastSubsection = nextIndex === subsections.length - 1;
                                
                                // Guardar progreso en segundo plano (sin bloquear UI)
                                updateProgressInBackground(
                                  lesson.id,
                                  previousIndex, // Guardamos el índice que acabamos de completar
                                  isLastSubsection,
                                  subsections.length
                                );
                              }

                              setActiveSubsectionIndex(nextIndex);
                            } else {
                              // Navegar a otra lección y establecer subsección inicial
                              setActiveSubsectionIndex(subIndex);
                              goToLesson(lesson.id);
                            }
                          };

                          return (
                            <div 
                              key={subsection.id}
                              onClick={handleSubsectionClick}
                              className={cn(
                                "pl-6 pr-4 py-2.5 flex gap-3 cursor-pointer transition-colors",
                                isActiveSubsection 
                                  ? "bg-purple-100" 
                                  : "hover:bg-gray-50"
                              )}
                            >
                              {/* Checkbox */}
                              <div className="pt-0.5 shrink-0">
                                <div
                                  className={cn(
                                    "w-4 h-4 border rounded-sm flex items-center justify-center",
                                    isActiveSubsection
                                      ? "bg-purple-600 border-purple-600"
                                      : isCompleted
                                        ? "bg-purple-50 border-purple-600"
                                        : "border-gray-400 bg-white"
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
                                  isActiveSubsection ? "text-gray-900 font-medium" : "text-gray-700"
                                )}>
                                  {subIndex + 1}. {subsection.title}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                                  <IconVideo size={12} />
                                  <span>5 min</span>
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
                            "pl-6 pr-4 py-2.5 flex gap-3 cursor-pointer transition-colors",
                            isActiveSection 
                              ? "bg-purple-100" 
                              : "hover:bg-gray-50"
                          )}
                        >
                          <div className="pt-0.5 shrink-0">
                            <div className={cn(
                              "w-4 h-4 border rounded-sm flex items-center justify-center",
                              isActiveSection 
                                ? "bg-purple-600 border-purple-600" 
                                : "border-gray-400 bg-white"
                            )}>
                              {isActiveSection && <IconCheck size={10} className="text-white" />}
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
                              <IconVideo size={12} />
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
          onRatingSubmitted={(review) => {
            console.log("Rating submitted:", review);
            // Optionally show a toast notification here
          }}
          onRatingDeleted={() => {
            console.log("Rating deleted");
            // Optionally show a toast notification here
          }}
        />
      )}
    </div>
  );
}
