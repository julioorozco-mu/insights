"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCourseSchema, CreateCourseInput } from "@/lib/validators/courseSchema";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { lessonRepository } from "@/lib/repositories/lessonRepository";
import { IconX, IconUpload, IconPlus, IconChevronDown, IconEye, IconGripVertical, IconCheck } from "@tabler/icons-react";
import { useUploadFile } from "@/hooks/useUploadFile";

interface Lesson {
  id: string;
  title: string;
  order: number;
}

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
  "Marketing"
];

const UNIVERSITIES = [
  "Cualquier universidad",
  "UNACH",
  "UNAM",
  "ITESM",
  "UAM",
  "IPN"
];

const SPECIALIZATIONS = [
  "Negocios",
  "Ingeniería",
  "Ciencias de la Computación",
  "Administración",
  "Economía",
  "Marketing"
];

const COURSE_LEVELS = [
  "Principiante",
  "Intermedio",
  "Avanzado"
];

const PUBLISH_STATUSES = [
  "Publicado",
  "Borrador",
  "Archivado"
];

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
    <div style={{
      position: "fixed",
      bottom: "24px",
      right: "24px",
      backgroundColor: "#111827",
      color: "#F9FAFB",
      padding: "12px 20px",
      borderRadius: "10px",
      boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      zIndex: 1000,
      animation: "slideIn 0.3s ease-out"
    }}>
      <IconCheck size={20} />
      <span style={{ fontSize: "14px", fontWeight: 500 }}>{message}</span>
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
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
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "16px",
        padding: "24px",
        width: "90%",
        maxWidth: "500px",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)"
      }}>
        <h3 style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "#111827",
          marginBottom: "16px"
        }}>
          Crear nueva sección
        </h3>
        
        <div style={{ marginBottom: "20px" }}>
          <label style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 500,
            color: "#4B5563",
            marginBottom: "8px"
          }}>
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
            style={{
              width: "100%",
              height: "40px",
              padding: "0 12px",
              fontSize: "14px",
              border: "1px solid rgba(15, 23, 42, 0.10)",
              borderRadius: "10px",
              outline: "none",
              fontFamily: "inherit"
            }}
            autoFocus
          />
        </div>

        <div style={{
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end"
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: "#F3F4F6",
              border: "none",
              color: "#111827",
              padding: "10px 22px",
              borderRadius: "999px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              height: "40px"
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!sectionTitle.trim()}
            style={{
              backgroundColor: "#1A2170",
              border: "none",
              color: "#FFFFFF",
              padding: "10px 22px",
              borderRadius: "999px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: sectionTitle.trim() ? "pointer" : "not-allowed",
              height: "40px",
              opacity: sectionTitle.trim() ? 1 : 0.5
            }}
          >
            Crear sección
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewCoursePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const courseId = params?.id as string | undefined;
  const isEditing = !!courseId;
  
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
  const [isPublished, setIsPublished] = useState<string>("Publicado");
  const [isHidden, setIsHidden] = useState<boolean>(false);
  const [price, setPrice] = useState<string>("0.00");
  const [saleAmount, setSaleAmount] = useState<string>("0.00");
  const [salePercentage, setSalePercentage] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(courseId || null);
  
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

  // Cargar curso existente si estamos editando
  useEffect(() => {
    if (isEditing && courseId) {
      const loadCourse = async () => {
        try {
          const course = await courseRepository.findById(courseId);
          if (course) {
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
            
          }
        } catch (err) {
          console.error("Error loading course:", err);
        }
      };
      loadCourse();
    }
  }, [isEditing, courseId, setValue]);

  // Cargar lecciones del curso
  useEffect(() => {
    if (currentCourseId) {
      const loadLessons = async () => {
        try {
          const courseLessons = await lessonRepository.findByCourseId(currentCourseId);
          setLessons(courseLessons.map(l => ({
            id: l.id,
            title: l.title,
            order: l.order
          })));
        } catch (err) {
          console.error("Error loading lessons:", err);
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
    if (!selectedTags.includes(tag) && selectedTags.length < 10) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const toggleLesson = (id: string) => {
    // Toggle para expandir/colapsar lección
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
        // Actualizar curso existente
        await courseRepository.update(currentCourseId, courseData);
        savedCourseId = currentCourseId;
      } else {
        // Crear nuevo curso
        const course = await courseRepository.create(courseData);
        savedCourseId = course.id;
        setCurrentCourseId(savedCourseId);
        // Actualizar URL sin recargar
        window.history.replaceState({}, '', `/dashboard/courses/${savedCourseId}`);
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
      
      // Crear la lección
      const lesson = await lessonRepository.create({
        courseId: savedCourseId,
        title: sectionTitle.trim(),
        order: lessons.length,
        type: "video",
        createdBy: user.id,
      });

      // Recargar lecciones
      const courseLessons = await lessonRepository.findByCourseId(savedCourseId);
      setLessons(courseLessons.map(l => ({
        id: l.id,
        title: l.title,
        order: l.order
      })));

      // Redirigir a la página de edición de la lección
      router.push(`/dashboard/lessons/${lesson.id}/edit`);
    } catch (err: any) {
      console.error("Error creating lesson:", err);
      console.error("Full error object:", JSON.stringify(err, null, 2));
      
      let errorMessage = "Error al crear la sección";
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.details) {
        errorMessage = err.details;
      } else if (err?.hint) {
        errorMessage = err.hint;
      } else if (err?.originalError?.message) {
        errorMessage = err.originalError.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
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
      
      // Subir imagen si existe
      let coverImageUrl: string | undefined = undefined;
      if (coverImageFile) {
        console.log("[NewCourse] Subiendo imagen...");
        const uploadedUrl = await uploadFile(coverImageFile, 'covers');
        if (!uploadedUrl) {
          throw new Error("Error al subir la imagen de portada");
        }
        coverImageUrl = uploadedUrl;
        console.log("[NewCourse] Imagen subida:", coverImageUrl);
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
      
      console.log("[NewCourse] Datos del curso a guardar:", courseData);
      
      let course;
      if (currentCourseId) {
        console.log("[NewCourse] Actualizando curso existente:", currentCourseId);
        await courseRepository.update(currentCourseId, courseData);
        course = await courseRepository.findById(currentCourseId);
      } else {
        console.log("[NewCourse] Creando nuevo curso...");
        course = await courseRepository.create(courseData);
        console.log("[NewCourse] Curso creado:", course.id);
      }
      
      if (course) {
        console.log("[NewCourse] Redirigiendo a:", `/dashboard/courses/${course.id}`);
      router.push(`/dashboard/courses/${course.id}`);
      } else {
        throw new Error("No se pudo crear o actualizar el curso");
      }
    } catch (err: any) {
      console.error("[NewCourse] Error al crear curso:", err);
      
      let errorMessage = "Error al crear el curso";
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

  return (
    <div style={{ 
      backgroundColor: "#F3F4F8", 
      minHeight: "100vh",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', sans-serif"
    }}>
      {/* Header Row */}
      <div style={{
        backgroundColor: "#FFFFFF",
        padding: "12px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid rgba(15, 23, 42, 0.10)"
      }}>
        <div>
          <h1 style={{ 
            fontSize: "28px", 
            fontWeight: 700, 
            color: "#111827",
            margin: "8px 0 16px 0",
            lineHeight: 1.25
          }}>
            {displayTitle}
          </h1>
          <div style={{
            fontSize: "12px",
            color: "#9CA3AF",
            display: "flex",
            gap: "4px",
            alignItems: "center"
          }}>
            <span>Mi aula</span>
            <span>/</span>
            <span>Mis cursos</span>
            <span>/</span>
            <span style={{ color: "#4B5563" }}>{displayTitle}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              backgroundColor: "#F3F4F6",
              border: "none",
              color: "#111827",
              padding: "10px 22px",
              borderRadius: "999px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              height: "40px"
            }}
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
            style={{
              backgroundColor: "#1A2170",
              border: "none",
              color: "#FFFFFF",
              padding: "10px 22px",
              borderRadius: "999px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              height: "40px",
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{
        padding: "24px 32px",
        maxWidth: "1440px",
        margin: "0 auto"
      }}>
      {error && (
        <div style={{
          backgroundColor: "#FEE2E2",
          border: "1px solid #EF4444",
          borderRadius: "10px",
          padding: "12px 16px",
          marginBottom: "24px",
            color: "#991B1B",
            fontSize: "14px"
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: "grid",
          gridTemplateColumns: "8fr 4fr",
          gap: "24px"
        }}>
          {/* Editor Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <form id="course-form" onSubmit={handleSubmit(onSubmit, (errors) => {
              console.error("Form validation errors:", errors);
              const firstError = Object.values(errors)[0];
              if (firstError?.message) {
                setError(firstError.message);
              } else {
                setError("Por favor, completa todos los campos requeridos correctamente");
              }
            })}>
              {/* Basic Info Card */}
            <div style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
                padding: "20px 18px",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)"
            }}>
              <h2 style={{
                  fontSize: "18px",
                fontWeight: 600,
                color: "#111827",
                  marginBottom: "16px",
                  lineHeight: 1.35
              }}>
                  Información básica
              </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  {/* Name Field */}
                  <div>
                <label style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#4B5563",
                      marginBottom: "4px",
                      lineHeight: 1.4
                }}>
                      NOMBRE
              </label>
              <input
                type="text"
                {...register("title")}
                      placeholder="Nombre del curso"
                  style={{
                    width: "100%",
                        height: "40px",
                        padding: "0 12px",
                    fontSize: "14px",
                        border: "1px solid rgba(15, 23, 42, 0.10)",
                    borderRadius: "10px",
                    outline: "none",
                        fontFamily: "inherit"
                  }}
              />
              {errors.title && (
                  <p style={{ color: "#EF4444", fontSize: "12px", marginTop: "6px" }}>
                    {errors.title.message}
                  </p>
              )}
            </div>

                  {/* Description Field */}
                  <div>
                <label style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#4B5563",
                      marginBottom: "4px",
                      lineHeight: 1.4
                }}>
                      DESCRIPCIÓN
              </label>
                <div style={{
                      border: "1px solid rgba(15, 23, 42, 0.10)",
                  borderRadius: "10px",
                  overflow: "hidden"
                }}>
                      {/* Toolbar */}
                  <div style={{
                        backgroundColor: "#F9FAFB",
                        height: "40px",
                        borderBottom: "1px solid rgba(15, 23, 42, 0.10)",
                    display: "flex",
                        alignItems: "center",
                        padding: "0 12px",
                    gap: "6px"
                  }}>
                    <select style={{
                      padding: "4px 8px",
                      fontSize: "13px",
                          border: "1px solid rgba(15, 23, 42, 0.10)",
                      borderRadius: "6px",
                          backgroundColor: "#FFFFFF",
                          cursor: "pointer"
                    }}>
                          <option>Texto normal</option>
                    </select>
                  </div>
              <textarea
                {...register("description")}
                        placeholder="Describe tu curso..."
                    style={{
                      width: "100%",
                          minHeight: "120px",
                          padding: "12px",
                      fontSize: "14px",
                      border: "none",
                      outline: "none",
                          fontFamily: "inherit",
                          lineHeight: 1.55,
                      resize: "vertical"
                    }}
                  />
                </div>
                    <div style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: "4px"
                    }}>
                <p style={{ 
                        fontSize: "11px", 
                  color: "#9CA3AF", 
                        margin: 0
                }}>
                        {remainingChars} caracteres restantes
                </p>
                    </div>
              {errors.description && (
                  <p style={{ color: "#EF4444", fontSize: "12px", marginTop: "6px" }}>
                    {errors.description.message}
                  </p>
              )}
            </div>

                  {/* Cover Image Field */}
              <div>
                <label style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#4B5563",
                      marginBottom: "4px",
                      lineHeight: 1.4
                }}>
                      IMAGEN DE PORTADA
              </label>
              
              {coverImagePreview ? (
                  <div style={{ 
                    position: "relative",
                    borderRadius: "14px",
                        overflow: "hidden",
                        border: "1px solid rgba(15, 23, 42, 0.10)",
                        marginTop: "10px"
                  }}>
                  <img 
                    src={coverImagePreview} 
                    alt="Vista previa" 
                      style={{
                        width: "100%",
                            aspectRatio: "16/9",
                            objectFit: "cover",
                            display: "block"
                      }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImageFile(null);
                      setCoverImagePreview(null);
                    }}
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                            backgroundColor: "rgba(255,255,255,0.85)",
                            color: "#1A2170",
                        border: "none",
                            borderRadius: "999px",
                            padding: "4px 8px",
                            fontSize: "12px",
                            fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                            gap: "4px"
                      }}
                    >
                          Cambiar
                  </button>
                </div>
              ) : (
                  <label style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                        aspectRatio: "16/9",
                        border: "1px dashed rgba(15, 23, 42, 0.18)",
                    borderRadius: "14px",
                    cursor: "pointer",
                        backgroundColor: "#F8FAFF",
                        marginTop: "10px"
                  }}>
                    <IconUpload size={48} color="#9CA3AF" style={{ marginBottom: "12px" }} />
                    <p style={{ fontSize: "14px", color: "#4B5563", marginBottom: "6px" }}>
                      <span style={{ fontWeight: 600 }}>Click para subir</span> o arrastra y suelta
                    </p>
                    <p style={{ fontSize: "12px", color: "#9CA3AF" }}>
                      PNG, JPG o WEBP (máx. 5MB)
                    </p>
                  <input 
                    type="file" 
                      style={{ display: "none" }}
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
                  </div>
              </div>
            </div>

              {/* Content Card */}
            <div style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
                padding: "20px 18px",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                  marginBottom: "16px"
              }}>
                <h2 style={{
                    fontSize: "18px",
                  fontWeight: 600,
                  color: "#111827",
                    margin: 0,
                    lineHeight: 1.35
                }}>
                    Contenido
                </h2>
                <button
                  type="button"
                    onClick={() => setShowNewSectionModal(true)}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                      color: "#1A2170",
                      fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                      padding: "6px 12px",
                    borderRadius: "999px"
                  }}
                >
                  <IconPlus size={16} />
                    Agregar nueva sección
                </button>
              </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {lessons.length === 0 ? (
                    <p style={{
                      fontSize: "14px",
                      color: "#9CA3AF",
                      textAlign: "center",
                      padding: "40px 20px"
                    }}>
                      No hay secciones aún. Haz clic en "Agregar nueva sección" para comenzar.
                    </p>
                  ) : (
                    lessons.map((lesson) => (
                      <div 
                        key={lesson.id}
                    style={{
                          backgroundColor: "#F8FAFF",
                          border: "1px solid rgba(15, 23, 42, 0.10)",
                          borderRadius: "14px",
                          padding: "14px",
                          cursor: "pointer"
                        }}
                        onClick={() => router.push(`/dashboard/lessons/${lesson.id}/edit`)}
                      >
                        <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <IconGripVertical size={18} color="#9CA3AF" style={{ opacity: 0.6 }} />
                        <span style={{
                          fontSize: "14px",
                              fontWeight: 400,
                              color: "#111827",
                              lineHeight: 1.55
                        }}>
                              {lesson.title}
                        </span>
                    </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                          type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/lessons/${lesson.id}/edit`);
                              }}
                          style={{
                            backgroundColor: "transparent",
                            border: "none",
                            color: "#4B5563",
                                fontSize: "14px",
                            cursor: "pointer",
                                padding: "6px 12px",
                                borderRadius: "999px",
                                height: "32px"
                          }}
                        >
                              Editar
                        </button>
                        <button
                          type="button"
                          style={{
                            backgroundColor: "transparent",
                            border: "none",
                            color: "#9CA3AF",
                            cursor: "pointer",
                                padding: "4px 8px"
                          }}
                        >
                          •••
                        </button>
                      </div>
                    </div>
                      </div>
                    ))
                    )}
                    </div>
            </div>
          </form>
        </div>

          {/* Side Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Preview Card */}
            <div style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              padding: "16px 18px",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)"
            }}>
              <h3 style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "#111827",
                marginBottom: "8px",
                lineHeight: 1.35
              }}>
                Previsualizar curso
              </h3>
              <p style={{
                fontSize: "12px",
                color: "#9CA3AF",
                marginBottom: "12px",
                lineHeight: 1.45
              }}>
                Ver cómo otros verán tu curso
              </p>
          <button
            type="button"
            style={{
                  width: "100%",
                  height: "36px",
                  backgroundColor: "transparent",
                  border: "1px solid rgba(15, 23, 42, 0.18)",
                  borderRadius: "999px",
                  color: "#111827",
                  fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
                  gap: "8px"
            }}
          >
            <IconEye size={18} />
                Previsualizar
          </button>
            </div>

            {/* Status Card */}
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
              padding: "16px 18px",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)"
          }}>
            <h3 style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "#111827",
              marginBottom: "16px",
                lineHeight: 1.35
            }}>
                Estado del curso
            </h3>
            
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
              <label style={{
                    fontSize: "12px",
                color: "#9CA3AF",
                marginBottom: "6px",
                display: "block"
              }}>
                    Estado del producto
                      </label>
                      <select
                value={isPublished}
                onChange={(e) => setIsPublished(e.target.value)}
                style={{
                  width: "100%",
                      height: "40px",
                      padding: "0 12px",
                      fontSize: "14px",
                      border: "1px solid rgba(15, 23, 42, 0.10)",
                  borderRadius: "10px",
                  backgroundColor: "#FFFFFF",
                      cursor: "pointer",
                      fontFamily: "inherit"
                    }}
                  >
                    {PUBLISH_STATUSES.map(status => (
                      <option key={status}>{status}</option>
                    ))}
                      </select>
                    </div>

            <label style={{
              display: "flex",
              alignItems: "center",
                  gap: "12px",
              cursor: "pointer",
                  fontSize: "14px",
              color: "#4B5563"
            }}>
              <input
                type="checkbox"
                checked={isHidden}
                onChange={(e) => setIsHidden(e.target.checked)}
                    style={{ 
                      cursor: "pointer",
                      width: "20px",
                      height: "20px",
                      accentColor: "#1A2170"
                    }}
                  />
                  Ocultar este curso
                  </label>
              </div>
                </div>

            {/* Level Card */}
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
              padding: "16px 18px",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)"
          }}>
            <h3 style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "#111827",
              marginBottom: "16px",
                lineHeight: 1.35
            }}>
                Nivel del curso
            </h3>
            
            <div>
              <label style={{
                  fontSize: "12px",
                color: "#9CA3AF",
                marginBottom: "6px",
                display: "block"
              }}>
                  Nivel
                      </label>
              <select
                value={courseLevel}
                onChange={(e) => setCourseLevel(e.target.value)}
                style={{
                  width: "100%",
                    height: "40px",
                    padding: "0 12px",
                    fontSize: "14px",
                    border: "1px solid rgba(15, 23, 42, 0.10)",
                  borderRadius: "10px",
                  backgroundColor: "#FFFFFF",
                    cursor: "pointer",
                    fontFamily: "inherit"
                  }}
                >
                  {COURSE_LEVELS.map(level => (
                    <option key={level}>{level}</option>
                  ))}
              </select>
                    </div>
          </div>

            {/* Organisations Card */}
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
              padding: "16px 18px",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)"
          }}>
            <h3 style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "#111827",
              marginBottom: "16px",
                lineHeight: 1.35
            }}>
                Organizaciones
            </h3>
            
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
              <label style={{
                    fontSize: "12px",
                color: "#9CA3AF",
                marginBottom: "6px",
                display: "block"
              }}>
                    Universidad
                      </label>
                      <select
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                style={{
                  width: "100%",
                      height: "40px",
                      padding: "0 12px",
                      fontSize: "14px",
                      border: "1px solid rgba(15, 23, 42, 0.10)",
                  borderRadius: "10px",
                  backgroundColor: "#FFFFFF",
                      cursor: "pointer",
                      fontFamily: "inherit"
                }}
              >
                {UNIVERSITIES.map(uni => (
                  <option key={uni}>{uni}</option>
                        ))}
                      </select>
                    </div>

            <div>
              <label style={{
                    fontSize: "12px",
                color: "#9CA3AF",
                marginBottom: "6px",
                display: "block"
              }}>
                    Especialización
                      </label>
                      <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                style={{
                  width: "100%",
                      height: "40px",
                      padding: "0 12px",
                      fontSize: "14px",
                      border: "1px solid rgba(15, 23, 42, 0.10)",
                  borderRadius: "10px",
                  backgroundColor: "#FFFFFF",
                      cursor: "pointer",
                      fontFamily: "inherit"
                }}
              >
                {SPECIALIZATIONS.map(spec => (
                  <option key={spec}>{spec}</option>
                ))}
                      </select>
                  </div>

                {/* Tags */}
                <div>
                  <label style={{
              fontSize: "12px",
                    color: "#9CA3AF",
                    marginBottom: "8px",
                    display: "block"
                  }}>
                    Etiquetas del curso (hasta 10)
                  </label>
            
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "12px"
            }}>
              {selectedTags.map(tag => (
                <span
                  key={tag}
                  style={{
                          backgroundColor: "#000000",
                          color: "#F9FAFB",
                          padding: "4px 10px",
                    borderRadius: "999px",
                          fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                          gap: "8px"
                  }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    style={{
                      background: "none",
                      border: "none",
                            color: "#F9FAFB",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                            alignItems: "center",
                            fontSize: "14px"
                    }}
                  >
                    <IconX size={14} />
                  </button>
                    </span>
              ))}
              </div>

            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px"
            }}>
              {AVAILABLE_TAGS.filter(tag => !selectedTags.includes(tag)).map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  disabled={selectedTags.length >= 10}
                  style={{
                    backgroundColor: "#F3F4F6",
                    border: "none",
                    color: "#4B5563",
                    padding: "6px 12px",
                    borderRadius: "999px",
                          fontSize: "12px",
                    cursor: selectedTags.length >= 10 ? "not-allowed" : "pointer",
                    opacity: selectedTags.length >= 10 ? 0.5 : 1
                  }}
                >
                  + {tag}
                </button>
              ))}
                  </div>
                </div>
            </div>
            </div>

            {/* Pricing Card */}
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
              padding: "16px 18px",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)"
          }}>
            <h3 style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "#111827",
              marginBottom: "16px",
                lineHeight: 1.35
            }}>
                Precios
            </h3>
            
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
              <label style={{
                    fontSize: "12px",
                color: "#9CA3AF",
                marginBottom: "6px",
                display: "block"
              }}>
                    Precio
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                      fontSize: "14px",
                  color: "#4B5563"
                }}>
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  style={{
                    width: "100%",
                        height: "40px",
                        padding: "0 12px 0 24px",
                        fontSize: "14px",
                        border: "1px solid rgba(15, 23, 42, 0.10)",
                    borderRadius: "10px",
                        outline: "none",
                        textAlign: "right",
                        fontFamily: "inherit"
                  }}
                />
                <span style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "11px",
                  color: "#9CA3AF"
                }}>
                  USD
                </span>
                </div>
            </div>

                <div>
              <label style={{
                    fontSize: "12px",
                color: "#9CA3AF",
                marginBottom: "6px",
                display: "block"
              }}>
                    Monto de descuento
                      </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                      fontSize: "14px",
                  color: "#4B5563"
                }}>
                  $
                </span>
                      <input
                  type="number"
                  step="0.01"
                  value={saleAmount}
                  readOnly
                  style={{
                    width: "100%",
                        height: "40px",
                        padding: "0 12px 0 24px",
                        fontSize: "14px",
                        border: "1px solid rgba(15, 23, 42, 0.10)",
                    borderRadius: "10px",
                        backgroundColor: "#F8FAFF",
                        outline: "none",
                        textAlign: "right",
                        fontFamily: "inherit"
                  }}
                />
                <span style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "11px",
                  color: "#9CA3AF"
                }}>
                  USD
                </span>
                    </div>
            </div>

                <div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px"
              }}>
                <label style={{
                      fontSize: "12px",
                  color: "#9CA3AF"
                }}>
                      Descuento
                      </label>
                <span style={{
                      fontSize: "14px",
                  fontWeight: 600,
                      color: "#1A2170"
                }}>
                  {salePercentage}%
                </span>
              </div>
                      <input
                type="range"
                min="0"
                max="100"
                value={salePercentage}
                onChange={(e) => setSalePercentage(parseInt(e.target.value))}
                style={{
                  width: "100%",
                      height: "4px",
                      accentColor: "#1A2170",
                      cursor: "pointer"
                }}
              />
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                    fontSize: "11px",
                color: "#9CA3AF",
                marginTop: "4px"
              }}>
                <span>0%</span>
                <span>100%</span>
                    </div>
                  </div>

            <div style={{
              paddingTop: "16px",
                  borderTop: "1px solid rgba(15, 23, 42, 0.10)"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span style={{
                      fontSize: "12px",
                  color: "#9CA3AF"
                }}>
                      Precio final después del descuento
                    </span>
                <span style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#22C55E"
                }}>
                  ${finalPrice.toFixed(2)}
                </span>
                </div>
            </div>

                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginTop: "8px"
                }}>
              <button
                type="button"
                    onClick={() => {
                      setSalePercentage(0);
                      setSaleAmount("0.00");
                    }}
              style={{
                      flex: 1,
                      height: "36px",
                      backgroundColor: "#F3F4F6",
                border: "none",
                borderRadius: "999px",
                      color: "#111827",
                      fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer"
              }}
            >
                    Reiniciar descuento
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      height: "36px",
                      backgroundColor: "#1A2170",
                      border: "none",
                      borderRadius: "999px",
                      color: "#FFFFFF",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer"
                    }}
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
