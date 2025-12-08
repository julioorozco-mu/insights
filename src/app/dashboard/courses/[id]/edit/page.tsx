"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCourseSchema, CreateCourseInput } from "@/lib/validators/courseSchema";
import { useUploadFile } from "@/hooks/useUploadFile";
import {
  X,
  Upload,
  Plus,
  Eye,
  Check,
  RefreshCw,
  Trash2,
} from "lucide-react";
import SortableSectionList, { CourseSection } from "@/components/course/SortableSectionList";
import RichTextEditor from "@/components/ui/RichTextEditor";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface Section {
  id: string;
  title: string;
  order: number;
  isExpanded: boolean;
  lessons: Lesson[];
}

interface Subsection {
  id: string;
  title: string;
}

interface Lesson {
  id: string;
  title: string;
  order: number;
  sectionId?: string;
  subsections?: Subsection[];
}

// ============================================================================
// CONSTANTES - Design Tokens del JSON
// ============================================================================

const COLORS = {
  background: {
    app: "#F3F4F8",
    sidebar: "#111118",
    topbar: "#FFFFFF",
    canvas: "#FFFFFF",
    section: "#FFFFFF",
    sectionAlt: "#F8FAFF",
  },
  text: {
    primary: "#111827",
    secondary: "#4B5563",
    muted: "#9CA3AF",
    placeholder: "#9CA3AF",
    onDark: "#F9FAFB",
    onAccent: "#FFFFFF",
  },
  accent: {
    primary: "#A855F7",
    primarySoft: "#F4E9FF",
    secondary: "#6366F1",
    borderSubtle: "rgba(15, 23, 42, 0.10)",
    borderStrong: "rgba(15, 23, 42, 0.18)",
    focus: "#A855F7",
  },
  brand: {
    primary: "#192170",
    secondary: "#3C1970",
  },
  status: {
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#0EA5E9",
  },
  tags: {
    filledDarkBg: "#000000",
    filledDarkText: "#F9FAFB",
  },
};

const AVAILABLE_TAGS = [
  "Negocios",
  "Economía",
  "Éxito",
  "Objetivos",
  "Gestión",
  "Empresa",
  "Liderazgo",
  "Estrategia",
  "Finanzas",
  "Marketing",
];

const UNIVERSITIES = [
  "Cualquier universidad",
  "UNACH",
  "UNAM",
  "ITESM",
  "UAM",
  "IPN",
];

const SPECIALIZATIONS = [
  "Negocios",
  "Ingeniería",
  "Ciencias de la Computación",
  "Administración",
  "Economía",
  "Marketing",
];

const COURSE_LEVELS = ["Principiante", "Intermedio", "Avanzado"];

const PUBLISH_STATUSES = ["Publicado", "Borrador", "Archivado"];

