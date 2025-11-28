"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { IconUpload, IconVideo, IconLink } from "@tabler/icons-react";
import { collection, addDoc, Timestamp, doc, updateDoc, arrayUnion, getDocs } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function NewLessonPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Datos de la lección
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [lessonType, setLessonType] = useState<'video' | 'livestream' | 'hybrid'>('video');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleHour, setScheduleHour] = useState('12');
  const [scheduleMinute, setScheduleMinute] = useState('00');
  const [scheduleAmPm, setScheduleAmPm] = useState('PM');
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [order, setOrder] = useState(1);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
  const [selectedCoHosts, setSelectedCoHosts] = useState<string[]>([]);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
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

  useEffect(() => {
    const loadSpeakers = async () => {
      try {
        // Cargar desde la colección 'speakers' en lugar de 'users'
        const speakersSnapshot = await getDocs(collection(db, 'speakers'));
        const speakersData = speakersSnapshot.docs
          .filter(doc => {
            const data = doc.data();
            return data.isActive !== false; // Mostrar todos los ponentes activos
          })
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        setSpeakers(speakersData);
      } catch (error) {
        console.error('Error loading speakers:', error);
      }
    };

    loadSpeakers();
  }, []);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const url = URL.createObjectURL(file);
      setCoverPreview(url);
    }
  };

  const uploadCover = async (): Promise<string | null> => {
    if (!coverFile) return null;

    try {
      setUploadingCover(true);
      const timestamp = Date.now();
      const fileName = `lessons/covers/${timestamp}_${coverFile.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, coverFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error("Error uploading cover:", error);
      throw error;
    } finally {
      setUploadingCover(false);
    }
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
    
    // Crear fecha en zona horaria local y ajustar para UTC
    const year = parseInt(scheduleDate.split('-')[0]);
    const month = parseInt(scheduleDate.split('-')[1]) - 1; // Los meses en JS son 0-11
    const day = parseInt(scheduleDate.split('-')[2]);
    
    // Crear fecha local y luego ajustar para que ISO preserve el día correcto
    const localDate = new Date(year, month, day, hour24, parseInt(scheduleMinute), 0, 0);
    // getTimezoneOffset() devuelve el offset con signo invertido, así que lo restamos
    const offset = localDate.getTimezoneOffset();
    const adjustedDate = new Date(localDate.getTime() - (offset * 60000));
    
    return adjustedDate.toISOString();
  };

  const uploadVideo = async (): Promise<string | null> => {
    if (!videoFile) return null;

    try {
      setUploadingVideo(true);
      const timestamp = Date.now();
      const fileName = `lessons/videos/${timestamp}_${videoFile.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, videoFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error("Error uploading video:", error);
      throw error;
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Por favor ingresa un título para la lección');
      return;
    }

    // Validar que si es streaming externo, tenga URL
    // Ya no es obligatorio, se puede agregar después

    if (!user) return;

    try {
      setSaving(true);
      const now = new Date();

      // Si hay un video, subirlo primero
      let finalVideoUrl = videoUrl;
      if (videoFile) {
        const uploadedUrl = await uploadVideo();
        if (uploadedUrl) {
          finalVideoUrl = uploadedUrl;
        }
      }

      // Si hay una portada, subirla
      let finalCoverUrl = coverImage;
      if (coverFile) {
        const uploadedCoverUrl = await uploadCover();
        if (uploadedCoverUrl) {
          finalCoverUrl = uploadedCoverUrl;
        }
      }

      // Construir fecha y hora programada
      const scheduledDateTime = buildScheduledDateTime();

      // Crear la lección
      const lessonData = {
        courseId: params.id as string,
        title,
        description,
        content,
        type: lessonType,
        videoUrl: lessonType === 'video' || lessonType === 'hybrid' ? finalVideoUrl || null : null,
        scheduledStartTime: lessonType === 'livestream' || lessonType === 'hybrid' ? scheduledDateTime || null : null,
        scheduledDate: scheduledDateTime || null,
        isLive: false,
        liveStatus: 'idle' as const,
        durationMinutes,
        order,
        isPublished: true,
        coverImage: finalCoverUrl || null,
        speakerIds: selectedSpeakers,
        coHostIds: selectedCoHosts,
        // Configuración de streaming
        streamingType: lessonType === 'livestream' || lessonType === 'hybrid' ? streamingType : null,
        liveStreamUrl: streamingType === 'external_link' && (lessonType === 'livestream' || lessonType === 'hybrid') ? liveStreamUrl || null : null,
        recordedVideoUrl: recordedVideoUrl || null,
        createdBy: user.id,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      };

      const lessonRef = await addDoc(collection(db, 'lessons'), lessonData);

      // Actualizar el curso para agregar el ID de la lección
      await updateDoc(doc(db, 'courses', params.id as string), {
        lessonIds: arrayUnion(lessonRef.id),
        updatedAt: Timestamp.fromDate(now),
      });

      router.push(`/dashboard/courses/${params.id}`);
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Error al guardar la lección');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <button onClick={() => router.back()} className="btn btn-ghost mb-6">
        ← Volver
      </button>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="text-3xl font-bold mb-6">Nueva Lección</h1>

          {/* Tipo de Lección */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Tipo de Lección *</span>
            </label>
            <select
              value={lessonType}
              onChange={(e) => setLessonType(e.target.value as any)}
              className="select select-bordered"
            >
              <option value="video">Video Grabado</option>
              <option value="livestream">Livestream (En Vivo)</option>
              <option value="hybrid">Híbrido (Live + Grabación)</option>
            </select>
            <label className="label">
              <span className="label-text-alt">
                {lessonType === 'livestream' && 'Transmisión en vivo con Mux'}
                {lessonType === 'video' && 'Video pregrabado'}
                {lessonType === 'hybrid' && 'Transmisión en vivo que se guardará como video'}
              </span>
            </label>
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
              placeholder="Ej: Introducción a la Comunicación Política"
              className="input input-bordered"
            />
          </div>

          {/* Descripción */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Descripción</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción de la lección..."
              className="textarea textarea-bordered h-24"
            />
          </div>

          {/* Contenido */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Contenido</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Contenido detallado de la lección..."
              className="textarea textarea-bordered h-40"
            />
          </div>

          {/* Fecha programada para livestream */}
          {(lessonType === 'livestream' || lessonType === 'hybrid') && (
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Fecha y Hora Programada</span>
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
                      `${new Date(scheduleDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} ${scheduleHour}:${scheduleMinute} ${scheduleAmPm}`
                    ) : (
                      <span className="text-base-content/50">--</span>
                    )}
                  </span>
                </div>
              </div>
              
              <label className="label">
                <span className="label-text-alt">
                  Cuándo se transmitirá la clase en vivo
                </span>
              </label>
            </div>
          )}

          {/* Configuración de Streaming */}
          {(lessonType === 'livestream' || lessonType === 'hybrid') && (
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
          {(lessonType === 'livestream' || lessonType === 'hybrid') && streamingType === 'external_link' && (
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
          {(lessonType === 'livestream' || lessonType === 'hybrid') && (
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

          {/* Video (solo para tipo video o hybrid) */}
          {(lessonType === 'video' || lessonType === 'hybrid') && (
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">
                  {lessonType === 'hybrid' ? 'Video Pregrabado (Opcional)' : 'Video de la Lección'}
                </span>
              </label>

              {videoPreview && (
                <div className="mb-4">
                  <video
                    src={videoPreview}
                    controls
                    className="w-full h-64 rounded-lg border-2 border-base-300"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div
                  onClick={() => setActiveTab('upload')}
                  className={`cursor-pointer rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'upload'
                      ? 'bg-error text-white'
                      : 'bg-base-200 text-base-content hover:bg-base-300'
                  }`}
                >
                  <IconUpload size={24} />
                  <span className="font-medium text-sm">Cargar video</span>
                </div>
                <div
                  onClick={() => setActiveTab('url')}
                  className={`cursor-pointer rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'url'
                      ? 'bg-error text-white'
                      : 'bg-base-200 text-base-content hover:bg-base-300'
                  }`}
                >
                  <IconLink size={24} />
                  <span className="font-medium text-sm">URL del video</span>
                </div>
              </div>

              {activeTab === 'upload' ? (
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="file-input file-input-bordered w-full"
                />
              ) : (
                <div className="form-control">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... o https://vimeo.com/..."
                    className="input input-bordered w-full"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (urlInput.trim()) {
                        setVideoUrl(urlInput);
                        setVideoPreview(urlInput);
                      }
                    }}
                    className="btn btn-sm btn-primary text-white mt-2"
                    disabled={!urlInput.trim()}
                  >
                    Usar esta URL
                  </button>
                </div>
              )}
              <label className="label">
                <span className="label-text-alt">
                  {lessonType === 'hybrid' 
                    ? 'Opcional: Video de respaldo si no puedes hacer el livestream'
                    : 'Formatos: MP4, WebM, MOV. O usa una URL de YouTube/Vimeo'}
                </span>
              </label>
            </div>
          )}

          {/* Portada de la Lección */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Portada de la Lección</span>
            </label>
            
            {coverPreview ? (
              <div className="space-y-2">
                <img src={coverPreview} alt="Vista previa" className="w-full max-w-md rounded-lg shadow-lg" />
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreview('');
                  }}
                  className="btn btn-outline btn-sm gap-2"
                >
                  <IconUpload size={16} />
                  Cambiar Portada
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="file-input file-input-bordered w-full"
              />
            )}
            <label className="label">
              <span className="label-text-alt">
                Imagen que se mostrará como portada de la lección
              </span>
            </label>
          </div>

          {/* Ponentes de la Lección */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Ponentes de esta Lección</span>
            </label>
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
                Selecciona los ponentes que impartirán esta lección
              </span>
            </label>
          </div>

          {/* Co-Hosts de la Lección */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Co-Hosts (Maestros de Ceremonia)</span>
            </label>
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
                Selecciona los maestros de ceremonia para esta lección
              </span>
            </label>
          </div>

          {/* Alerta para livestream */}
          {lessonType === 'livestream' && (
            <div className="alert alert-info mb-4">
              <IconVideo size={24} />
              <div>
                <h3 className="font-bold">Livestream con Mux</h3>
                <div className="text-sm">
                  Después de crear la lección, podrás iniciar el livestream desde la página de la lección.
                  Se generará automáticamente una clave de transmisión para usar con OBS u otro software.
                </div>
              </div>
            </div>
          )}

          {/* Duración y Orden */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Duración (minutos)</span>
              </label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                placeholder="45"
                className="input input-bordered"
                min="0"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Orden</span>
              </label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
                placeholder="1"
                className="input input-bordered"
                min="1"
              />
              <label className="label">
                <span className="label-text-alt">Posición de la lección en el curso</span>
              </label>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => router.back()}
              className="btn btn-ghost flex-1"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary text-white flex-1"
              disabled={saving || uploadingVideo || !title.trim()}
            >
              {saving ? 'Guardando...' : uploadingVideo ? 'Subiendo video...' : 'Guardar Lección'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
