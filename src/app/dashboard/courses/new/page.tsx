"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCourseSchema, CreateCourseInput } from "@/lib/validators/courseSchema";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { IconX, IconUpload } from "@tabler/icons-react";
import { EnrollmentCalendar } from "@/components/EnrollmentCalendar";
import { useUploadFile } from "@/hooks/useUploadFile";

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

export default function NewCoursePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("12:00");
  const [startPeriod, setStartPeriod] = useState<"AM" | "PM">("PM");
  const [endDate, setEndDate] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("12:00");
  const [endPeriod, setEndPeriod] = useState<"AM" | "PM">("PM");
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
  const [selectedCoHosts, setSelectedCoHosts] = useState<string[]>([]);
  const [selectedEntrySurvey, setSelectedEntrySurvey] = useState<string>("");
  const [selectedExitSurvey, setSelectedExitSurvey] = useState<string>("");
  const [enrollmentRuleType, setEnrollmentRuleType] = useState<'before_start' | 'date_range' | 'anytime'>('anytime');
  const [enrollmentStartDate, setEnrollmentStartDate] = useState<string>("");
  const [enrollmentEndDate, setEnrollmentEndDate] = useState<string>("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  
  const { uploadFile, uploading: uploadingImage } = useUploadFile();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCourseInput>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      speakerIds: user?.id ? [user.id] : [],
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar speakers (incluye ponentes sin cuenta de usuario)
        const speakersSnapshot = await getDocs(collection(db, 'speakers'));
        const speakersData = speakersSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          lastName: doc.data().lastName,
          email: doc.data().email || '',
        })) as Speaker[];
        setSpeakers(speakersData);

        // Inicializar con el usuario actual si es speaker
        if (user?.id && user?.role === 'speaker') {
          setSelectedSpeakers([user.id]);
        }

        // Cargar encuestas
        const surveysSnapshot = await getDocs(collection(db, 'surveys'));
        const surveysData = surveysSnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title,
          type: doc.data().type,
        })) as Survey[];
        setSurveys(surveysData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (startDate && !endDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

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
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: CreateCourseInput) => {
    try {
      setLoading(true);
      setError(null);
      
      // Subir imagen si existe
      let coverImageUrl: string | undefined = undefined;
      if (coverImageFile) {
        coverImageUrl = await uploadFile(coverImageFile, 'courses');
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
        
        // Construir cadena ISO manualmente SIN conversión de zona horaria
        const [year, month, day] = startDate.split('-');
        const hour = hour24.toString().padStart(2, '0');
        const minute = minutes.toString().padStart(2, '0');
        
        // Formato: YYYY-MM-DDTHH:mm:ss.000Z
        startDateTime = `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
      }

      let endDateTime: string | undefined = undefined;
      if (endDate) {
        const [hours, minutes] = endTime.split(':').map(Number);
        let hour24 = hours;
        if (endPeriod === "PM" && hours !== 12) {
          hour24 = hours + 12;
        } else if (endPeriod === "AM" && hours === 12) {
          hour24 = 0;
        }
        
        // Construir cadena ISO manualmente SIN conversión de zona horaria
        const [year, month, day] = endDate.split('-');
        const hour = hour24.toString().padStart(2, '0');
        const minute = minutes.toString().padStart(2, '0');
        
        // Formato: YYYY-MM-DDTHH:mm:ss.000Z
        endDateTime = `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
      }

      if (startDateTime && endDateTime && new Date(endDateTime) < new Date(startDateTime)) {
        setError("La fecha de fin debe ser posterior a la fecha de inicio");
        setLoading(false);
        return;
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
      
      // Construir datos del curso
      const courseData = {
        ...data,
        coverImageUrl,
        speakerIds: selectedSpeakers.length > 0 ? selectedSpeakers : (user?.id ? [user.id] : []),
        coHostIds: selectedCoHosts.length > 0 ? selectedCoHosts : undefined,
        startDate: startDateTime,
        entrySurveyId: selectedEntrySurvey || undefined,
        exitSurveyId: selectedExitSurvey || undefined,
        enrollmentRules,
        enrollmentStartDate: enrollmentRuleType === 'date_range' && enrollmentStartDate ? enrollmentStartDate : undefined,
        enrollmentEndDate: enrollmentRuleType === 'date_range' && enrollmentEndDate ? enrollmentEndDate : undefined,
        endDate: endDateTime,
      };
      
      const course = await courseRepository.create(courseData);
      router.push(`/dashboard/courses/${course.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el curso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Crear Nuevo Curso</h1>
        <p className="text-base-content/70">Completa la información básica de tu curso</p>
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit)}>
            <input type="hidden" {...register("speakerIds.0")} value={user?.id || ''} />

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Título del curso</span>
              </label>
              <input
                type="text"
                {...register("title")}
                className="input input-bordered"
                placeholder="Ej: Introducción a React"
              />
              {errors.title && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.title.message}</span>
                </label>
              )}
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Descripción</span>
              </label>
              <textarea
                {...register("description")}
                className="textarea textarea-bordered h-32"
                placeholder="Describe de qué trata tu curso..."
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
                  Selecciona los ponentes principales del curso (aparecerán en la información del curso)
                </span>
              </label>
              {selectedSpeakers.length === 0 && (
                <label className="label">
                  <span className="label-text-alt text-error">Debe seleccionar al menos un ponente</span>
                </label>
              )}
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

            {/* Encuestas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Encuesta de Entrada</span>
                </label>
                <select
                  value={selectedEntrySurvey}
                  onChange={(e) => setSelectedEntrySurvey(e.target.value)}
                  className="select select-bordered"
                >
                  <option value="">Sin encuesta</option>
                  {surveys.map(survey => (
                    <option key={survey.id} value={survey.id}>
                      {survey.title}
                    </option>
                  ))}
                </select>
                <label className="label">
                  <span className="label-text-alt">Encuesta antes de iniciar el curso</span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Encuesta de Salida</span>
                </label>
                <select
                  value={selectedExitSurvey}
                  onChange={(e) => setSelectedExitSurvey(e.target.value)}
                  className="select select-bordered"
                >
                  <option value="">Sin encuesta</option>
                  {surveys.map(survey => (
                    <option key={survey.id} value={survey.id}>
                      {survey.title}
                    </option>
                  ))}
                </select>
                <label className="label">
                  <span className="label-text-alt">Encuesta al finalizar el curso</span>
                </label>
              </div>
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Imagen del curso (opcional)</span>
              </label>
              
              {coverImagePreview ? (
                <div className="relative">
                  <img 
                    src={coverImagePreview} 
                    alt="Vista previa" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImageFile(null);
                      setCoverImagePreview(null);
                    }}
                    className="absolute top-2 right-2 btn btn-circle btn-sm btn-error text-white"
                  >
                    <IconX size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-base-300 rounded-lg cursor-pointer hover:bg-base-200 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <IconUpload size={48} className="mb-3 text-base-content/50" />
                    <p className="mb-2 text-sm text-base-content/70">
                      <span className="font-semibold">Click para subir</span> o arrastra y suelta
                    </p>
                    <p className="text-xs text-base-content/50">PNG, JPG o WEBP (máx. 5MB)</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
              <label className="label">
                <span className="label-text-alt">Esta imagen se mostrará como portada del curso</span>
              </label>
            </div>

            {/* Fecha y Hora del Evento */}
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text">Fecha y Hora del Evento</span>
              </label>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-base-content">Inicio</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text text-sm">Hora</span>
                      </label>
                      <select
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="select select-bordered"
                      >
                        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(hour => (
                          <React.Fragment key={`start-${hour}`}>
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

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-base-content">Fin (opcional)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text text-sm">Fecha</span>
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="input input-bordered"
                        min={startDate || undefined}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text text-sm">Hora</span>
                      </label>
                      <select
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="select select-bordered"
                      >
                        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(hour => (
                          <React.Fragment key={`end-${hour}`}>
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
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text text-sm">Periodo</span>
                      </label>
                      <select
                        value={endPeriod}
                        onChange={(e) => setEndPeriod(e.target.value as "AM" | "PM")}
                        className="select select-bordered"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                  <label className="label">
                    <span className="label-text-alt">
                      Define la fecha y hora de conclusión si el curso abarca varias sesiones
                    </span>
                  </label>
                </div>
              </div>

              {error && error.includes("fecha de fin") && (
                <label className="label">
                  <span className="label-text-alt text-error">{error}</span>
                </label>
              )}
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

            <div className="card-actions justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn"
                disabled={loading}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary text-white" disabled={loading || uploadingImage}>
                {uploadingImage ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Subiendo imagen...
                  </>
                ) : loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creando...
                  </>
                ) : (
                  "Crear Curso"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
