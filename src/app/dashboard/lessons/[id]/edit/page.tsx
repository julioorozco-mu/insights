"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";
import { lessonRepository } from "@/lib/repositories/lessonRepository";
import { teacherRepository } from "@/lib/repositories/teacherRepository";
import { Loader } from "@/components/common/Loader";
import { useAuth } from "@/hooks/useAuth";
import { IconBook, IconFileText, IconClipboardList, IconDeviceFloppy, IconUpload, IconCheck, IconSearch, IconFilter, IconSortAscending, IconSortDescending, IconX } from "@tabler/icons-react";
import { Lesson } from "@/types/lesson";

// FilePond imports
import { FilePond, registerPlugin } from 'react-filepond';
import 'filepond/dist/filepond.min.css';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import type { FilePondFile } from 'filepond';

// Register FilePond plugins
registerPlugin(
  FilePondPluginFileValidateSize,
  FilePondPluginFileValidateType
);

interface Survey {
  id: string;
  title: string;
  type: string;
}

interface Resource {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSize?: number;
  createdAt?: string;
}

export default function EditLessonPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estados del formulario
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleHour, setScheduleHour] = useState('12');
  const [scheduleMinute, setScheduleMinute] = useState('00');
  const [scheduleAmPm, setScheduleAmPm] = useState('PM');
  const [coverImage, setCoverImage] = useState("");
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
  const [selectedCoHosts, setSelectedCoHosts] = useState<string[]>([]);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [showCoverUpload, setShowCoverUpload] = useState(false);
  const [coverFiles, setCoverFiles] = useState<any[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [streamingType, setStreamingType] = useState<'agora' | 'external_link'>('agora');
  const [liveStreamUrl, setLiveStreamUrl] = useState('');
  const [recordedVideoUrl, setRecordedVideoUrl] = useState('');
  
  // Estados para búsqueda de ponentes
  const [speakerSearchTerm, setSpeakerSearchTerm] = useState('');
  const [coHostSearchTerm, setCoHostSearchTerm] = useState('');
  
  // Filtrar ponentes según búsqueda
  const filteredSpeakers = speakers.filter(speaker => 
    speaker.name?.toLowerCase().includes(speakerSearchTerm.toLowerCase()) ||
    speaker.email?.toLowerCase().includes(speakerSearchTerm.toLowerCase())
  );
  
  const filteredCoHosts = speakers.filter(speaker => 
    speaker.name?.toLowerCase().includes(coHostSearchTerm.toLowerCase()) ||
    speaker.email?.toLowerCase().includes(coHostSearchTerm.toLowerCase())
  );
  
  // Encuestas
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedEntrySurvey, setSelectedEntrySurvey] = useState<string>("");
  const [selectedExitSurvey, setSelectedExitSurvey] = useState<string>("");
  
  // Recursos
  const [availableResources, setAvailableResources] = useState<Resource[]>([]);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  
  // Modal de subida
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filePondFiles, setFilePondFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  
  // Modal de confirmación
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Modal de búsqueda de recursos
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [tempSelectedResources, setTempSelectedResources] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar la lección
        const lessonData = await lessonRepository.findById(params.id as string);
        if (lessonData) {
          setLesson(lessonData);
          setTitle(lessonData.title);
          setDescription(lessonData.description || "");
          
          // Parsear fecha y hora si existe
          const existingSchedule = (lessonData as any).scheduledDate;
          if (existingSchedule) {
            const dateObj = new Date(existingSchedule);
            // Obtener componentes en UTC (sin conversión de zona horaria)
            const year = dateObj.getUTCFullYear();
            const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
            const day = dateObj.getUTCDate().toString().padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            setScheduleDate(dateStr);
            
            // Obtener hora en UTC
            let hours = dateObj.getUTCHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            
            const minutes = dateObj.getUTCMinutes();
            const roundedMinutes = Math.round(minutes / 15) * 15;
            
            setScheduleHour(hours.toString().padStart(2, '0'));
            setScheduleMinute(roundedMinutes.toString().padStart(2, '0'));
            setScheduleAmPm(ampm);
          }
          
          setScheduledDate((lessonData as any).scheduledDate || "");
          setCoverImage((lessonData as any).coverImage || "");
          setSelectedSpeakers((lessonData as any).speakerIds || []);
          setSelectedCoHosts((lessonData as any).coHostIds || []);
          setSelectedEntrySurvey(lessonData.entrySurveyId || "");
          setSelectedExitSurvey(lessonData.exitSurveyId || "");
          setSelectedResources(lessonData.resourceIds || []);
          setStreamingType(lessonData.streamingType || 'agora');
          setLiveStreamUrl(lessonData.liveStreamUrl || '');
          setRecordedVideoUrl(lessonData.recordedVideoUrl || '');
          
          // Cargar encuestas disponibles
          const { data: surveysData } = await supabaseClient
            .from(TABLES.SURVEYS)
            .select('id, title, type')
            .or('is_deleted.is.null,is_deleted.eq.false');
          setSurveys((surveysData || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            type: s.type,
          })));
          
          // Cargar TODOS los recursos disponibles en la plataforma (excluyendo deshabilitados)
          const { data: resourcesData } = await supabaseClient
            .from(TABLES.FILE_ATTACHMENTS)
            .select('*')
            .neq('status', 'disabled');
          
          const mappedResources = (resourcesData || []).map((r: any) => ({
            id: r.id,
            title: r.metadata?.title || r.name || 'Sin título',
            fileUrl: r.url,
            fileType: r.type,
            fileName: r.name,
            fileSize: r.size,
            createdAt: r.created_at,
            status: r.status,
          })) as Resource[];
          console.log('Recursos cargados:', mappedResources.length, mappedResources);
          setAvailableResources(mappedResources);
          setAllResources(mappedResources);
          setFilteredResources(mappedResources);
          
          // Cargar ponentes disponibles
          const speakersData = await teacherRepository.findAll();
          setSpeakers(speakersData.filter((s: any) => s.isActive !== false));
        }
      } catch (error) {
        console.error('Error loading lesson:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params.id, user?.id]);

  const toggleResource = (resourceId: string) => {
    setSelectedResources(prev =>
      prev.includes(resourceId)
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const toggleTempResource = (resourceId: string) => {
    setTempSelectedResources(prev =>
      prev.includes(resourceId)
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const handleOpenSearchModal = () => {
    console.log('Abriendo modal de búsqueda');
    console.log('allResources:', allResources.length, allResources);
    console.log('filteredResources:', filteredResources.length, filteredResources);
    setTempSelectedResources([...selectedResources]);
    setSearchTerm('');
    setFilterType('all');
    setSortBy('date');
    setSortOrder('desc');
    applyFilters(allResources, '', 'all', 'date', 'desc');
    setShowSearchModal(true);
  };

  const applyFilters = (
    resources: Resource[],
    search: string,
    type: string,
    sort: 'name' | 'date',
    order: 'asc' | 'desc'
  ) => {
    let filtered = [...resources];

    // Filtrar por búsqueda
    if (search.trim()) {
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.fileName.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filtrar por tipo
    if (type !== 'all') {
      filtered = filtered.filter(r => {
        if (type === 'pdf') return r.fileType.includes('pdf');
        if (type === 'image') return r.fileType.includes('image');
        if (type === 'video') return r.fileType.includes('video');
        if (type === 'document') return r.fileType.includes('document') || r.fileType.includes('word') || r.fileType.includes('text');
        return true;
      });
    }

    // Ordenar
    filtered.sort((a, b) => {
      if (sort === 'name') {
        const comparison = a.title.localeCompare(b.title);
        return order === 'asc' ? comparison : -comparison;
      } else {
        const dateA = new Date((a as any).createdAt || 0).getTime();
        const dateB = new Date((b as any).createdAt || 0).getTime();
        return order === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });

    setFilteredResources(filtered);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    applyFilters(allResources, value, filterType, sortBy, sortOrder);
  };

  const handleFilterChange = (value: string) => {
    setFilterType(value);
    applyFilters(allResources, searchTerm, value, sortBy, sortOrder);
  };

  const handleSortChange = (newSortBy: 'name' | 'date') => {
    const newOrder = sortBy === newSortBy && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(newSortBy);
    setSortOrder(newOrder);
    applyFilters(allResources, searchTerm, filterType, newSortBy, newOrder);
  };

  const handleApplySelection = () => {
    setSelectedResources(tempSelectedResources);
    setShowSearchModal(false);
  };

  const buildScheduledDateTime = (): string => {
    if (!scheduleDate) return '';
    
    // Convertir hora de 12h a 24h
    let hour24 = parseInt(scheduleHour);
    if (scheduleAmPm === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (scheduleAmPm === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    // Construir cadena ISO manualmente SIN conversión de zona horaria
    // El usuario ingresa 12:00 PM, queremos guardar exactamente eso como "...T12:00:00.000Z"
    const [year, month, day] = scheduleDate.split('-');
    const hour = hour24.toString().padStart(2, '0');
    const minute = scheduleMinute.padStart(2, '0');
    
    // Formato: YYYY-MM-DDTHH:mm:ss.000Z
    return `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
  };

  const handleUploadCover = async () => {
    if (!coverFiles.length || !user?.id) return;

    try {
      setUploadingCover(true);
      const file = coverFiles[0].file as File;
      
      // Subir imagen a Supabase Storage
      const timestamp = Date.now();
      const filePath = `lessons/covers/${timestamp}_${file.name}`;
      
      const { error: uploadError } = await supabaseClient.storage
        .from('files')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabaseClient.storage
        .from('files')
        .getPublicUrl(filePath);
      
      setCoverImage(urlData.publicUrl);
      setCoverFiles([]);
      setShowCoverUpload(false);
    } catch (error) {
      console.error('Error uploading cover:', error);
      alert('Error al subir la portada');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleUploadResource = async () => {
    if (!filePondFiles.length || !uploadTitle.trim() || !user?.id || !lesson) return;

    try {
      setUploading(true);
      const file = filePondFiles[0].file as File;
      
      // Subir archivo a Supabase Storage
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const filePath = `resources/${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabaseClient.storage
        .from('files')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabaseClient.storage
        .from('files')
        .getPublicUrl(filePath);
      
      const fileUrl = urlData.publicUrl;
      
      // Crear recurso en Supabase
      const { data: resourceDoc, error: insertError } = await supabaseClient
        .from(TABLES.FILE_ATTACHMENTS)
        .insert({
          name: file.name,
          url: fileUrl,
          type: file.type,
          size: file.size,
          uploaded_by: user.id,
          uploaded_by_name: user.name,
          metadata: {
            title: uploadTitle,
            description: '',
          },
        })
        .select('id')
        .single();
      
      if (insertError) throw insertError;
      
      // Agregar a la lista de recursos disponibles (formato adaptado)
      const newResource: Resource = {
        id: resourceDoc.id,
        title: uploadTitle,
        fileUrl,
        fileType: file.type,
        fileName: file.name,
        fileSize: file.size,
        createdAt: new Date().toISOString(),
      };
      setAvailableResources(prev => [...prev, newResource]);
      setAllResources(prev => [...prev, newResource]);
      setFilteredResources(prev => [...prev, newResource]);
      
      // Vincular automáticamente a la lección
      setSelectedResources(prev => [...prev, resourceDoc.id]);
      
      // Limpiar y cerrar modal
      setFilePondFiles([]);
      setUploadTitle('');
      setShowUploadModal(false);
      
      // Mostrar mensaje de éxito sin alert
    } catch (error) {
      console.error('Error uploading resource:', error);
      alert('Error al subir el recurso');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!lesson) return;

    try {
      setSaving(true);
      
      const scheduledDateTime = buildScheduledDateTime();
      
      const updateData: any = {
        title,
        description,
        resourceIds: selectedResources,
        scheduledDate: scheduledDateTime || null,
        coverImage,
        speakerIds: selectedSpeakers,
        coHostIds: selectedCoHosts,
        streamingType,
        liveStreamUrl: streamingType === 'external_link' ? liveStreamUrl || null : null,
        recordedVideoUrl: recordedVideoUrl || null,
      };
      
      if (selectedEntrySurvey) updateData.entrySurveyId = selectedEntrySurvey;
      if (selectedExitSurvey) updateData.exitSurveyId = selectedExitSurvey;

      await lessonRepository.update(lesson.id, updateData);
      
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error updating lesson:', error);
      alert('Error al actualizar la lección');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Lección no encontrada</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="btn btn-ghost mb-6">
        ← Volver
      </button>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Editar Lección</h1>
            <IconBook size={32} className="text-primary" />
          </div>

          {/* Título */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Título *</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input input-bordered"
              placeholder="Título de la lección"
            />
          </div>

          {/* Descripción */}
          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text font-semibold">Descripción</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered h-32"
              placeholder="Descripción de la lección"
            />
          </div>

          {/* Fecha y Hora */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Fecha y Hora de la Lección</span>
            </label>
            
            {/* Fecha, Hora, Minutos, AM/PM y Vista Previa */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="input input-bordered input-sm col-span-2 sm:col-span-1"
              />
              
              <select
                value={scheduleHour}
                onChange={(e) => setScheduleHour(e.target.value)}
                className="select select-bordered select-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
                  <option key={hour} value={hour.toString().padStart(2, '0')}>
                    {hour.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
              
              <select
                value={scheduleMinute}
                onChange={(e) => setScheduleMinute(e.target.value)}
                className="select select-bordered select-sm"
              >
                <option value="00">00</option>
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="45">45</option>
              </select>
              
              <select
                value={scheduleAmPm}
                onChange={(e) => setScheduleAmPm(e.target.value)}
                className="select select-bordered select-sm"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>

              {/* Vista previa de fecha/hora */}
              <div className="flex items-center px-3 bg-base-200 rounded-lg col-span-2 sm:col-span-1">
                <span className="text-sm font-medium truncate">
                  {scheduleDate && scheduleHour ? (
                    (() => {
                      const [year, month, day] = scheduleDate.split('-').map(Number);
                      const date = new Date(year, month - 1, day);
                      return `${date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} ${scheduleHour}:${scheduleMinute} ${scheduleAmPm}`;
                    })()
                  ) : (
                    <span className="text-base-content/50">--</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Configuración de Streaming */}
          {(lesson.type === 'livestream' || lesson.type === 'hybrid') && (
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Tipo de Streaming *</span>
              </label>
              <select
                value={streamingType}
                onChange={(e) => setStreamingType(e.target.value as 'agora' | 'external_link')}
                className="select select-bordered"
              >
                <option value="agora">Nativo con Agora (Videoconferencia integrada)</option>
                <option value="external_link">Link Externo (YouTube, Zoom, etc.)</option>
              </select>
              <label className="label">
                <span className="label-text-alt">
                  {streamingType === 'agora' 
                    ? 'Usa la videoconferencia integrada de la plataforma con Agora'
                    : 'Proporciona un link de YouTube u otra plataforma de streaming'}
                </span>
              </label>
            </div>
          )}

          {/* URL del Streaming Externo */}
          {(lesson.type === 'livestream' || lesson.type === 'hybrid') && streamingType === 'external_link' && (
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">URL del Streaming en Vivo</span>
              </label>
              <input
                type="url"
                value={liveStreamUrl}
                onChange={(e) => setLiveStreamUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... o https://zoom.us/j/..."
                className="input input-bordered"
              />
              <label className="label">
                <span className="label-text-alt">
                  Link del streaming en vivo. Si es YouTube, se mostrará el video embebido en la plataforma. Puedes agregarlo después de crear la lección.
                </span>
              </label>
            </div>
          )}

          {/* URL del Video Grabado */}
          {(lesson.type === 'livestream' || lesson.type === 'hybrid') && (
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">URL del Video Grabado (Opcional)</span>
              </label>
              <input
                type="url"
                value={recordedVideoUrl}
                onChange={(e) => setRecordedVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... (grabación de la clase)"
                className="input input-bordered"
              />
              <label className="label">
                <span className="label-text-alt">
                  Este video se mostrará automáticamente después de que pase la fecha programada de la clase.
                </span>
              </label>
            </div>
          )}

          {/* Portada de la Lección */}
          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text font-semibold">Portada de la Lección</span>
            </label>
            
            {coverImage && !showCoverUpload ? (
              <div className="space-y-2">
                <img src={coverImage} alt="Portada" className="w-full max-w-md rounded-lg shadow-lg" />
                <button
                  onClick={() => setShowCoverUpload(true)}
                  className="btn btn-outline btn-sm gap-2"
                >
                  <IconUpload size={16} />
                  Cambiar Portada
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <FilePond
                  files={coverFiles}
                  onupdatefiles={setCoverFiles}
                  allowMultiple={false}
                  maxFiles={1}
                  acceptedFileTypes={['image/*']}
                  labelIdle='Arrastra una imagen o <span class="filepond--label-action">Examinar</span>'
                  credits={false}
                />
                {coverFiles.length > 0 && (
                  <button
                    onClick={handleUploadCover}
                    disabled={uploadingCover}
                    className="btn btn-primary text-white btn-sm gap-2"
                  >
                    {uploadingCover ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <IconUpload size={16} />
                        Subir Portada
                      </>
                    )}
                  </button>
                )}
                {coverImage && (
                  <button
                    onClick={() => setShowCoverUpload(false)}
                    className="btn btn-ghost btn-sm"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="divider"></div>

          {/* Ponentes de la Lección */}
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <IconBook size={24} />
              Ponentes de esta Lección
            </h2>
            {/* Campo de búsqueda */}
            <div className="form-control mb-2">
              <input
                type="text"
                placeholder="Buscar ponente por nombre o email..."
                value={speakerSearchTerm}
                onChange={(e) => setSpeakerSearchTerm(e.target.value)}
                className="input input-bordered input-sm"
              />
            </div>
            <div className="border border-base-300 rounded-lg p-4 max-h-60 overflow-y-auto">
              {speakers.length === 0 ? (
                <p className="text-sm text-base-content/60">Cargando ponentes...</p>
              ) : filteredSpeakers.length === 0 ? (
                <p className="text-sm text-base-content/60">No se encontraron ponentes</p>
              ) : (
                <div className="space-y-2">
                  {filteredSpeakers.map(speaker => (
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
                        onChange={() => {
                          setSelectedSpeakers(prev =>
                            prev.includes(speaker.id)
                              ? prev.filter(id => id !== speaker.id)
                              : [...prev, speaker.id]
                          );
                        }}
                        className="toggle toggle-error toggle-lg"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label className="label">
              <span className="label-text-alt">
                Selecciona los ponentes que impartirán esta lección específica
              </span>
            </label>
          </div>

          {/* Co-Hosts de la Lección */}
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <IconBook size={24} />
              Co-Hosts (Maestros de Ceremonia)
            </h2>
            {/* Campo de búsqueda */}
            <div className="form-control mb-2">
              <input
                type="text"
                placeholder="Buscar co-host por nombre o email..."
                value={coHostSearchTerm}
                onChange={(e) => setCoHostSearchTerm(e.target.value)}
                className="input input-bordered input-sm"
              />
            </div>
            <div className="border border-base-300 rounded-lg p-4 max-h-60 overflow-y-auto">
              {speakers.length === 0 ? (
                <p className="text-sm text-base-content/60">Cargando ponentes...</p>
              ) : filteredCoHosts.length === 0 ? (
                <p className="text-sm text-base-content/60">No se encontraron ponentes</p>
              ) : (
                <div className="space-y-2">
                  {filteredCoHosts.map(speaker => (
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
                        onChange={() => {
                          setSelectedCoHosts(prev =>
                            prev.includes(speaker.id)
                              ? prev.filter(id => id !== speaker.id)
                              : [...prev, speaker.id]
                          );
                        }}
                        className="toggle toggle-secondary toggle-lg"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label className="label">
              <span className="label-text-alt">
                Co-hosts pueden unirse a la conferencia pero no aparecen como ponentes principales. Ideal para maestros de ceremonia que leen la semblanza al inicio y final.
              </span>
            </label>
          </div>

          <div className="divider"></div>

          {/* Encuestas */}
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <IconClipboardList size={24} />
              Encuestas de la Lección
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Encuesta de entrada */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Encuesta de entrada</span>
                </label>
                <select
                  value={selectedEntrySurvey}
                  onChange={(e) => setSelectedEntrySurvey(e.target.value)}
                  className="select select-bordered"
                >
                  <option value="">Sin encuesta de entrada</option>
                  {surveys.map(survey => (
                    <option key={survey.id} value={survey.id}>
                      {survey.title}
                    </option>
                  ))}
                </select>
                <label className="label">
                  <span className="label-text-alt">
                    Se mostrará antes de iniciar la lección
                  </span>
                </label>
              </div>

              {/* Encuesta de salida */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Encuesta de salida</span>
                </label>
                <select
                  value={selectedExitSurvey}
                  onChange={(e) => setSelectedExitSurvey(e.target.value)}
                  className="select select-bordered"
                >
                  <option value="">Sin encuesta de salida</option>
                  {surveys.map(survey => (
                    <option key={survey.id} value={survey.id}>
                      {survey.title}
                    </option>
                  ))}
                </select>
                <label className="label">
                  <span className="label-text-alt">
                    Se mostrará al finalizar la lección
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="divider"></div>

          {/* Recursos */}
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <IconFileText size={24} />
              Archivos y Recursos
            </h2>

            {/* Mostrar solo recursos vinculados */}
            {selectedResources.length === 0 ? (
              <div className="text-center py-8 bg-base-200 rounded-lg">
                <IconFileText size={48} className="mx-auto mb-4 text-base-content/40" />
                <p className="text-base-content/70 mb-4">No hay recursos vinculados a esta lección</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="btn btn-primary text-white gap-2"
                  >
                    <IconUpload size={20} />
                    Subir Archivo
                  </button>
                  <button
                    onClick={handleOpenSearchModal}
                    className="btn btn-outline gap-2"
                  >
                    <IconSearch size={20} />
                    Buscar en Recursos Existentes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {allResources
                  .filter(resource => selectedResources.includes(resource.id))
                  .map(resource => (
                    <div
                      key={resource.id}
                      className="flex items-center gap-3 p-3 bg-base-200 rounded-lg"
                    >
                      <IconFileText size={24} className="text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{resource.title}</div>
                        <div className="text-sm text-base-content/60 truncate">{resource.fileName}</div>
                      </div>
                      <button
                        onClick={() => toggleResource(resource.id)}
                        className="btn btn-sm btn-error btn-outline gap-1"
                      >
                        <IconX size={16} />
                        Quitar
                      </button>
                    </div>
                  ))}
              </div>
            )}

            <label className="label">
              <span className="label-text-alt">
                Estos archivos estarán disponibles para los estudiantes en esta lección
              </span>
            </label>
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-outline btn-sm gap-2"
            >
              <IconUpload size={16} />
              Subir Archivo
            </button>
            <button
              onClick={handleOpenSearchModal}
              className="btn btn-outline btn-sm gap-2"
            >
              <IconSearch size={16} />
              Buscar en Recursos Existentes
            </button>
          </div>

          <div className="divider"></div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn btn-ghost"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary text-white gap-2"
              disabled={saving || !title}
            >
              {saving ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Guardando...
                </>
              ) : (
                <>
                  <IconDeviceFloppy size={20} />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de subida de archivos */}
      {showUploadModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Subir Archivo</h3>
            
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Título del recurso *</span>
              </label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="input input-bordered"
                placeholder="Ej: Material de apoyo - Tema 1"
              />
            </div>

            <div className="mb-4">
              <label className="label">
                <span className="label-text font-semibold">Archivo *</span>
              </label>
              <FilePond
                files={filePondFiles}
                onupdatefiles={setFilePondFiles}
                allowMultiple={false}
                maxFiles={1}
                maxFileSize="50MB"
                labelIdle='Arrastra y suelta tu archivo o <span class="filepond--label-action">Examinar</span>'
                labelFileProcessing="Preparando"
                labelFileProcessingComplete="Listo"
                labelFileProcessingAborted="Cancelado"
                labelFileProcessingError="Error"
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
              />
            </div>

            <div className="alert alert-info mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span className="text-sm">El archivo se subirá y se vinculará automáticamente a esta lección.</span>
            </div>

            <div className="modal-action">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setFilePondFiles([]);
                  setUploadTitle('');
                }}
                className="btn btn-ghost"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleUploadResource}
                className="btn btn-primary text-white gap-2"
                disabled={uploading || !filePondFiles.length || !uploadTitle.trim()}
              >
                {uploading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Subiendo...
                  </>
                ) : (
                  <>
                    <IconUpload size={20} />
                    Subir y Vincular
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => !uploading && setShowUploadModal(false)}>
            <button>close</button>
          </div>
        </div>
      )}

      {/* Modal de Búsqueda de Recursos */}
      {showSearchModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-2xl mb-4">Buscar en Recursos Existentes</h3>

            {/* Barra de búsqueda y filtros */}
            <div className="space-y-3 mb-4">
              {/* Búsqueda */}
              <div className="form-control">
                <div className="input-group">
                  <span className="bg-base-200">
                    <IconSearch size={20} />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o archivo..."
                    className="input input-bordered w-full"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </div>
              </div>

              {/* Filtros y ordenamiento */}
              <div className="flex flex-wrap gap-2">
                <select
                  className="select select-bordered select-sm"
                  value={filterType}
                  onChange={(e) => handleFilterChange(e.target.value)}
                >
                  <option value="all">Todos los tipos</option>
                  <option value="pdf">PDF</option>
                  <option value="image">Imágenes</option>
                  <option value="video">Videos</option>
                  <option value="document">Documentos</option>
                </select>

                <button
                  onClick={() => handleSortChange('name')}
                  className={`btn btn-sm gap-1 ${sortBy === 'name' ? 'btn-primary text-white' : 'btn-outline'}`}
                >
                  {sortBy === 'name' && sortOrder === 'asc' ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />}
                  Nombre
                </button>

                <button
                  onClick={() => handleSortChange('date')}
                  className={`btn btn-sm gap-1 ${sortBy === 'date' ? 'btn-primary text-white' : 'btn-outline'}`}
                >
                  {sortBy === 'date' && sortOrder === 'asc' ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />}
                  Fecha
                </button>

                <div className="badge badge-lg ml-auto">
                  {tempSelectedResources.length} seleccionado(s)
                </div>
              </div>
            </div>

            {/* Lista de recursos */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {filteredResources.length === 0 ? (
                <div className="text-center py-8">
                  <IconFileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-base-content/70">No se encontraron recursos</p>
                </div>
              ) : (
                filteredResources.map((resource) => (
                  <div
                    key={resource.id}
                    className={`flex items-start gap-3 p-4 rounded-lg transition-all ${
                      tempSelectedResources.includes(resource.id)
                        ? 'bg-error/10 border-2 border-error'
                        : 'bg-base-200 border-2 border-transparent hover:bg-base-300'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{resource.title}</div>
                      <div className="text-sm text-base-content/60 truncate">{resource.fileName}</div>
                      <div className="flex gap-2 mt-2">
                        <span className="badge badge-sm">{resource.fileType}</span>
                        {resource.fileSize && (
                          <span className="badge badge-sm badge-ghost">
                            {(resource.fileSize / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                        {resource.createdAt && (
                          <span className="badge badge-sm badge-ghost">
                            {new Date(resource.createdAt).toLocaleDateString('es-MX')}
                          </span>
                        )}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={tempSelectedResources.includes(resource.id)}
                      onChange={() => toggleTempResource(resource.id)}
                      className="toggle toggle-error toggle-lg"
                    />
                  </div>
                ))
              )}
            </div>

            {/* Botones de acción */}
            <div className="modal-action">
              <button
                onClick={() => setShowSearchModal(false)}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplySelection}
                className="btn btn-primary text-white gap-2"
              >
                <IconCheck size={20} />
                Aplicar Selección ({tempSelectedResources.length})
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowSearchModal(false)}>
            <button>close</button>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Actualización */}
      {showSuccessModal && (
        <div className="modal modal-open">
          <div className="modal-box text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-success p-3">
                <IconCheck size={48} className="text-white" />
              </div>
            </div>
            <h3 className="font-bold text-2xl mb-2">¡Lección Actualizada!</h3>
            <p className="text-base-content/70 mb-6">
              Los cambios se han guardado exitosamente.
            </p>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.back();
              }}
              className="btn btn-primary text-white w-full"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
