"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCourseSchema, CreateCourseInput } from "@/lib/validators/courseSchema";
import { useUploadFile } from "@/hooks/useUploadFile";
import {
  X,
  Upload,
  Plus,
  ChevronDown,
  ChevronRight,
  Eye,
  GripVertical,
  Check,
  MoreHorizontal,
  Edit3,
  RefreshCw,
} from "lucide-react";

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

interface Lesson {
  id: string;
  title: string;
  order: number;
  sectionId?: string;
}

// ============================================================================
// CONSTANTES - Design Tokens del JSON
// ============================================================================

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

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

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

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function NewCoursePage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [savingAuto, setSavingAuto] = useState(false);
  
  // Estados para el formulario
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [university, setUniversity] = useState<string>("Cualquier universidad");
  const [specialization, setSpecialization] = useState<string>("Negocios");
  const [courseLevel, setCourseLevel] = useState<string>("Principiante");
  const [isPublished, setIsPublished] = useState<string>("Borrador");
  const [isHidden, setIsHidden] = useState<boolean>(false);
  const [price, setPrice] = useState<string>("0.00");
  const [saleAmount, setSaleAmount] = useState<string>("0.00");
  const [salePercentage, setSalePercentage] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
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

  useEffect(() => {
    // Calcular precio final cuando cambia el descuento
    const priceNum = parseFloat(price) || 0;
    const discount = (priceNum * salePercentage) / 100;
    setSaleAmount(discount.toFixed(2));
  }, [price, salePercentage]);

  useEffect(() => {
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
    if (!selectedTags.includes(tag) && selectedTags.length < 10) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
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

  // Crear nuevo curso
  const onSubmit = async (data: CreateCourseInput) => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        setError("Debes estar autenticado para crear un curso");
        return;
      }

      // Subir imagen si existe
      let coverImageUrl: string | undefined = undefined;
      if (coverImageFile) {
        const uploadedUrl = await uploadFile(coverImageFile, 'covers');
        if (uploadedUrl) {
          coverImageUrl = uploadedUrl;
          setCoverImageFile(null);
        }
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
        isHidden: isHidden,
        university: university,
        specialization: specialization,
      };

      // Crear curso via API
      const res = await fetch("/api/admin/createCourse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al crear el curso");
      }

      const result = await res.json();
      const newCourseId = result.course?.id;

      if (newCourseId) {
        setCurrentCourseId(newCourseId);
        showSnackbarMessage("Curso creado exitosamente");
        
        // Redirigir a la página de edición
        setTimeout(() => {
          router.push(`/dashboard/courses/${newCourseId}/edit`);
        }, 1500);
      }

    } catch (err) {
      console.error("Error creating course:", err);
      setError(err instanceof Error ? err.message : "Error al crear el curso");
    } finally {
      setLoading(false);
    }
  };

  // Crear nueva sección (placeholder - se implementará cuando el curso exista)
  const handleCreateSection = async (title: string) => {
    if (!currentCourseId) {
      showSnackbarMessage("Primero guarda el curso para agregar secciones");
      return;
    }
    // TODO: Implementar creación de sección via API
  };

  // Calcular valores derivados
  const remainingChars = 500 - (description?.length || 0);
  const finalPrice = (parseFloat(price) || 0) - (parseFloat(saleAmount) || 0);
  const displayTitle = courseTitle || "Nuevo curso";

  return (
    <div className="min-h-screen bg-[#F3F4F8]">
      {/* Header Row */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center sticky top-0 z-40">
        <div>
          <h1 className="text-xl font-bold text-brand-primary mb-1">
            {displayTitle}
          </h1>
          <nav className="flex items-center gap-2 text-xs text-slate-400">
            <span>Cursos</span>
            <span>/</span>
            <span className="text-slate-600 font-medium">Nuevo curso</span>
          </nav>
        </div>
        <div className="flex gap-3 items-center">
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
            {loading ? "Creando..." : "Crear curso"}
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
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      {/* Rich Text Toolbar */}
                      <div className="bg-slate-50 h-10 border-b border-slate-200 flex items-center px-3 gap-1.5">
                        <select className="px-2 py-1 text-[13px] border border-slate-200 rounded-md bg-white cursor-pointer">
                          <option>Texto normal</option>
                        </select>
                      </div>
                      <textarea
                        {...register("description")}
                        placeholder="Describe tu curso..."
                        className="w-full min-h-[120px] p-3 text-sm border-none outline-none resize-y leading-relaxed"
                      />
                    </div>
                    <div className="flex justify-end mt-1">
                      <p className="text-[11px] text-slate-400">
                        {remainingChars} caracteres restantes
                      </p>
                    </div>
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
                    onClick={() => {
                      if (!currentCourseId) {
                        showSnackbarMessage("Primero guarda el curso para agregar secciones");
                        return;
                      }
                      setShowNewSectionModal(true);
                    }}
                    className="flex items-center gap-1.5 text-[#A855F7] hover:text-[#9333EA] text-sm font-medium px-3 py-1.5 rounded-full hover:bg-purple-50 transition-colors"
                  >
                    <Plus size={16} />
                    Agregar sección
                  </button>
                </div>

                {/* Empty State for New Course */}
                <div className="text-center py-12 px-5">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus size={24} className="text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500 mb-2">Aún no hay secciones</p>
                  <p className="text-xs text-slate-400">Guarda el curso primero para comenzar a agregar secciones.</p>
                </div>
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
                disabled={!currentCourseId}
                className="w-full h-9 flex items-center justify-center gap-2 border border-slate-300 rounded-full text-brand-primary text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  
                  {/* Selected Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedTags.map(tag => (
                      <span
                        key={tag}
                        className="bg-black text-white px-2.5 py-1 rounded-full text-xs flex items-center gap-2"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-red-300 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Available Tags */}
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
    </div>
  );
}
