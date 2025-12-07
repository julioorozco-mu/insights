"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPlay,
  IconCheck,
  IconMenu2,
  IconX,
  IconShare,
  IconDotsVertical,
  IconStar,
  IconMessageCircle,
  IconNote,
  IconFileText,
  IconVideo,
  IconCheckbox
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// ===== TYPES =====
interface Lesson {
  id: string;
  title: string;
  description?: string;
  content?: string; // JSON string with subsections
  durationMinutes?: number;
  order: number;
}

interface Subsection {
  id: string;
  title: string;
  blocks: any[]; // simplified for now
}

interface ParsedContent {
  subsections: Subsection[];
}

// ===== TOKENS FROM cinema-on.json =====
const TOKENS = {
  colors: {
    topbar: "#111118",
    accent: "#A435F0",
    accentSoft: "#F3E8FF",
    backgroundApp: "#F3F4F6",
    canvas: "#FFFFFF",
    textPrimary: "#111827",
    textSecondary: "#4B5563",
    textLink: "#A435F0",
    textOnDark: "#F9FAFB",
  },
  spacing: {
    topbarHeight: "64px",
  }
};

// ===== HELPER: Parse Content =====
function parseLessonContent(contentString?: string): ParsedContent | null {
  if (!contentString) return null;
  try {
    const parsed = JSON.parse(contentString);
    if (parsed.subsections && Array.isArray(parsed.subsections)) {
      return parsed as ParsedContent;
    }
    return null;
  } catch {
    return null;
  }
}

