"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { Course } from "@/types/course";
import { Loader } from "@/components/common/Loader";
import { 
  IconMicrophone, 
  IconCertificate, 
  IconChartBar, 
  IconPlus,
  IconBook,
  IconX,
  IconCheck
} from "@tabler/icons-react";
import { EnrollmentCalendar } from "@/components/EnrollmentCalendar";
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";
import { teacherRepository } from "@/lib/repositories/teacherRepository";

// FilePond imports
import { FilePond, registerPlugin } from 'react-filepond';
import 'filepond/dist/filepond.min.css';
import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';

// Register FilePond plugins
registerPlugin(
  FilePondPluginImageExifOrientation,
  FilePondPluginImagePreview,
  FilePondPluginFileValidateSize,
  FilePondPluginFileValidateType
);

interface Speaker {
  id: string;
  name: string;
  lastName?: string;
  email?: string;
}

interface CertificateTemplate {
  id: string;
  title: string;
}

interface Survey {
  id: string;
  title: string;
  type: string;
}

export default function ManageCoursePage() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Listas para selección
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [certificates, setCertificates] = useState<CertificateTemplate[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  
  // Selecciones temporales
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<string>('');
  const [selectedEntrySurvey, setSelectedEntrySurvey] = useState<string>('');
  const [selectedExitSurvey, setSelectedExitSurvey] = useState<string>('');
  
  // Reglas de certificados
  const [requireSurveys, setRequireSurveys] = useState(false);
  const [requireAttendance, setRequireAttendance] = useState(false);
  const [requireEnrollmentOnly, setRequireEnrollmentOnly] = useState(false);
  const [hoursAfterStart, setHoursAfterStart] = useState(1);

  // Estados traídos de Edit: información básica, imagen, horario, etiquetas, cohosts, estado y reglas de inscripción
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'' | 'beginner' | 'intermediate' | 'advanced'>('');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePondFiles, setFilePondFiles] = useState<any[]>([]);
  const [showFilePond, setShowFilePond] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('12:00');
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('PM');
  const [endDate, setEndDate] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('12:00');
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>('PM');
  const [selectedCoHosts, setSelectedCoHosts] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [enrollmentRuleType, setEnrollmentRuleType] = useState<'before_start' | 'date_range' | 'anytime'>('anytime');
  const [enrollmentStartDate, setEnrollmentStartDate] = useState<string>('');
  const [enrollmentEndDate, setEnrollmentEndDate] = useState<string>('');
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [speakersSearch, setSpeakersSearch] = useState<string>('');
  const [cohostsSearch, setCohostsSearch] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar curso
        const courseData = await courseRepository.findById(params.id as string);
        setCourse(courseData);
        
        if (courseData) {
          setSelectedSpeakers(courseData.speakerIds || []);
          setSelectedCertificate(courseData.certificateTemplateId || '');
          setSelectedEntrySurvey(courseData.entrySurveyId || '');
          setSelectedExitSurvey(courseData.exitSurveyId || '');
          // Básicos
          setTitle(courseData.title || '');
          setDescription(courseData.description || '');
          setDifficulty((courseData.difficulty as any) || '');
          setDurationMinutes(courseData.durationMinutes ?? '');
          setTags(courseData.tags || []);
          setCoverImageUrl(courseData.coverImageUrl || '');
          setImagePreview(courseData.coverImageUrl || null);
          // Mostrar FilePond solo si no hay imagen
          setShowFilePond(!courseData.coverImageUrl);
          setIsActive(!!courseData.isActive);
          setSelectedCoHosts(courseData.coHostIds || []);
          // Reglas de inscripción
          if (courseData.enrollmentRules) {
            setEnrollmentRuleType(courseData.enrollmentRules.type as any);
          }
          if (courseData.enrollmentStartDate) {
            setEnrollmentStartDate(courseData.enrollmentStartDate.split('T')[0]);
          }
          if (courseData.enrollmentEndDate) {
            setEnrollmentEndDate(courseData.enrollmentEndDate.split('T')[0]);
          }
          // Fecha de inicio
          if (courseData.startDate) {
            const date = new Date(courseData.startDate);
            // Obtener fecha en formato local YYYY-MM-DD
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            setStartDate(dateStr);
            let hours = date.getHours();
            const period = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            const minutes = date.getMinutes();
            setStartTime(`${hours}:${minutes.toString().padStart(2, '0')}`);
            setStartPeriod(period);
          }

          // Fecha de fin
          if ((courseData as any).endDate) {
            const end = new Date((courseData as any).endDate as string);
            // Obtener fecha en formato local YYYY-MM-DD
            const year = end.getFullYear();
            const month = (end.getMonth() + 1).toString().padStart(2, '0');
            const day = end.getDate().toString().padStart(2, '0');
            const endStr = `${year}-${month}-${day}`;
            setEndDate(endStr);
            let hours = end.getHours();
            const period = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            const minutes = end.getMinutes();
            setEndTime(`${hours}:${minutes.toString().padStart(2, '0')}`);
            setEndPeriod(period);
          }
          
          // Cargar reglas de certificados
          if (courseData.certificateRules) {
            setRequireSurveys(courseData.certificateRules.requireSurveys || false);
            setRequireAttendance(courseData.certificateRules.requireAttendance || false);
            setRequireEnrollmentOnly(courseData.certificateRules.requireEnrollmentOnly || false);
            setHoursAfterStart(courseData.certificateRules.hoursAfterStart || 1);
          }
        }

        // Cargar ponentes desde Supabase
        const speakersData = await teacherRepository.findAll();
        setSpeakers(speakersData.map((s: any) => ({
          id: s.id,
          name: s.name,
          lastName: s.lastName,
          email: s.email || '',
        })));

        // Cargar certificados
        const { data: certsData } = await supabaseClient
          .from(TABLES.CERTIFICATE_TEMPLATES)
          .select('id, title');
        setCertificates((certsData || []) as CertificateTemplate[]);

        // Cargar encuestas
        const { data: surveysData } = await supabaseClient
          .from(TABLES.SURVEYS)
          .select('id, title, type')
          .or('is_deleted.is.null,is_deleted.eq.false');
        setSurveys((surveysData || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          type: s.type,
        })));

      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params.id]);

  // Autofill endDate when startDate is picked (for multi-day courses UX parity with creation)
  useEffect(() => {
    if (startDate && !endDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  // Inline validation for schedule: end must be after start when both are present
  useEffect(() => {
    // Build comparable datetimes if possible
    const toISO = (dateStr?: string, timeStr?: string, period?: 'AM' | 'PM') => {
      if (!dateStr || !timeStr || !period) return undefined;
      const [hRaw, m] = timeStr.split(':').map(Number);
      let h = hRaw;
      if (period === 'PM' && hRaw !== 12) h = hRaw + 12;
      if (period === 'AM' && hRaw === 12) h = 0;
      
      // Construir cadena ISO manualmente SIN conversión de zona horaria
      const [year, month, day] = dateStr.split('-');
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      
      return `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
    };

    const startISO = toISO(startDate, startTime, startPeriod);
    const endISO = endDate ? toISO(endDate, endTime, endPeriod) : undefined;
    if (startISO && endISO && new Date(endISO) < new Date(startISO)) {
      setScheduleError('La fecha de fin debe ser posterior a la fecha de inicio');
    } else {
      setScheduleError(null);
    }
  }, [startDate, startTime, startPeriod, endDate, endTime, endPeriod]);

  const handleSave = async () => {
    if (!course) return;

    try {
      setSaving(true);
      // Subir imagen si se seleccionó un archivo
      let finalImageUrl: string | undefined = coverImageUrl || undefined;
      if (selectedFile) {
        const timestamp = Date.now();
        const filePath = `courses/${timestamp}_${selectedFile.name}`;
        
        const { error: uploadError } = await supabaseClient.storage
          .from('files')
          .upload(filePath, selectedFile);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabaseClient.storage
          .from('files')
          .getPublicUrl(filePath);
        
        finalImageUrl = urlData.publicUrl;
      }

      // Construir fecha y hora de inicio
      let startDateTime: string | undefined = undefined;
      if (startDate && startTime) {
        const [hoursRaw, minutes] = startTime.split(':').map(Number);
        let hours = hoursRaw;
        if (startPeriod === 'PM' && hoursRaw !== 12) hours = hoursRaw + 12;
        if (startPeriod === 'AM' && hoursRaw === 12) hours = 0;
        
        // Construir cadena ISO manualmente SIN conversión de zona horaria
        const [year, month, day] = startDate.split('-');
        const hour = hours.toString().padStart(2, '0');
        const minute = minutes.toString().padStart(2, '0');
        
        // Formato: YYYY-MM-DDTHH:mm:ss.000Z
        startDateTime = `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
      }

      // Construir fecha y hora de fin
      let endDateTime: string | undefined = undefined;
      if (endDate) {
        const [hoursRaw, minutes] = endTime.split(':').map(Number);
        let hours = hoursRaw;
        if (endPeriod === 'PM' && hoursRaw !== 12) hours = hoursRaw + 12;
        if (endPeriod === 'AM' && hoursRaw === 12) hours = 0;
        
        // Construir cadena ISO manualmente SIN conversión de zona horaria
        const [year, month, day] = endDate.split('-');
        const hour = hours.toString().padStart(2, '0');
        const minute = minutes.toString().padStart(2, '0');
        
        // Formato: YYYY-MM-DDTHH:mm:ss.000Z
        endDateTime = `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
      }

      if (startDateTime && endDateTime && new Date(endDateTime) < new Date(startDateTime)) {
        setScheduleError('La fecha de fin debe ser posterior a la fecha de inicio');
        setSaving(false);
        return;
      }

      // Construir reglas de inscripción
      let enrollmentRules: any = undefined;
      if (enrollmentRuleType === 'before_start') {
        enrollmentRules = {
          type: 'before_start',
        };
      } else if (enrollmentRuleType === 'date_range') {
        enrollmentRules = { type: 'date_range' };
      } else {
        enrollmentRules = { type: 'anytime' };
      }

      // Armar objeto de actualización evitando undefined
      const updateData: any = {
        updatedAt: new Date(),
        isActive: isActive, // Siempre guardar el estado activo/inactivo
        certificateRules: {
          requireSurveys,
          requireAttendance,
          requireEnrollmentOnly,
          hoursAfterStart,
        },
      };

      // Básicos
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (difficulty) updateData.difficulty = difficulty;
      if (durationMinutes !== '' && typeof durationMinutes === 'number') updateData.durationMinutes = durationMinutes;
      if (tags.length > 0) updateData.tags = tags;
      if (finalImageUrl) updateData.coverImageUrl = finalImageUrl;
      if (startDateTime) updateData.startDate = startDateTime;
      if (endDateTime) updateData.endDate = endDateTime;
      if (selectedSpeakers.length > 0) updateData.speakerIds = selectedSpeakers;
      if (selectedCoHosts.length > 0) updateData.coHostIds = selectedCoHosts;
      if (selectedCertificate) updateData.certificateTemplateId = selectedCertificate;
      if (selectedEntrySurvey) updateData.entrySurveyId = selectedEntrySurvey;
      if (selectedExitSurvey) updateData.exitSurveyId = selectedExitSurvey;
      if (enrollmentRules) updateData.enrollmentRules = enrollmentRules;
      if (enrollmentRuleType === 'before_start' && enrollmentStartDate) updateData.enrollmentStartDate = enrollmentStartDate;
      if (enrollmentRuleType === 'before_start' && enrollmentEndDate) updateData.enrollmentEndDate = enrollmentEndDate;
      if (enrollmentRuleType === 'date_range' && enrollmentStartDate) updateData.enrollmentStartDate = enrollmentStartDate;
      if (enrollmentRuleType === 'date_range' && enrollmentEndDate) updateData.enrollmentEndDate = enrollmentEndDate;

      await courseRepository.update(params.id as string, updateData);

      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error updating course:", error);
      alert("Error al actualizar el curso");
    } finally {
      setSaving(false);
    }
  };

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

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
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

  const entrySurveys = surveys.filter(s => s.type === 'entry');
  const exitSurveys = surveys.filter(s => s.type === 'exit');

  return (
    <div>
      <button onClick={() => router.back()} className="btn btn-ghost mb-6">
        ← Volver
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Gestionar: {title || course.title}</h1>
        {/* Switch de estado */}
        <div className="form-control">
          <label className="label cursor-pointer gap-3">
            <span className="label-text font-semibold">Curso activo</span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="toggle toggle-primary [&:checked]:bg-primary [&:checked]:border-primary [&:checked]:after:bg-white"
            />
          </label>
          <span className="text-xs text-base-content/70 text-right">
            {isActive ? 'Visible para estudiantes' : 'Oculto para estudiantes'}
          </span>
        </div>
      </div>

      {/* Información básica */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Información básica</h2>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Título *</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input input-bordered"
                placeholder="Título del curso"
              />
            </div>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Descripción *</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea textarea-bordered h-32"
                placeholder="Descripción del curso"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Nivel (opcional)</span>
                </label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)} className="select select-bordered">
                  <option value="">Todos</option>
                  <option value="beginner">Básico</option>
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
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="input input-bordered"
                  placeholder="Ej. 90"
                />
              </div>
            </div>

            {/* Etiquetas */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Etiquetas</span>
              </label>
              <div className="flex gap-3 mb-2 flex-wrap">
                {tags.map((tag) => (
                  <div key={tag} className="badge badge-primary gap-2 text-white">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="btn btn-ghost btn-xs btn-circle">
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
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  className="input input-bordered flex-1"
                  placeholder="Agregar etiqueta y presiona Enter"
                />
                <button type="button" onClick={addTag} className="btn btn-outline">Agregar</button>
              </div>
            </div>
          </div>
        </div>

        {/* Imagen de portada */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Imagen de portada</h2>
            
            {!showFilePond && imagePreview ? (
              <>
                <div className="mb-4">
                  <img src={imagePreview} alt="Portada actual" className="w-full h-64 object-cover rounded-lg" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilePond(true)}
                  className="btn btn-outline w-full"
                >
                  Cambiar imagen
                </button>
              </>
            ) : (
              <>
                <FilePond
                  files={filePondFiles}
                  onupdatefiles={setFilePondFiles}
                  allowMultiple={false}
                  maxFiles={1}
                  acceptedFileTypes={['image/*']}
                  maxFileSize="5MB"
                  labelIdle='Arrastra y suelta tu imagen o <span class="filepond--label-action">Examinar</span>'
                  labelFileProcessing="Subiendo"
                  labelFileProcessingComplete="Subida completa"
                  labelFileProcessingAborted="Subida cancelada"
                  labelFileProcessingError="Error al subir"
                  labelTapToCancel="toca para cancelar"
                  labelTapToRetry="toca para reintentar"
                  labelTapToUndo="toca para deshacer"
                  labelButtonRemoveItem="Eliminar"
                  labelButtonAbortItemLoad="Abortar"
                  labelButtonRetryItemLoad="Reintentar"
                  labelButtonAbortItemProcessing="Cancelar"
                  labelButtonUndoItemProcessing="Deshacer"
                  labelButtonRetryItemProcessing="Reintentar"
                  labelButtonProcessItem="Subir"
                  credits={false}
                  stylePanelLayout="compact"
                  imagePreviewHeight={200}
                  onaddfile={(error: any, file: any) => {
                    if (!error && file.file) {
                      setSelectedFile(file.file as File);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setImagePreview(reader.result as string);
                        setShowFilePond(false);
                      };
                      reader.readAsDataURL(file.file as File);
                    }
                  }}
                  onremovefile={() => {
                    setSelectedFile(null);
                    setFilePondFiles([]);
                  }}
                />
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowFilePond(false);
                      setFilePondFiles([]);
                    }}
                    className="btn btn-ghost w-full mt-2"
                  >
                    Cancelar
                  </button>
                )}
              </>
            )}

            <label className="label">
              <span className="label-text-alt">Formatos aceptados: JPG, PNG, GIF. Tamaño máximo: 5MB. Dimensiones recomendadas: 1200x400px</span>
            </label>
          </div>
        </div>
      </div>

      {/* Horario y reglas de inscripción */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Horario */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Horario del evento</h2>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-base-content">Inicio</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="form-control">
                    <label className="label"><span className="label-text text-sm">Fecha</span></label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input input-bordered" />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text text-sm">Hora</span></label>
                    <select value={startTime} onChange={(e) => setStartTime(e.target.value)} className="select select-bordered">
                      {[12,1,2,3,4,5,6,7,8,9,10,11].map(hour => (
                        <React.Fragment key={`start-${hour}`}>
                          <option value={`${hour}:00`}>{hour.toString().padStart(2,'0')}:00</option>
                          <option value={`${hour}:30`}>{hour.toString().padStart(2,'0')}:30</option>
                        </React.Fragment>
                      ))}
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text text-sm">Periodo</span></label>
                    <select value={startPeriod} onChange={(e) => setStartPeriod(e.target.value as any)} className="select select-bordered">
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
                <label className="label"><span className="label-text-alt">Configura la fecha y hora de inicio del evento</span></label>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-base-content">Fin (opcional)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="form-control">
                    <label className="label"><span className="label-text text-sm">Fecha</span></label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input input-bordered" min={startDate || undefined} />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text text-sm">Hora</span></label>
                    <select value={endTime} onChange={(e) => setEndTime(e.target.value)} className="select select-bordered">
                      {[12,1,2,3,4,5,6,7,8,9,10,11].map(hour => (
                        <React.Fragment key={`end-${hour}`}>
                          <option value={`${hour}:00`}>{hour.toString().padStart(2,'0')}:00</option>
                          <option value={`${hour}:30`}>{hour.toString().padStart(2,'0')}:30</option>
                        </React.Fragment>
                      ))}
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text text-sm">Periodo</span></label>
                    <select value={endPeriod} onChange={(e) => setEndPeriod(e.target.value as any)} className="select select-bordered">
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
                <label className="label"><span className="label-text-alt">Define la fecha y hora de conclusión si el curso abarca varias sesiones</span></label>
                {scheduleError && (
                  <label className="label">
                    <span className="label-text-alt text-error">{scheduleError}</span>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reglas de Inscripción */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Reglas de inscripción</h2>
            <select
              value={enrollmentRuleType}
              onChange={(e) => setEnrollmentRuleType(e.target.value as any)}
              className="select select-bordered mb-4"
            >
              <option value="anytime">En cualquier momento (mientras esté habilitado)</option>
              <option value="before_start">Solo antes de empezar el curso</option>
              <option value="date_range">En un rango de fechas específico</option>
            </select>

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

            {enrollmentRuleType === 'date_range' && (
              <div className="bg-base-200 p-4 rounded-lg">
                <p className="text-sm mb-3">Define el periodo de inscripciones:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text text-sm">Fecha de inicio</span></label>
                    <input type="date" value={enrollmentStartDate} onChange={(e) => setEnrollmentStartDate(e.target.value)} className="input input-bordered" />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text text-sm">Fecha de fin</span></label>
                    <input type="date" value={enrollmentEndDate} onChange={(e) => setEnrollmentEndDate(e.target.value)} className="input input-bordered" />
                  </div>
                </div>
                <label className="label"><span className="label-text-alt">Las inscripciones estarán abiertas solo en este rango</span></label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Co-hosts */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Co-hosts</h2>
          <p className="text-sm text-base-content/70 mb-4">Selecciona co-hosts que apoyarán al ponente principal</p>
          <div className="form-control mb-3">
            <label className="label"><span className="label-text">Buscar co-host</span></label>
            <input
              type="text"
              value={cohostsSearch}
              onChange={(e) => setCohostsSearch(e.target.value)}
              className="input input-bordered"
              placeholder="Escribe un nombre"
            />
          </div>
          {speakers.length === 0 ? (
            <div className="alert alert-warning text-white">
              <span>No hay ponentes registrados en el sistema</span>
            </div>
          ) : (
            <div className="border border-base-300 rounded-lg max-h-64 overflow-y-auto divide-y">
              {speakers
                .filter((s) => `${s.name || ''} ${s.lastName || ''} ${s.email || ''}`.toLowerCase().includes(cohostsSearch.toLowerCase()))
                .map((speaker) => (
                  <label key={speaker.id} className="flex items-center gap-3 p-3 hover:bg-base-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCoHosts.includes(speaker.id)}
                      onChange={() => toggleCoHost(speaker.id)}
                      className="toggle toggle-primary [&:checked]:bg-primary [&:checked]:border-primary [&:checked]:after:bg-white"
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{speaker.name} {speaker.lastName || ''}</div>
                      <div className="text-sm text-base-content/60">{speaker.email}</div>
                    </div>
                    {selectedCoHosts.includes(speaker.id) && (
                      <IconCheck size={20} className="text-success" />
                    )}
                  </label>
                ))}
              {speakers.filter((s) => `${s.name || ''} ${s.lastName || ''} ${s.email || ''}`.toLowerCase().includes(cohostsSearch.toLowerCase())).length === 0 && (
                <div className="p-4 text-sm text-base-content/60">No hay resultados</div>
              )}
            </div>
          )}
          <label className="label">
            <span className="label-text-alt">Co-hosts participan en presentación/despedida pero no aparecen como ponentes principales</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asignar Ponentes */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title gap-2">
              <IconMicrophone size={24} />
              Ponentes Asignados
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Selecciona los ponentes que impartirán este curso
            </p>

            {speakers.length === 0 ? (
              <div className="alert alert-warning text-white">
                <span>No hay ponentes registrados en el sistema</span>
              </div>
            ) : (
              <>
                <div className="form-control mb-3">
                  <label className="label"><span className="label-text">Buscar ponente</span></label>
                  <input
                    type="text"
                    value={speakersSearch}
                    onChange={(e) => setSpeakersSearch(e.target.value)}
                    className="input input-bordered"
                    placeholder="Escribe un nombre"
                  />
                </div>
                <div className="border border-base-300 rounded-lg max-h-64 overflow-y-auto divide-y">
                  {speakers
                    .filter((s) => `${s.name || ''} ${s.lastName || ''} ${s.email || ''}`.toLowerCase().includes(speakersSearch.toLowerCase()))
                    .map((speaker) => (
                      <label
                        key={speaker.id}
                        className="flex items-center gap-3 p-3 hover:bg-base-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSpeakers.includes(speaker.id)}
                          onChange={() => toggleSpeaker(speaker.id)}
                          className="checkbox checkbox-primary [--chkfg:white]"
                        />
                        <div className="flex-1">
                          <div className="font-semibold">{speaker.name} {speaker.lastName || ''}</div>
                          <div className="text-sm text-base-content/60">{speaker.email}</div>
                        </div>
                        {selectedSpeakers.includes(speaker.id) && (
                          <IconCheck size={20} className="text-success" />
                        )}
                      </label>
                    ))}
                  {speakers.filter((s) => `${s.name || ''} ${s.lastName || ''} ${s.email || ''}`.toLowerCase().includes(speakersSearch.toLowerCase())).length === 0 && (
                    <div className="p-4 text-sm text-base-content/60">No hay resultados</div>
                  )}
                </div>
              </>
            )}

            <div className="text-sm text-base-content/60 mt-4">
              {selectedSpeakers.length} ponente(s) seleccionado(s)
            </div>
          </div>
        </div>

        {/* Asignar Certificado */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title gap-2">
              <IconCertificate size={24} />
              Plantilla de Certificado
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Selecciona la plantilla para generar certificados al completar el curso
            </p>

            {certificates.length === 0 ? (
              <div className="alert alert-warning text-white">
                <span>No hay plantillas de certificados creadas</span>
              </div>
            ) : (
              <select
                value={selectedCertificate}
                onChange={(e) => setSelectedCertificate(e.target.value)}
                className="select select-bordered w-full"
              >
                <option value="">Sin certificado</option>
                {certificates.map((cert) => (
                  <option key={cert.id} value={cert.id}>
                    {cert.title}
                  </option>
                ))}
              </select>
            )}

            {selectedCertificate && (
              <div className="alert alert-success mt-4 text-white">
                <IconCheck size={20} />
                <span>Certificado configurado</span>
              </div>
            )}
          </div>
        </div>

        {/* Encuesta de Entrada */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title gap-2">
              <IconChartBar size={24} />
              Encuesta de Entrada
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Encuesta que los estudiantes responderán al iniciar el curso
            </p>

            {entrySurveys.length === 0 ? (
              <div className="alert alert-warning">
                <span>No hay encuestas de entrada creadas</span>
              </div>
            ) : (
              <select
                value={selectedEntrySurvey}
                onChange={(e) => setSelectedEntrySurvey(e.target.value)}
                className="select select-bordered w-full"
              >
                <option value="">Sin encuesta de entrada</option>
                {entrySurveys.map((survey) => (
                  <option key={survey.id} value={survey.id}>
                    {survey.title}
                  </option>
                ))}
              </select>
            )}

            {selectedEntrySurvey && (
              <div className="alert alert-info mt-4 text-white">
                <IconCheck size={20} />
                <span>Encuesta de entrada configurada</span>
              </div>
            )}
          </div>
        </div>

        {/* Encuesta de Salida */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title gap-2">
              <IconChartBar size={24} />
              Encuesta de Salida
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Encuesta que los estudiantes responderán al finalizar el curso
            </p>

            {exitSurveys.length === 0 ? (
              <div className="alert alert-warning text-white">
                <span>No hay encuestas de salida creadas</span>
              </div>
            ) : (
              <select
                value={selectedExitSurvey}
                onChange={(e) => setSelectedExitSurvey(e.target.value)}
                className="select select-bordered w-full"
              >
                <option value="">Sin encuesta de salida</option>
                {exitSurveys.map((survey) => (
                  <option key={survey.id} value={survey.id}>
                    {survey.title}
                  </option>
                ))}
              </select>
            )}

            {selectedExitSurvey && (
              <div className="alert alert-info mt-4 text-white">
                <IconCheck size={20} />
                <span>Encuesta de salida configurada</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reglas para Certificados */}
      {selectedCertificate && (
        <div className="card bg-base-100 shadow-xl mt-6">
          <div className="card-body">
            <h2 className="card-title gap-2">
              <IconCertificate size={24} />
              Reglas para Descargar Certificado
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Define los requisitos que los estudiantes deben cumplir para poder descargar su certificado
            </p>

            <div className="alert alert-info text-white mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>El certificado se habilitará automáticamente después de {hoursAfterStart} hora(s) del inicio del curso, si se cumplen las reglas seleccionadas.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna 1: Reglas */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg mb-3">Requisitos</h3>
                
                {/* Opción 1: Solo inscripción */}
                <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-base-300 hover:border-primary cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={requireEnrollmentOnly}
                    onChange={(e) => {
                      setRequireEnrollmentOnly(e.target.checked);
                      if (e.target.checked) {
                        setRequireSurveys(false);
                        setRequireAttendance(false);
                      }
                    }}
                    className="checkbox checkbox-primary [--chkfg:white] mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">Solo Inscripción</div>
                    <div className="text-sm text-base-content/70">
                      El estudiante solo necesita estar inscrito en el curso. El certificado se habilita automáticamente después del tiempo configurado.
                    </div>
                  </div>
                </label>

                {/* Opción 2: Completar encuestas */}
                <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-base-300 hover:border-primary cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={requireSurveys}
                    onChange={(e) => {
                      setRequireSurveys(e.target.checked);
                      if (e.target.checked) {
                        setRequireEnrollmentOnly(false);
                      }
                    }}
                    className="checkbox checkbox-primary text-white mt-1"
                    disabled={requireEnrollmentOnly}
                  />
                  <div className="flex-1">
                    <div className="font-semibold">Completar Encuestas</div>
                    <div className="text-sm text-base-content/70">
                      El estudiante debe completar las encuestas de entrada y salida configuradas para el curso.
                    </div>
                    {requireSurveys && (!selectedEntrySurvey || !selectedExitSurvey) && (
                      <div className="text-xs text-warning mt-2">
                        ⚠️ Asegúrate de configurar ambas encuestas (entrada y salida)
                      </div>
                    )}
                  </div>
                </label>

                {/* Opción 3: Asistencia a lecciones */}
                <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-base-300 hover:border-primary cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={requireAttendance}
                    onChange={(e) => {
                      setRequireAttendance(e.target.checked);
                      if (e.target.checked) {
                        setRequireEnrollmentOnly(false);
                      }
                    }}
                    className="checkbox checkbox-primary text-white mt-1"
                    disabled={requireEnrollmentOnly}
                  />
                  <div className="flex-1">
                    <div className="font-semibold">Asistencia a Lecciones</div>
                    <div className="text-sm text-base-content/70">
                      El estudiante debe haber asistido al menos 5 minutos a todas las lecciones/videoconferencias del curso.
                    </div>
                  </div>
                </label>
              </div>

              {/* Columna 2: Tiempo de habilitación */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg mb-3">Tiempo de Habilitación</h3>
                
                <div className="p-4 rounded-lg bg-base-200">
                  <label className="label">
                    <span className="label-text font-semibold">Horas después del inicio del curso</span>
                  </label>
                  <p className="text-sm text-base-content/70 mb-3">
                    El certificado se habilitará automáticamente después de este tiempo, si se cumplen los requisitos.
                  </p>
                  
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hours"
                        value="1"
                        checked={hoursAfterStart === 1}
                        onChange={() => setHoursAfterStart(1)}
                        className="radio radio-primary"
                      />
                      <span>1 hora</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hours"
                        value="2"
                        checked={hoursAfterStart === 2}
                        onChange={() => setHoursAfterStart(2)}
                        className="radio radio-primary"
                      />
                      <span>2 horas</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hours"
                        value="3"
                        checked={hoursAfterStart === 3}
                        onChange={() => setHoursAfterStart(3)}
                        className="radio radio-primary"
                      />
                      <span>3 horas</span>
                    </label>
                  </div>
                </div>

                {/* Resumen de reglas */}
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <h4 className="font-semibold mb-2">Resumen de Configuración</h4>
                  <ul className="text-sm space-y-1">
                    {requireEnrollmentOnly && (
                      <li className="flex items-center gap-2">
                        <IconCheck size={16} className="text-success" />
                        Solo requiere inscripción
                      </li>
                    )}
                    {requireSurveys && (
                      <li className="flex items-center gap-2">
                        <IconCheck size={16} className="text-success" />
                        Completar encuestas
                      </li>
                    )}
                    {requireAttendance && (
                      <li className="flex items-center gap-2">
                        <IconCheck size={16} className="text-success" />
                        Asistir 5 min a cada lección
                      </li>
                    )}
                    <li className="flex items-center gap-2 text-primary font-semibold">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Habilitar después de {hoursAfterStart} hora(s)
                    </li>
                  </ul>
                </div>

                {!requireEnrollmentOnly && !requireSurveys && !requireAttendance && (
                  <div className="alert alert-warning text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>Selecciona al menos un requisito</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-4 mt-8">
        <button
          onClick={() => router.back()}
          className="btn btn-ghost flex-1"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="btn btn-primary text-white flex-1"
          disabled={saving}
        >
          {saving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>

      {/* Modal de Éxito */}
      {showSuccessModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mb-4">
                <IconCheck size={40} className="text-white" />
              </div>
              <h3 className="font-bold text-2xl mb-2">¡Curso Actualizado!</h3>
              <p className="text-base-content/70 mb-6">
                Los cambios se han guardado exitosamente
              </p>
              <div className="modal-action w-full">
                <button
                  onClick={() => router.push(`/dashboard/courses/${params.id}`)}
                  className="btn btn-primary text-white w-full"
                >
                  Volver al Curso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
