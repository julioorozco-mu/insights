"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { Course } from "@/types/course";
import { Loader } from "@/components/common/Loader";
import { updateCourseSchema, UpdateCourseInput } from "@/lib/validators/courseSchema";
import { MEXICO_STATES } from "@/types/catalog";
import { IconUpload, IconX } from "@tabler/icons-react";
import { EnrollmentCalendar } from "@/components/EnrollmentCalendar";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from "@/lib/firebase";
import CourseResourceSelector from "@/components/resources/CourseResourceSelector";
import { useAuth } from "@/hooks/useAuth";
import { collection, getDocs, query, where } from "firebase/firestore";

interface Speaker {
  id: string;
  name: string;
  lastName?: string;
  email: string;
}

interface Survey {
  id: string;
  title: string;
  type?: string;
}

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("12:00");
  const [startPeriod, setStartPeriod] = useState<"AM" | "PM">("PM");
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
  const [selectedCoHosts, setSelectedCoHosts] = useState<string[]>([]);
  const [selectedEntrySurvey, setSelectedEntrySurvey] = useState<string>("");
  const [selectedExitSurvey, setSelectedExitSurvey] = useState<string>("");
  const [enrollmentRuleType, setEnrollmentRuleType] = useState<'before_start' | 'date_range' | 'anytime'>('anytime');
  const [enrollmentStartDate, setEnrollmentStartDate] = useState<string>("");
  const [enrollmentEndDate, setEnrollmentEndDate] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UpdateCourseInput>({
    resolver: zodResolver(updateCourseSchema),
  });

  const coverImageUrl = watch("coverImageUrl");

  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar speakers
        const usersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'speaker')
        );
        const usersSnapshot = await getDocs(usersQuery);
        const speakersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          lastName: doc.data().lastName,
          email: doc.data().email,
        })) as Speaker[];
        setSpeakers(speakersData);

        // Cargar encuestas
        const surveysSnapshot = await getDocs(collection(db, 'surveys'));
        const surveysData = surveysSnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title,
          type: doc.data().type,
        })) as Survey[];
        setSurveys(surveysData);

        // Cargar curso
        const id = params.id as string;
        const data = await courseRepository.findById(id);
        if (data) {
          setCourse(data);
          // Prellenar el formulario
          setValue("title", data.title);
          setValue("description", data.description);
          setValue("difficulty", data.difficulty);
          setValue("durationMinutes", data.durationMinutes);
          setValue("coverImageUrl", data.coverImageUrl);
          setValue("isActive", data.isActive);
          setTags(data.tags || []);
          setImagePreview(data.coverImageUrl || null);
          
          // Cargar ponentes y co-hosts
          setSelectedSpeakers(data.speakerIds || []);
          setSelectedCoHosts(data.coHostIds || []);
          
          // Cargar encuestas
          setSelectedEntrySurvey(data.entrySurveyId || "");
          setSelectedExitSurvey(data.exitSurveyId || "");
          
          // Cargar reglas de inscripción
          if (data.enrollmentRules) {
            setEnrollmentRuleType(data.enrollmentRules.type);
          }
          if (data.enrollmentStartDate) {
            setEnrollmentStartDate(data.enrollmentStartDate.split('T')[0]);
          }
          if (data.enrollmentEndDate) {
            setEnrollmentEndDate(data.enrollmentEndDate.split('T')[0]);
          }
          
          // Cargar fecha y hora si existen
          if (data.startDate) {
            const date = new Date(data.startDate);
            const dateStr = date.toISOString().split('T')[0];
            setStartDate(dateStr);
            
            let hours = date.getHours();
            const period = hours >= 12 ? "PM" : "AM";
            hours = hours % 12 || 12;
            const minutes = date.getMinutes();
            setStartTime(`${hours}:${minutes.toString().padStart(2, '0')}`);
            setStartPeriod(period);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params.id, setValue]);

  const toggleSpeaker = (speakerId: string) => {
    setSelectedSpeakers(prev => 
      prev.includes(speakerId)
        ? prev.filter(id => id !== speakerId)
        : [...prev, speakerId]
    );
  };

  const toggleCoHost = (speakerId: string) => {
    setSelectedCoHosts(prev => 
      prev.includes(speakerId)
        ? prev.filter(id => id !== speakerId)
        : [...prev, speakerId]
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    try {
      setUploadingImage(true);
      const timestamp = Date.now();
      const fileName = `courses/${timestamp}_${selectedFile.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const onSubmit = async (data: UpdateCourseInput) => {
    try {
      setSaving(true);

      // Si hay una nueva imagen, subirla primero
      let finalImageUrl = data.coverImageUrl;
      if (selectedFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      }

      // Construir fecha y hora si están definidas
      let startDateTime: string | undefined = undefined;
      if (startDate && startTime) {
        const [hours, minutes] = startTime.split(':').map(Number);
        let hour24 = hours;
        if (startPeriod === "PM" && hours !== 12) {
          hour24 = hours + 12;
        } else if (startPeriod === "AM" && hours === 12) {
          hour24 = 0;
        }
        const dateTime = new Date(startDate);
        dateTime.setHours(hour24, minutes, 0, 0);
        startDateTime = dateTime.toISOString();
      }

      // Construir reglas de inscripción
      let enrollmentRules = undefined;
      if (enrollmentRuleType === 'before_start') {
        enrollmentRules = {
          type: enrollmentRuleType,
        };
      } else if (enrollmentRuleType === 'date_range') {
        enrollmentRules = {
          type: enrollmentRuleType,
        };
      } else {
        enrollmentRules = {
          type: 'anytime' as const,
        };
      }
      
      // Actualizar el curso
      const updateData: any = {
        ...data,
        coverImageUrl: finalImageUrl,
        startDate: startDateTime,
      };
      
      // Solo agregar campos que no sean undefined
      if (tags.length > 0) updateData.tags = tags;
      if (selectedSpeakers.length > 0) updateData.speakerIds = selectedSpeakers;
      if (selectedCoHosts.length > 0) updateData.coHostIds = selectedCoHosts;
      if (selectedEntrySurvey) updateData.entrySurveyId = selectedEntrySurvey;
      if (selectedExitSurvey) updateData.exitSurveyId = selectedExitSurvey;
      if (enrollmentRules) updateData.enrollmentRules = enrollmentRules;
      if (enrollmentRuleType === 'before_start' && enrollmentStartDate) updateData.enrollmentStartDate = enrollmentStartDate;
      if (enrollmentRuleType === 'before_start' && enrollmentEndDate) updateData.enrollmentEndDate = enrollmentEndDate;
      if (enrollmentRuleType === 'date_range' && enrollmentStartDate) updateData.enrollmentStartDate = enrollmentStartDate;
      if (enrollmentRuleType === 'date_range' && enrollmentEndDate) updateData.enrollmentEndDate = enrollmentEndDate;

      await courseRepository.update(params.id as string, updateData);
      
      router.push(`/dashboard/courses/${params.id}`);
    } catch (error) {
      console.error("Error updating course:", error);
      alert("Error al actualizar el curso");
    } finally {
      setSaving(false);
    }
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
    <div>
      <button onClick={() => router.back()} className="btn btn-ghost mb-6">
        ← Volver
      </button>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Editar Curso</h1>
            
            {/* Switch de Curso Activo */}
            <div className="form-control">
              <label className="label cursor-pointer gap-3">
                <span className="label-text font-semibold">Curso activo</span>
                <input
                  type="checkbox"
                  {...register("isActive")}
                  className="toggle toggle-primary [&:checked]:bg-primary [&:checked]:border-primary [&:checked]:after:bg-white"
                />
              </label>
              <span className="text-xs text-base-content/70 text-right">
                {watch("isActive") ? "Visible para estudiantes" : "Oculto para estudiantes"}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Título */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Título *</span>
              </label>
              <input
                type="text"
                {...register("title")}
                className="input input-bordered"
                placeholder="Título del curso"
              />
              {errors.title && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.title.message}</span>
                </label>
              )}
            </div>

            {/* Descripción */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Descripción *</span>
              </label>
              <textarea
                {...register("description")}
                className="textarea textarea-bordered h-32"
                placeholder="Descripción del curso"
              />
              {errors.description && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.description.message}</span>
                </label>
              )}
            </div>

            {/* Ponentes */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Ponentes *</span>
              </label>
              <div className="border border-base-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                {speakers.length === 0 ? (
                  <p className="text-sm text-base-content/60">Cargando ponentes...</p>
                ) : (
                  <div className="space-y-2">
                    {speakers.map(speaker => (
                      <div key={speaker.id} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        selectedSpeakers.includes(speaker.id)
                          ? 'bg-error/10 border-2 border-error'
                          : 'bg-base-200 border-2 border-transparent hover:bg-base-300'
                      }`}>
                        <div className="flex-1">
                          <div className="font-medium">
                            {speaker.name} {speaker.lastName || ''}
                          </div>
                          <div className="text-xs text-base-content/60">{speaker.email}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedSpeakers.includes(speaker.id)}
                          onChange={() => toggleSpeaker(speaker.id)}
                          className="toggle toggle-error toggle-lg"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <label className="label">
                <span className="label-text-alt">
                  Selecciona los ponentes principales del curso
                </span>
              </label>
            </div>

            {/* Co-Hosts */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Co-Hosts (opcional)</span>
              </label>
              <div className="border border-base-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                {speakers.length === 0 ? (
                  <p className="text-sm text-base-content/60">Cargando ponentes...</p>
                ) : (
                  <div className="space-y-2">
                    {speakers.map(speaker => (
                      <div key={speaker.id} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        selectedCoHosts.includes(speaker.id)
                          ? 'bg-secondary/10 border-2 border-secondary'
                          : 'bg-base-200 border-2 border-transparent hover:bg-base-300'
                      }`}>
                        <div className="flex-1">
                          <div className="font-medium">
                            {speaker.name} {speaker.lastName || ''}
                          </div>
                          <div className="text-xs text-base-content/60">{speaker.email}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedCoHosts.includes(speaker.id)}
                          onChange={() => toggleCoHost(speaker.id)}
                          className="toggle toggle-secondary toggle-lg"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <label className="label">
                <span className="label-text-alt">
                  Co-hosts participan en presentación/despedida pero no aparecen como ponentes principales
                </span>
              </label>
            </div>

            {/* Encuestas Generales del Curso */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Encuestas generales del curso</h3>
                <span className="badge badge-info text-white gap-2">Opcional</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Encuesta de entrada general</span>
                  </label>
                  <select
                    value={selectedEntrySurvey}
                    onChange={(e) => setSelectedEntrySurvey(e.target.value)}
                    className="select select-bordered"
                  >
                    <option value="">Sin encuesta general</option>
                    {surveys.map(survey => (
                      <option key={survey.id} value={survey.id}>
                        {survey.title}
                      </option>
                    ))}
                  </select>
                  <label className="label">
                    <span className="label-text-alt">Se muestra al iniciar el curso, antes de cualquier lección</span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Encuesta de salida general</span>
                  </label>
                  <select
                    value={selectedExitSurvey}
                    onChange={(e) => setSelectedExitSurvey(e.target.value)}
                    className="select select-bordered"
                  >
                    <option value="">Sin encuesta general</option>
                    {surveys.map(survey => (
                      <option key={survey.id} value={survey.id}>
                        {survey.title}
                      </option>
                    ))}
                  </select>
                  <label className="label">
                    <span className="label-text-alt">Se muestra al completar todas las lecciones del curso</span>
                  </label>
                </div>
              </div>

              <div className="alert alert-info text-white">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div className="text-sm">
                  <p className="font-semibold mb-1">Encuestas multinivel</p>
                  <p>Los estudiantes verán las encuestas generales del curso Y las encuestas específicas de cada lección (si las configuraste al editar las lecciones).</p>
                </div>
              </div>
            </div>

            {/* Imagen de portada */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Imagen de Portada</span>
              </label>
              
              {imagePreview && (
                <div className="mb-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}

              <div className="tabs tabs-boxed mb-2">
                <a className="tab tab-active text-white">Subir Archivo</a>
                <a className="tab" onClick={() => {
                  const url = prompt("Ingresa la URL de la imagen:");
                  if (url) {
                    setValue("coverImageUrl", url);
                    setImagePreview(url);
                  }
                }}>URL Directa</a>
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input file-input-bordered w-full"
              />
              <label className="label">
                <span className="label-text-alt">
                  Formatos: JPG, PNG, WebP (máx. 5MB) - O usa una URL de Unsplash
                </span>
              </label>
            </div>

            {/* Dificultad y Duración */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Nivel</span>
                </label>
                <select {...register("difficulty")} className="select select-bordered">
                  <option value="">Seleccionar...</option>
                  <option value="beginner">Principiante</option>
                  <option value="intermediate">Intermedio</option>
                  <option value="advanced">Avanzado</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Duración (minutos)</span>
                </label>
                <input
                  type="number"
                  {...register("durationMinutes", { valueAsNumber: true })}
                  className="input input-bordered"
                  placeholder="120"
                />
              </div>
            </div>

            {/* Fecha y Hora del Evento */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Fecha y Hora del Evento</span>
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Fecha */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-sm">Fecha</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input input-bordered"
                  />
                </div>

                {/* Hora */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-sm">Hora</span>
                  </label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="select select-bordered"
                  >
                    {/* Generar horas de 12:00 a 11:30 en intervalos de 30 min */}
                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(hour => (
                      <React.Fragment key={hour}>
                        <option value={`${hour}:00`}>
                          {hour.toString().padStart(2, '0')}:00
                        </option>
                        <option value={`${hour}:30`}>
                          {hour.toString().padStart(2, '0')}:30
                        </option>
                      </React.Fragment>
                    ))}
                  </select>
                </div>

                {/* AM/PM */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-sm">Periodo</span>
                  </label>
                  <select
                    value={startPeriod}
                    onChange={(e) => setStartPeriod(e.target.value as "AM" | "PM")}
                    className="select select-bordered"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
              
              <label className="label">
                <span className="label-text-alt">
                  Configura la fecha y hora de inicio del evento
                </span>
              </label>
            </div>

            {/* Reglas de Inscripción */}
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text font-semibold">Reglas de Inscripción</span>
              </label>
              
              <select
                value={enrollmentRuleType}
                onChange={(e) => setEnrollmentRuleType(e.target.value as 'before_start' | 'date_range' | 'anytime')}
                className="select select-bordered mb-4"
              >
                <option value="anytime">En cualquier momento (mientras esté habilitado)</option>
                <option value="before_start">Solo antes de empezar el curso</option>
                <option value="date_range">En un rango de fechas específico</option>
              </select>

              {/* Opciones para "antes de empezar" */}
              {enrollmentRuleType === 'before_start' && startDate && (
                <EnrollmentCalendar
                  courseStartDate={startDate}
                  onRangeChange={(start, end) => {
                    setEnrollmentStartDate(start);
                    setEnrollmentEndDate(end);
                  }}
                  initialStartDate={enrollmentStartDate}
                  initialEndDate={enrollmentEndDate}
                />
              )}

              {enrollmentRuleType === 'before_start' && !startDate && (
                <div className="alert alert-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span className="text-sm">Por favor, configura primero la fecha de inicio del curso para poder definir el periodo de inscripciones.</span>
                </div>
              )}

              {/* Opciones para "rango de fechas" */}
              {enrollmentRuleType === 'date_range' && (
                <div className="bg-base-200 p-4 rounded-lg">
                  <p className="text-sm mb-3">Define el periodo de inscripciones:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text text-sm">Fecha de inicio</span>
                      </label>
                      <input
                        type="date"
                        value={enrollmentStartDate}
                        onChange={(e) => setEnrollmentStartDate(e.target.value)}
                        className="input input-bordered"
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text text-sm">Fecha de fin</span>
                      </label>
                      <input
                        type="date"
                        value={enrollmentEndDate}
                        onChange={(e) => setEnrollmentEndDate(e.target.value)}
                        className="input input-bordered"
                      />
                    </div>
                  </div>
                  <label className="label">
                    <span className="label-text-alt">
                      Las inscripciones estarán abiertas solo en este rango de fechas
                    </span>
                  </label>
                </div>
              )}

              {/* Info para "en cualquier momento" */}
              {enrollmentRuleType === 'anytime' && (
                <div className="alert alert-info text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span className="text-sm">Los estudiantes podrán inscribirse en cualquier momento mientras el curso esté activo.</span>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Etiquetas</span>
              </label>
              
              <div className="flex gap-3 mb-2 flex-wrap">
                {tags.map((tag) => (
                  <div key={tag} className="badge badge-primary gap-2 text-white">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="btn btn-ghost btn-xs btn-circle"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  className="input input-bordered flex-1"
                  placeholder="Agregar etiqueta"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="btn btn-outline"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Recursos del curso */}
            {course && user && (
              <div className="mb-6">
                <div className="divider"></div>
                <CourseResourceSelector
                  courseId={course.id}
                  speakerId={user.id}
                />
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn btn-ghost flex-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary text-white flex-1"
                disabled={saving || uploadingImage}
              >
                {saving ? "Guardando..." : uploadingImage ? "Subiendo imagen..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