// Componente Snackbar
function Snackbar({ message, isVisible, onClose }: { message: string; isVisible: boolean; onClose: () => void }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-brand-primary text-white px-5 py-3 rounded-lg shadow-card flex items-center gap-3 z-50 animate-in slide-in-from-right duration-300">
      <Check size={20} />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

// Modal para crear nueva sección
function NewSectionModal({ 
  isOpen, 
  onClose, 
  onCreate 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onCreate: (title: string) => void;
}) {
  const [sectionTitle, setSectionTitle] = useState("");

  if (!isOpen) return null;

  const handleCreate = () => {
    if (sectionTitle.trim()) {
      onCreate(sectionTitle.trim());
      setSectionTitle("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[90%] max-w-[500px] shadow-elevated">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Crear nueva sección
        </h3>
        
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-500 mb-2">
            Nombre de la sección
          </label>
          <input
            type="text"
            value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
            placeholder="Ej: Semana 1 - Introducción"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreate();
              }
            }}
            className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            autoFocus
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-6 bg-slate-100 hover:bg-slate-200 text-brand-primary rounded-full text-sm font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!sectionTitle.trim()}
            className="h-10 px-6 bg-[#A855F7] hover:bg-[#9333EA] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full text-sm font-semibold transition-colors"
          >
            Crear sección
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const courseId = params?.id as string;
  const isEditing = true;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [savingAuto, setSavingAuto] = useState(false);
  
  // Estados para el formulario
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>("");
  const [university, setUniversity] = useState<string>("Cualquier universidad");
  const [specialization, setSpecialization] = useState<string>("Negocios");
  const [courseLevel, setCourseLevel] = useState<string>("Principiante");
  const [isPublished, setIsPublished] = useState<string>("Publicado");
  const [isHidden, setIsHidden] = useState<boolean>(false);
  const [price, setPrice] = useState<string>("0.00");
  const [saleAmount, setSaleAmount] = useState<string>("0.00");
  const [salePercentage, setSalePercentage] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(courseId || null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const { uploadFile, uploading: uploadingImage } = useUploadFile();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm<CreateCourseInput>({
    resolver: zodResolver(createCourseSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
    }
  });

  const courseTitle = watch("title", "");
  const watchedDescription = watch("description", "");

  // Cargar curso existente
  useEffect(() => {
    const loadCourse = async () => {
      try {
        setLoading(true);
        if (!courseId) {
          router.push("/dashboard/courses");
          return;
        }
        
        // Usar API del servidor para evitar problemas de RLS y timeouts
        const res = await fetch(`/api/admin/getCourse?courseId=${courseId}`);
        
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Error loading course:", errorData);
          router.push("/dashboard/courses");
          return;
        }
        
        const data = await res.json();
        const course = data.course;
        
        if (!course) {
          router.push("/dashboard/courses");
          return;
        }
        
        // Cargar todos los datos del curso
        setValue("title", course.title);
        setValue("description", course.description || "");
        setDescription(course.description || "");
        setSelectedTags(course.tags || []);
        setUniversity(course.university || "Cualquier universidad");
        setSpecialization(course.specialization || "Negocios");
        setCourseLevel(course.difficulty === "beginner" ? "Principiante" : course.difficulty === "intermediate" ? "Intermedio" : "Avanzado");
        setIsPublished(course.isPublished ? "Publicado" : "Borrador");
        setIsHidden(course.isHidden || false);
        setPrice(course.price?.toFixed(2) || "0.00");
        setSalePercentage(course.salePercentage || 0);
        setCurrentCourseId(courseId);
        
        // Cargar imagen de portada si existe
        if (course.coverImageUrl) {
          setCoverImagePreview(course.coverImageUrl);
          setValue("coverImageUrl", course.coverImageUrl);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading course:", err);
        setLoading(false);
        router.push("/dashboard/courses");
      }
    };
    
    loadCourse();
  }, [courseId, setValue, router]);

  // Cargar lecciones del curso
  useEffect(() => {
    if (currentCourseId) {
      const loadLessons = async () => {
        try {
          // Usar API del servidor para evitar problemas de RLS y timeouts
          const res = await fetch(`/api/admin/getLessonsByCourse?courseId=${currentCourseId}`);
          
          if (!res.ok) {
            const errorData = await res.json();
            console.error("Error loading lessons:", errorData);
            setLessons([]);
            return;
          }
          
          const data = await res.json();
          setLessons(data.lessons || []);
        } catch (err) {
          console.error("Error loading lessons:", err);
          setLessons([]);
        }
      };
      loadLessons();
    }
  }, [currentCourseId]);

  useEffect(() => {
    // Calcular precio final cuando cambia el descuento
    const priceNum = parseFloat(price) || 0;
    const discount = (priceNum * salePercentage) / 100;
    setSaleAmount(discount.toFixed(2));
  }, [price, salePercentage]);

  useEffect(() => {
    // Calcular caracteres restantes
    const maxChars = 500;
    const currentChars = watchedDescription?.length || 0;
    setDescription(watchedDescription || "");
  }, [watchedDescription]);

  const showSnackbarMessage = (message: string) => {
    setSnackbarMessage(message);
    setShowSnackbar(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag) && selectedTags.length < 10) {
      setSelectedTags([...selectedTags, trimmedTag]);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  // Manejar input de etiquetas personalizadas
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (tagInput.trim()) {
        addTag(tagInput.trim());
        setTagInput("");
      }
    } else if (e.key === "Backspace" && tagInput === "" && selectedTags.length > 0) {
      // Eliminar última etiqueta si el input está vacío
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  // Toggle para expandir/colapsar sección del acordeón
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const isSectionExpanded = (sectionId: string) => expandedSections.has(sectionId);

  // Convertir lessons a formato de secciones para el componente SortableSectionList
  // Cada lección es una sección, y sus subsecciones son las "lecciones" dentro del acordeón
  const lessonsAsSections: CourseSection[] = lessons.map((lesson, index) => ({
    id: lesson.id,
    title: lesson.title,
    order: lesson.order || index,
    isExpanded: false,
    // Usar las subsecciones reales de la lección, o mostrar vacío si no hay
    lessons: (lesson.subsections || []).map((sub, subIndex) => ({
      id: sub.id,
      title: sub.title,
      order: subIndex,
      sectionId: lesson.id, // El ID de la lección padre
    })),
  }));

  // Manejar reordenamiento de secciones
  const handleSectionsReorder = async (newSections: CourseSection[]) => {
    // Actualizar estado local preservando las subsecciones
    const reorderedLessons = newSections.map((section, index) => {
      // Buscar la lección original para preservar sus subsecciones
      const originalLesson = lessons.find(l => l.id === section.id);
      return {
        id: section.id,
        title: section.title,
        order: index,
        subsections: originalLesson?.subsections || section.lessons.map(l => ({ id: l.id, title: l.title })),
      };
    });
    setLessons(reorderedLessons);

    // Guardar en servidor
    try {
      await fetch("/api/admin/lessons/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessons: reorderedLessons.map((l, i) => ({ id: l.id, order: i })),
        }),
      });
      showSnackbarMessage("Orden actualizado");
    } catch (error) {
      console.error("Error reordering lessons:", error);
    }
  };

  // Guardado automático del curso
  const autoSaveCourse = async (): Promise<string | null> => {
    try {
      setSavingAuto(true);
      setError(null);
      
      const formData = watch();
      
      // Validar campos requeridos
      if (!formData.title || formData.title.trim().length < 3) {
        setError("El título del curso es requerido y debe tener al menos 3 caracteres");
        return null;
      }
      
      if (!formData.description || formData.description.trim().length < 10) {
        setError("La descripción del curso es requerida y debe tener al menos 10 caracteres");
        return null;
      }
      
      if (!user?.id) {
        setError("Debes estar autenticado para crear un curso");
        return null;
      }
      
      // Subir imagen si existe
      let coverImageUrl: string | undefined = undefined;
      if (coverImageFile) {
        const uploadedUrl = await uploadFile(coverImageFile, 'covers');
        if (uploadedUrl) {
          coverImageUrl = uploadedUrl;
        }
      }
      
      // Mapear nivel de curso
      const levelMap: Record<string, "beginner" | "intermediate" | "advanced"> = {
        "Principiante": "beginner",
        "Intermedio": "intermediate",
        "Avanzado": "advanced"
      };
      
      const courseData: CreateCourseInput = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        coverImageUrl,
        tags: selectedTags,
        difficulty: levelMap[courseLevel] || "beginner",
        price: parseFloat(price) || 0,
        salePercentage: salePercentage,
        isPublished: isPublished === "Publicado",
        isHidden,
        university: university !== "Cualquier universidad" ? university : undefined,
        specialization,
        speakerIds: [user.id],
      };

      let savedCourseId: string;
      
      if (currentCourseId) {
        // Actualizar curso existente usando API admin
        const updateRes = await fetch('/api/admin/updateCourse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: currentCourseId,
            title: courseData.title,
            description: courseData.description,
            coverImageUrl: courseData.coverImageUrl,
            tags: courseData.tags,
            difficulty: courseData.difficulty,
            price: courseData.price,
            salePercentage: courseData.salePercentage,
            isPublished: courseData.isPublished,
            isHidden: courseData.isHidden,
            university: courseData.university,
            specialization: courseData.specialization,
            speakerIds: courseData.speakerIds,
          }),
        });

        if (!updateRes.ok) {
          const errorData = await updateRes.json();
          throw new Error(errorData.error || 'Error al actualizar el curso');
        }

        savedCourseId = currentCourseId;
      } else {
        // Este es un caso que no debería ocurrir en la página de edición
        throw new Error('No se puede crear un curso desde la página de edición');
      }
      
      showSnackbarMessage("Curso guardado automáticamente");
      return savedCourseId;
    } catch (err: any) {
      console.error("Error auto-saving course:", err);
      
      // Extraer mensaje de error más detallado
      let errorMessage = "Error al guardar el curso automáticamente";
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.details) {
        errorMessage = err.details;
      } else if (err?.hint) {
        errorMessage = err.hint;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      return null;
    } finally {
      setSavingAuto(false);
    }
  };

  const handleCreateSection = async (sectionTitle: string) => {
    // Validar que el título tenga contenido
    if (!sectionTitle || sectionTitle.trim().length === 0) {
      setError("El nombre de la sección es requerido");
      return;
    }

    // Primero guardar el curso automáticamente
    const savedCourseId = await autoSaveCourse();
    
    if (!savedCourseId) {
      // El error ya fue establecido en autoSaveCourse
      return;
    }

    if (!user?.id) {
      setError("Debes estar autenticado para crear una sección");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Crear la lección usando API admin para bypasear RLS
      const createRes = await fetch('/api/admin/createLesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: savedCourseId,
          title: sectionTitle.trim(),
          order: lessons.length,
          type: "video",
          createdBy: user.id,
        }),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json();
        throw new Error(errorData.error || 'Error al crear la sección');
      }

      const { lesson } = await createRes.json();

      // Recargar lecciones usando API
      const res = await fetch(`/api/admin/getLessonsByCourse?courseId=${savedCourseId}`);
      if (res.ok) {
        const data = await res.json();
        setLessons(data.lessons || []);
      }

      // Redirigir a la página de edición de la lección
      router.push(`/dashboard/lessons/${lesson.id}/edit`);
    } catch (err: any) {
      console.error("Error creating lesson:", err);
      
      let errorMessage = "Error al crear la sección";
      if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CreateCourseInput) => {
    try {
      setLoading(true);
      setError(null);
      console.log("[NewCourse] Iniciando guardado de curso...", data);
      
      // Validar datos mínimos
      if (!data.title || data.title.trim().length < 3) {
        setError("El título del curso es requerido y debe tener al menos 3 caracteres");
        setLoading(false);
        return;
      }
      
      if (!data.description || data.description.trim().length < 10) {
        setError("La descripción del curso es requerida y debe tener al menos 10 caracteres");
        setLoading(false);
        return;
      }
      
      if (!user?.id) {
        setError("Debes estar autenticado para crear un curso");
        setLoading(false);
        return;
      }
      
      // Subir imagen si existe un archivo nuevo
      let coverImageUrl: string | undefined = undefined;
      if (coverImageFile) {
        console.log("[EditCourse] Subiendo imagen...");
        const uploadedUrl = await uploadFile(coverImageFile, 'covers');
        if (!uploadedUrl) {
          throw new Error("Error al subir la imagen de portada");
        }
        coverImageUrl = uploadedUrl;
        console.log("[EditCourse] Imagen subida:", coverImageUrl);
        // Actualizar el preview inmediatamente con la nueva URL
        setCoverImagePreview(uploadedUrl);
        setValue("coverImageUrl", uploadedUrl);
        // Limpiar el archivo temporal ya que ya se subió
        setCoverImageFile(null);
      } else {
        // Si no hay archivo nuevo, usar la imagen existente del curso (si existe)
        // coverImagePreview ya contiene la URL existente si no se cambió
        coverImageUrl = coverImagePreview || undefined;
      }
      
      // Mapear nivel de curso
      const levelMap: Record<string, "beginner" | "intermediate" | "advanced"> = {
        "Principiante": "beginner",
        "Intermedio": "intermediate",
        "Avanzado": "advanced"
      };
      
      // Construir datos del curso
      const courseData: CreateCourseInput = {
        title: data.title.trim(),
        description: data.description.trim(),
        coverImageUrl: coverImageUrl || undefined,
        tags: selectedTags,
        difficulty: levelMap[courseLevel] || "beginner",
        price: parseFloat(price) || 0,
        salePercentage: salePercentage,
        isPublished: isPublished === "Publicado",
        isHidden,
        university: university !== "Cualquier universidad" ? university : undefined,
        specialization,
        speakerIds: [user.id],
      };
      
      console.log("[EditCourse] Datos del curso a guardar:", courseData);
      
      // Siempre actualizar en esta página de edición usando API admin
      console.log("[EditCourse] Actualizando curso:", courseId);
      const updateRes = await fetch('/api/admin/updateCourse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: courseId,
          title: courseData.title,
          description: courseData.description,
          coverImageUrl: courseData.coverImageUrl,
          tags: courseData.tags,
          difficulty: courseData.difficulty,
          price: courseData.price,
          salePercentage: courseData.salePercentage,
          isPublished: courseData.isPublished,
          isHidden: courseData.isHidden,
          university: courseData.university,
          specialization: courseData.specialization,
          speakerIds: courseData.speakerIds,
        }),
      });

      if (!updateRes.ok) {
        const errorData = await updateRes.json();
        throw new Error(errorData.error || 'Error al actualizar el curso');
      }
      
      // Mostrar mensaje de éxito
      setSnackbarMessage("¡Curso actualizado exitosamente!");
      setShowSnackbar(true);
      
      // No redirigir, solo actualizar el estado local
      console.log("[EditCourse] Curso actualizado exitosamente");
    } catch (err: any) {
      console.error("[EditCourse] Error al actualizar curso:", err);
      
      let errorMessage = "Error al actualizar el curso";
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.details) {
        errorMessage = err.details;
      } else if (err?.hint) {
        errorMessage = err.hint;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const finalPrice = (parseFloat(price) || 0) - (parseFloat(saleAmount) || 0);
  const remainingChars = 500 - (description.length || 0);
  const displayTitle = courseTitle || "Nuevo curso";

  // Función para eliminar el curso
  const handleDeleteCourse = async () => {
    if (!courseId) return;
    
    try {
      setDeleting(true);
      
      const response = await fetch(`/api/admin/deleteCourse?courseId=${courseId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al eliminar el curso");
      }
      
      // Redirigir a la lista de cursos
      router.push("/dashboard/my-courses");
    } catch (err: any) {
      console.error("Error eliminando curso:", err);
      setError(err.message || "Error al eliminar el curso");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  // Mostrar loader mientras carga
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        backgroundColor: "#F3F4F8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: "4px solid #E5E7EB",
          borderTop: "4px solid #1A2170",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F8] font-sans">
      {/* Header Row */}
      <div className="bg-white px-6 lg:px-8 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl lg:text-[28px] font-bold text-brand-primary leading-tight mt-2 mb-4">
            {displayTitle}
          </h1>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-xs text-slate-400">
            <span>My classroom</span>
            <span>/</span>
            <span>My courses</span>
            <span>/</span>
            <span className="text-slate-600 font-medium">{displayTitle}</span>
          </nav>
        </div>
        <div className="flex gap-3 items-center">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="h-10 w-10 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 rounded-full transition-colors"
            title="Eliminar curso"
          >
            <Trash2 size={18} />
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="h-10 px-6 bg-slate-100 hover:bg-slate-200 text-brand-primary rounded-full text-sm font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(onSubmit)();
            }}
            disabled={loading || uploadingImage || savingAuto}
            className="h-10 px-6 bg-[#A855F7] hover:bg-[#9333EA] disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-full text-sm font-semibold transition-colors"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {/* Content Area - Two Column Layout */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-400 rounded-lg px-4 py-3 mb-6 text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Grid: 8/4 on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Editor Column (Primary - span 8) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <form id="course-form" onSubmit={handleSubmit(onSubmit, (formErrors) => {
              console.error("Form validation errors:", formErrors);
              const firstError = Object.values(formErrors)[0];
              if (firstError?.message) {
                setError(firstError.message);
              } else {
                setError("Por favor completa todos los campos requeridos correctamente");
              }
            })}>
              {/* Basic Info Card */}
              <div className="bg-white rounded-2xl p-5 shadow-card">
                <h2 className="text-lg font-semibold text-brand-primary mb-4">
                  Información básica
                </h2>

                <div className="flex flex-col gap-5">
                  {/* Name Field */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">
                      Nombre
                    </label>
                    <input
                      type="text"
                      {...register("title")}
                      placeholder="Nombre del curso"
                      className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                    />
                    {errors.title && (
                      <p className="text-red-500 text-xs mt-1.5">{errors.title.message}</p>
                    )}
                  </div>

                  {/* Description Field */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">
                      Descripción
                    </label>
                    <RichTextEditor
                      value={description}
                      onChange={(html: string) => setValue("description", html)}
                      placeholder="Describe tu curso..."
                      maxLength={500}
                    />
                    {errors.description && (
                      <p className="text-red-500 text-xs mt-1.5">{errors.description.message}</p>
                    )}
                  </div>

                  {/* Cover Image Field */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">
                      Imagen de portada
                    </label>
                    
                    {coverImagePreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 mt-2.5">
                        <img 
                          src={coverImagePreview} 
                          alt="Preview" 
                          className="w-full aspect-video object-cover block"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCoverImageFile(null);
                            setCoverImagePreview(null);
                          }}
                          className="absolute top-3 right-3 bg-white/85 hover:bg-white text-[#A855F7] border-none rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer flex items-center gap-1 transition-colors"
                        >
                          <RefreshCw size={12} />
                          Clic para cambiar
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full aspect-video border border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 mt-2.5 transition-colors">
                        <Upload size={48} className="text-slate-400 mb-3" />
                        <p className="text-sm text-slate-600 mb-1.5">
                          <span className="font-semibold">Clic para subir</span> o arrastra y suelta
                        </p>
                        <p className="text-xs text-slate-400">
                          PNG, JPG o WEBP (máx. 5MB)
                        </p>
                        <input 
                          type="file" 
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Card - Curriculum Builder */}
              <div className="bg-white rounded-2xl p-5 shadow-card mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-brand-primary">
                    Contenido
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowNewSectionModal(true)}
                    className="flex items-center gap-1.5 text-[#A855F7] hover:text-[#9333EA] text-sm font-medium px-3 py-1.5 rounded-full hover:bg-purple-50 transition-colors"
                  >
                    <Plus size={16} />
                    Agregar sección
                  </button>
                </div>

                {/* Sortable Section List with Drag & Drop */}
                <SortableSectionList
                  sections={lessonsAsSections}
                  onReorder={handleSectionsReorder}
                  onEditSection={(sectionId) => router.push(`/dashboard/lessons/${sectionId}/edit`)}
                  onEditSubsection={(sectionId, subsectionId) => router.push(`/dashboard/lessons/${sectionId}/edit?tab=${subsectionId}`)}
                  onAddSubsection={(sectionId) => router.push(`/dashboard/lessons/${sectionId}/edit?action=add`)}
                  emptyMessage="Aún no hay secciones"
                />
              </div>
            </form>
          </div>

          {/* Side Panel (Secondary - span 4) - Sticky */}
          <div className="lg:col-span-4 flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
            {/* Preview Card */}
            <div className="bg-white rounded-2xl p-4 shadow-card">
              <h3 className="text-[15px] font-semibold text-brand-primary mb-2">
                Vista previa del curso
              </h3>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Mira cómo verán tu curso los demás.
              </p>
              <button
                type="button"
                onClick={() => {
                  // Abrir vista previa del estudiante en nueva pestaña (modo preview para maestros)
                  window.open(`/dashboard/student/courses/${courseId}?preview=true`, "_blank");
                }}
                className="w-full h-9 flex items-center justify-center gap-2 border border-slate-300 rounded-full text-brand-primary text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <Eye size={18} />
                Vista previa
              </button>
            </div>

            {/* Status Card */}
            <div className="bg-white rounded-2xl p-4 shadow-card">
              <h3 className="text-[15px] font-semibold text-brand-primary mb-4">
                Estado del curso
              </h3>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Estado de publicación
                  </label>
                  <select
                    value={isPublished}
                    onChange={(e) => setIsPublished(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white cursor-pointer focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  >
                    {PUBLISH_STATUSES.map(status => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={isHidden}
                    onChange={(e) => setIsHidden(e.target.checked)}
                    className="w-5 h-5 cursor-pointer accent-[#A855F7] rounded"
                  />
                  Ocultar este curso
                </label>
              </div>
            </div>

            {/* Level Card */}
            <div className="bg-white rounded-2xl p-4 shadow-card">
              <h3 className="text-[15px] font-semibold text-brand-primary mb-4">
                Nivel del curso
              </h3>
              
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">
                  Nivel
                </label>
                <select
                  value={courseLevel}
                  onChange={(e) => setCourseLevel(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white cursor-pointer focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                >
                  {COURSE_LEVELS.map(level => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Organisations Card */}
            <div className="bg-white rounded-2xl p-4 shadow-card">
              <h3 className="text-[15px] font-semibold text-brand-primary mb-4">
                Organización
              </h3>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Universidad
                  </label>
                  <select
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white cursor-pointer focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  >
                    {UNIVERSITIES.map(uni => (
                      <option key={uni}>{uni}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Especialización
                  </label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white cursor-pointer focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  >
                    {SPECIALIZATIONS.map(spec => (
                      <option key={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                {/* Tags Input */}
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">
                    Etiquetas del curso <span className="text-slate-300">(hasta 10)</span>
                  </label>
                  
                  {/* Selected Tags + Input */}
                  <div 
                    className="flex flex-wrap gap-2 p-2.5 min-h-[44px] border border-slate-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-purple-400 focus-within:border-transparent cursor-text"
                    onClick={() => document.getElementById("tag-input")?.focus()}
                  >
                    {selectedTags.map(tag => (
                      <span
                        key={tag}
                        className="bg-black text-white px-2.5 py-1 rounded-full text-xs flex items-center gap-2"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTag(tag);
                          }}
                          className="hover:text-red-300 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                    <input
                      id="tag-input"
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      placeholder={selectedTags.length === 0 ? "Escribe una etiqueta..." : selectedTags.length >= 10 ? "" : ""}
                      disabled={selectedTags.length >= 10}
                      className="flex-1 min-w-[100px] text-sm outline-none bg-transparent placeholder:text-slate-400 disabled:cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Presiona Enter para agregar
                  </p>

                  {/* Available Tags (Quick Selection) */}
                  <div className="mt-3">
                    <p className="text-[10px] text-slate-400 mb-1.5">Selección rápida:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {AVAILABLE_TAGS.filter(tag => !selectedTags.includes(tag)).map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addTag(tag)}
                          disabled={selectedTags.length >= 10}
                          className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 px-3 py-1.5 rounded-full text-xs transition-colors"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Card */}
            <div className="bg-white rounded-2xl p-4 shadow-card">
              <h3 className="text-[15px] font-semibold text-brand-primary mb-4">
                Precios
              </h3>
              
              <div className="flex flex-col gap-4">
                {/* Price Field */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Precio
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-600">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full h-10 pl-6 pr-12 text-sm border border-slate-200 rounded-lg outline-none text-right focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                      USD
                    </span>
                  </div>
                </div>

                {/* Sale Amount Field */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">
                    Monto de descuento
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-600">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={saleAmount}
                      readOnly
                      className="w-full h-10 pl-6 pr-12 text-sm border border-slate-200 rounded-lg bg-slate-50 outline-none text-right"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                      USD
                    </span>
                  </div>
                </div>

                {/* Discount Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-slate-400">
                      Descuento
                    </label>
                    <span className="text-sm font-semibold text-[#A855F7]">
                      {salePercentage}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={salePercentage}
                    onChange={(e) => setSalePercentage(parseInt(e.target.value))}
                    className="w-full h-1 accent-[#A855F7] cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Final Price */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">
                      Precio final con descuento
                    </span>
                    <span className="text-base font-semibold text-green-500">
                      ${finalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSalePercentage(0);
                      setSaleAmount("0.00");
                    }}
                    className="flex-1 h-9 bg-slate-100 hover:bg-slate-200 rounded-full text-brand-primary text-sm font-medium transition-colors"
                  >
                    Reiniciar
                  </button>
                  <button
                    type="button"
                    className="flex-1 h-9 bg-[#A855F7] hover:bg-[#9333EA] rounded-full text-white text-sm font-medium transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Snackbar */}
      <Snackbar 
        message={snackbarMessage}
        isVisible={showSnackbar}
        onClose={() => setShowSnackbar(false)}
      />

      {/* Modal para nueva sección */}
      <NewSectionModal
        isOpen={showNewSectionModal}
        onClose={() => setShowNewSectionModal(false)}
        onCreate={handleCreateSection}
      />

      {/* Modal de confirmación para eliminar */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-[400px] shadow-elevated">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 text-center mb-2">
              ¿Eliminar curso?
            </h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              Esta acción no se puede deshacer. Se eliminarán todas las lecciones y contenido asociado al curso.
            </p>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-brand-primary rounded-full text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteCourse}
                disabled={deleting}
                className="flex-1 h-10 bg-red-500 hover:bg-red-600 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-full text-sm font-semibold transition-colors"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