export default function LessonPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courseTitle, setCourseTitle] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "questions" | "notes">("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true); // Responsive toggle logic could be added
  
  // Derived State
  const courseId = params.courseId as string;
  const currentLessonId = params.lessonId as string; // This URL param maps to the specific subsection/lesson being played

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !courseId) return;

      try {
        // 1. Fetch Course Details (for title) - simplified fetch
        // In a real app we might have a getCourseById API or use the same getLessons API if it returned course info
        // For now we will rely on the lessons API to populate content
        
        // 2. Fetch Lessons
        const lessonsRes = await fetch(`/api/student/getLessons?courseId=${courseId}&userId=${user.id}`);
        if (lessonsRes.ok) {
          const data = await lessonsRes.json();
          setLessons(data.lessons || []);
          // Assuming we could get title from somewhere, or just use first lesson's course info if available
          // For now placeholder or if API returned it.
          // Since the API strictly returns lessons, we might need a separate call for Course Title or pass it via query param?
          // Let's try to fetch course info separately or fallback.
        }
        
        // Fetch basic course info for the header title
        // We'll reuse the client-side query pattern if possible, or just fetch from public API if exists
        // Or we can assume the user came from the dashboard and we might have it in cache (unreliable).
        // Let's just fetch the course title quickly via Supabase REST if possible or a new endpoint.
        // For this demo, I'll set a placeholder or try to fetch.
        
      } catch (error) {
        console.error("Error fetching course data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, user]);

  // Find current context
  // We need to flatten the structure to find "Next" and "Prev" logic easily
  // Structure: Lesson -> Subsections. The URL `lessonId` corresponds to a Subsection ID usually, 
  // BUT the prompt says "en cada LessonItem (subseccion)... redireccionar a .../[lessonId]".
  // So `params.lessonId` is likely the SUBSECTION ID.
  
  // Let's build a flat map of all playable units
  const flatPlayableUnits: { 
    uid: string; // subsection id
    lessonId: string; // parent lesson id
    title: string; 
    lessonTitle: string;
    type: 'video' | 'text' | 'quiz';
  }[] = [];

  lessons.forEach(lesson => {
    const content = parseLessonContent(lesson.content);
    if (content?.subsections) {
      content.subsections.forEach(sub => {
        flatPlayableUnits.push({
          uid: sub.id,
          lessonId: lesson.id,
          title: sub.title,
          lessonTitle: lesson.title,
          type: 'video' // Defaulting to video for now, logic would detect block types
        });
      });
    } else {
      // Fallback if no subsections, maybe the lesson itself is the unit?
      // The previous implementation seemed to rely heavily on subsections.
    }
  });

  const currentIndex = flatPlayableUnits.findIndex(u => u.uid === currentLessonId);
  const currentUnit = flatPlayableUnits[currentIndex];
  const prevUnit = flatPlayableUnits[currentIndex - 1];
  const nextUnit = flatPlayableUnits[currentIndex + 1];

  // Navigation Handlers
  const goToUnit = (uid: string) => {
    router.push(`/student/courses/${courseId}/learn/lecture/${uid}`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#111118] text-white">Cargando...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: TOKENS.colors.backgroundApp }}>
      
      {/* ===== TOP BAR (Dark Mode) ===== */}
      <header 
        className="flex items-center justify-between px-4 md:px-6 sticky top-0 z-50"
        style={{ height: TOKENS.spacing.topbarHeight, backgroundColor: TOKENS.colors.topbar }}
      >
        <div className="flex items-center gap-4 overflow-hidden">
          {/* Logo / Back */}
          <button onClick={() => router.push(`/dashboard/student/courses/${courseId}`)} className="text-white hover:text-gray-300 transition-colors">
             {/* Using a simple chevron/text for "Back to Dashboard" as "Platform Logo" usually goes home */}
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white font-bold text-xs">MU</div>
                <div className="h-6 w-[1px] bg-gray-700 mx-2"></div>
                <span className="text-gray-300 text-sm font-medium truncate max-w-[200px] md:max-w-md">
                  {courseTitle || "Volver al curso"}
                </span>
             </div>
          </button>
        </div>

        <div className="flex items-center gap-4 text-white">
          {/* Progress (Mock) */}
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-300">
            <div className="flex items-center gap-1 text-yellow-400">
              <IconStar size={16} fill="currentColor" />
              <span className="font-bold">Deja una calificación</span>
            </div>
            <div className="h-4 w-[1px] bg-gray-700 mx-2"></div>
            <div className="flex items-center gap-2 cursor-pointer hover:text-white">
              <div className="relative w-8 h-8">
                 <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path className="text-gray-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path className="text-purple-500" strokeDasharray="75, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center text-[10px]">
                   <IconCheck size={12} />
                 </div>
              </div>
              <span>Tu progreso</span>
            </div>
          </div>

          <button className="btn btn-sm btn-outline border-white text-white hover:bg-white hover:text-black gap-2">
            <IconShare size={16} />
            <span className="hidden sm:inline">Compartir</span>
          </button>
          
          <button className="btn btn-sm btn-ghost btn-circle text-white">
            <IconDotsVertical size={20} />
          </button>
        </div>
      </header>

      {/* ===== MAIN CONTENT (Split Screen) ===== */}
      <main className="flex flex-1 overflow-hidden h-[calc(100vh-64px)]">
        
        {/* ZONE A: Main Content Stage (Left) */}
        <div className="flex-1 overflow-y-auto scrollbar-hide relative flex flex-col">
          
          {/* Content Canvas */}
          <div className="flex-1" style={{ backgroundColor: TOKENS.colors.topbar }}> {/* Dark background for cinema effect */}
             <div className="w-full h-full flex flex-col">
                
                {/* Video Player Placeholder / Dynamic Content */}
                <div className="flex-1 bg-black flex items-center justify-center relative group">
                   {currentUnit ? (
                     <div className="w-full h-full flex items-center justify-center text-white">
                       {/* Simulate Video Player */}
                       <div className="text-center">
                         <IconPlayerPlay size={64} className="mx-auto mb-4 opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer" />
                         <h2 className="text-xl font-medium">{currentUnit.title}</h2>
                         <p className="text-gray-400 text-sm mt-2">{currentUnit.lessonTitle}</p>
                       </div>
                     </div>
                   ) : (
                     <div className="text-white">Selecciona una lección</div>
                   )}

                   {/* Side Arrow Controls (Overlay) */}
                   {prevUnit && (
                     <button 
                       onClick={() => goToUnit(prevUnit.uid)}
                       className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-12 bg-[#2D2F31] hover:bg-[#3E4143] text-white flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                     >
                       <IconChevronLeft size={24} />
                     </button>
                   )}
                   {nextUnit && (
                     <button 
                       onClick={() => goToUnit(nextUnit.uid)}
                       className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-12 bg-[#2D2F31] hover:bg-[#3E4143] text-white flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                     >
                       <IconChevronRight size={24} />
                     </button>
                   )}
                </div>
             </div>
          </div>

          {/* Lower Tabs & Meta Info */}
          <div className="bg-white border-t border-gray-200 min-h-[300px]">
             {/* Tab Navigation */}
             <div className="border-b border-gray-200 px-8">
               <div className="flex gap-8">
                 <button 
                   onClick={() => setActiveTab("overview")}
                   className={cn(
                     "py-4 text-sm font-semibold border-b-2 transition-colors",
                     activeTab === "overview" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700"
                   )}
                 >
                   Descripción general
                 </button>
                 <button 
                   onClick={() => setActiveTab("questions")}
                   className={cn(
                     "py-4 text-sm font-semibold border-b-2 transition-colors",
                     activeTab === "questions" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700"
                   )}
                 >
                   Preguntas y respuestas
                 </button>
                 <button 
                   onClick={() => setActiveTab("notes")}
                   className={cn(
                     "py-4 text-sm font-semibold border-b-2 transition-colors",
                     activeTab === "notes" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700"
                   )}
                 >
                   Notas
                 </button>
               </div>
             </div>

             {/* Tab Content */}
             <div className="p-8 max-w-4xl">
               {activeTab === "overview" && currentUnit && (
                 <div className="animate-in fade-in duration-200">
                   <h1 className="text-2xl font-bold text-gray-900 mb-4">{currentUnit.lessonTitle}</h1>
                   
                   <div className="flex items-center gap-4 text-sm text-gray-600 mb-8">
                      <div className="flex items-center gap-1">
                        <IconStar size={14} className="text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-black">4.8</span>
                        <span>(1,452 calificaciones)</span>
                      </div>
                      <span>•</span>
                      <span>25,000 estudiantes</span>
                      <span>•</span>
                      <span>2h 15m total</span>
                   </div>

                   <div className="prose prose-sm max-w-none text-gray-700">
                     <p>
                       Descripción de la lección: Esta sección debería contener la descripción detallada del contenido actual.
                       Como estamos en un modo de demostración, este texto es un marcador de posición para simular el layout
                       de "Cinema Mode" solicitado.
                     </p>
                     <p className="mt-4">
                       En este módulo aprenderás sobre:
                     </p>
                     <ul className="list-disc pl-5 mt-2 space-y-1">
                       <li>Conceptos fundamentales de la arquitectura.</li>
                       <li>Implementación de componentes visuales.</li>
                       <li>Gestión de estado y navegación.</li>
                     </ul>
                   </div>
                 </div>
               )}
               {activeTab === "questions" && (
                 <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                   <IconMessageCircle size={48} className="mb-4 opacity-20" />
                   <h3 className="text-lg font-medium text-gray-900">Sin preguntas todavía</h3>
                   <p>Sé el primero en preguntar algo sobre esta lección.</p>
                 </div>
               )}
               {activeTab === "notes" && (
                 <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                   <IconNote size={48} className="mb-4 opacity-20" />
                   <h3 className="text-lg font-medium text-gray-900">Tus notas</h3>
                   <button className="mt-4 btn btn-primary btn-sm text-white" style={{ backgroundColor: TOKENS.colors.accent }}>
                     + Crear nueva nota
                   </button>
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* ZONE B: Curriculum Sidebar (Right) */}
        <aside className={cn(
          "w-[360px] bg-white border-l border-gray-200 flex flex-col transition-all duration-300",
          !sidebarOpen && "w-0 border-0"
        )}>
          {/* Sidebar Header */}
          <div className="p-4 flex items-center justify-between border-b border-gray-200 bg-white sticky top-0 z-10">
            <h3 className="font-bold text-gray-900">Contenido del curso</h3>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-700 lg:hidden">
              <IconX size={20} />
            </button>
          </div>

          {/* Accordion List */}
          <div className="flex-1 overflow-y-auto">
            {lessons.map((lesson, index) => {
              const content = parseLessonContent(lesson.content);
              const subsections = content?.subsections || [];
              // Check if any subsection in this lesson is active to auto-expand (optional logic, simpler to just list them)
              const isActiveLesson = subsections.some(s => s.id === currentLessonId);

              return (
                <div key={lesson.id} className="border-b border-gray-100">
                  {/* Section Header */}
                  <div className="bg-gray-50 px-4 py-3 cursor-pointer flex justify-between items-start group">
                    <div>
                      <h4 className="font-bold text-sm text-gray-800 group-hover:text-black">
                        Sección {index + 1}: {lesson.title}
                      </h4>
                      <div className="text-xs text-gray-500 mt-1">
                        0 / {subsections.length} | {lesson.durationMinutes || 15} min
                      </div>
                    </div>
                    {/* Assuming always expanded for Cinema View simpler nav, or toggle logic could be added */}
                  </div>

                  {/* Subsections List */}
                  <div>
                    {subsections.map((sub, subIdx) => {
                      const isActive = sub.id === currentLessonId;
                      return (
                        <div 
                          key={sub.id || `${lesson.id}-sub-${subIdx}`}
                          onClick={() => goToUnit(sub.id)}
                          className={cn(
                            "px-4 py-3 flex gap-3 cursor-pointer transition-colors hover:bg-gray-50",
                            isActive && "bg-[#E6F2F5] border-l-4 border-[#A435F0]" // Active state style override
                          )}
                          style={isActive ? { backgroundColor: TOKENS.colors.accentSoft, borderLeftColor: TOKENS.colors.accent } : {}}
                        >
                          <div className="pt-1">
                            <div className={cn(
                              "w-4 h-4 border rounded-sm flex items-center justify-center",
                              isActive ? "border-[#A435F0]" : "border-gray-400"
                            )}>
                              {/* Checkbox logic would go here */}
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className={cn(
                              "text-sm",
                              isActive ? "text-black font-medium" : "text-gray-600"
                            )}>
                              {sub.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                              <IconVideo size={12} />
                              <span>5 min</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Toggle Sidebar Button (Absolute) */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute right-0 top-4 bg-white border border-gray-200 p-2 rounded-l shadow-md z-20"
          >
            <IconChevronLeft size={20} />
            <span className="sr-only">Mostrar temario</span>
          </button>
        )}

      </main>
    </div>
  );
}

