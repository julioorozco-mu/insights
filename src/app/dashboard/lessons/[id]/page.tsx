"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader } from "@/components/common/Loader";
import AgoraStream from "@/components/live/AgoraStream";
import { ChatBox } from "@/components/chat/ChatBox";
import { useAuth } from "@/hooks/useAuth";
import { getUserIdForAgora } from "@/utils/agoraUtils";
import { 
  IconVideo, 
  IconPlayerPlay, 
  IconPlayerStop,
  IconMicrophone,
  IconMicrophoneOff,
  IconCamera,
  IconCameraOff,
  IconCalendar,
  IconClock,
  IconChartBar,
  IconScreenShare,
  IconScreenShareOff,
  IconLink
} from "@tabler/icons-react";
import CreatePollModal from "@/components/live/CreatePollModal";
import PollResultsPanel from "@/components/live/PollResultsPanel";
import ScreenShareView from "@/components/live/ScreenShareView";
import { LivePoll, PollResponse, PollResults } from "@/types/poll";
import { AudienceQuestion } from "@/types/question";
import { collection, addDoc, onSnapshot, query, where, orderBy, Timestamp, updateDoc, setDoc, deleteDoc } from "firebase/firestore";

interface Lesson {
  id: string;
  title: string;
  description?: string;
  content?: string;
  type: 'video' | 'livestream' | 'hybrid';
  videoUrl?: string;
  isLive?: boolean;
  agoraChannel?: string;
  agoraAppId?: string;
  liveStatus?: 'idle' | 'active' | 'ended';
  scheduledStartTime?: string;
  durationMinutes?: number;
  createdAt: any;
  streamingType?: 'agora' | 'external_link';
  liveStreamUrl?: string;
  recordedVideoUrl?: string;
}

// Helper para extraer ID de YouTube
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // Formato youtube.com/live/VIDEO_ID
  const liveMatch = url.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
  if (liveMatch) return liveMatch[1];
  
  // Otros formatos de YouTube
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?)|(\&v=))([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[8].length === 11) ? match[8] : null;
}

export default function LessonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [streamDuration, setStreamDuration] = useState(0);
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [polls, setPolls] = useState<PollResults[]>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [screenShareToken, setScreenShareToken] = useState<string | null>(null);
  const [screenShareUid, setScreenShareUid] = useState<number | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalContent, setStatusModalContent] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const [hostsCount, setHostsCount] = useState(0);
  const [questions, setQuestions] = useState<AudienceQuestion[]>([]);
  const [activeResultsTab, setActiveResultsTab] = useState<'polls' | 'questions'>('polls');
  const [unreadQuestionsCount, setUnreadQuestionsCount] = useState(0);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<AudienceQuestion | null>(null);
  const [writtenResponse, setWrittenResponse] = useState('');
  const [showShareBlockedModal, setShowShareBlockedModal] = useState(false);
  const autoEndingRef = useRef(false);
  const autoEndArmedRef = useRef(false);
  const [hostNames, setHostNames] = useState<Record<number, string>>({});
  const [viewerToken, setViewerToken] = useState<string | null>(null);
  const [viewOnly, setViewOnly] = useState(false);

  useEffect(() => {
    if (!user || !params.id) return;

    // Listener en tiempo real para la lección
    const unsubscribe = onSnapshot(doc(db, 'lessons', params.id as string), async (lessonDoc) => {
      if (lessonDoc.exists()) {
        const lessonData = {
          id: lessonDoc.id,
          ...lessonDoc.data(),
        } as Lesson;
        setLesson(lessonData);
        
        // Si hay un canal de Agora activo, obtener token
        if (lessonData.agoraChannel && lessonData.isLive && !token) {
          const numericUid = getUserIdForAgora(user.id);
          const tokenRes = await fetch(
            `/api/agora-token?channel=${lessonData.agoraChannel}&uid=${numericUid}&role=host`
          );
          const tokenData = await tokenRes.json();
          setToken(tokenData.token);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [params.id, user]);

  // Para streaming externo, no necesitamos activar nada automáticamente
  // El instructor simplemente configura la URL y los estudiantes pueden acceder

  const canLivestream = lesson?.type === 'livestream' || lesson?.type === 'hybrid';
  const isLiveActive = lesson?.isLive && lesson?.liveStatus === 'active';

  // Listener para encuestas en tiempo real
  useEffect(() => {
    if (!params.id) return;

    const pollsQuery = query(
      collection(db, 'livePolls'),
      where('lessonId', '==', params.id),
      orderBy('createdAt', 'desc')
    );

    const responseUnsubscribers: { [key: string]: () => void } = {};

    const unsubscribe = onSnapshot(pollsQuery, (snapshot) => {
      // Limpiar listeners anteriores
      Object.values(responseUnsubscribers).forEach(unsub => unsub());

      const pollsData: PollResults[] = [];

      snapshot.docs.forEach((pollDoc) => {
        const pollData = pollDoc.data();
        const poll: LivePoll = {
          id: pollDoc.id,
          lessonId: pollData.lessonId,
          question: pollData.question,
          options: pollData.options,
          duration: pollData.duration,
          createdAt: pollData.createdAt?.toDate() || new Date(),
          expiresAt: pollData.expiresAt?.toDate() || new Date(),
          isActive: pollData.isActive,
          createdBy: pollData.createdBy
        };
        
        // Listener en tiempo real para las respuestas de esta encuesta
        const responsesQuery = query(
          collection(db, 'pollResponses'),
          where('pollId', '==', pollDoc.id)
        );
        
        responseUnsubscribers[pollDoc.id] = onSnapshot(responsesQuery, (responsesSnapshot) => {
          const responses = responsesSnapshot.docs.map((responseDoc) => responseDoc.data() as PollResponse);
          const totalResponses = responses.length;
          const responseCounts = poll.options.map((option, index) => {
            const count = responses.filter((r: PollResponse) => r.selectedOption === index).length;
            return {
              option,
              count,
              percentage: totalResponses > 0 ? (count / totalResponses) * 100 : 0
            };
          });

          setPolls((prevPolls) => {
            const otherPolls = prevPolls.filter(p => p.pollId !== pollDoc.id);
            const updatedPoll: PollResults = {
              pollId: pollDoc.id,
              question: poll.question,
              options: poll.options,
              totalResponses,
              responses: responseCounts,
              expiresAt: poll.expiresAt,
              isActive: poll.isActive
            };
            return [updatedPoll, ...otherPolls].sort((a, b) => 
              new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime()
            );
          });
        });
      });
    });

    return () => {
      unsubscribe();
      Object.values(responseUnsubscribers).forEach(unsub => unsub());
    };
  }, [params.id]);

  // Contador de tiempo de transmisión
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLiveActive && streamStartTime === null) {
      setStreamStartTime(Date.now());
    }
    
    if (isLiveActive && streamStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - streamStartTime) / 1000);
        setStreamDuration(elapsed);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLiveActive, streamStartTime]);

  const handleStartLivestream = async () => {
    try {
      setStarting(true);
      const response = await fetch(`/api/lessons/${params.id}/start-live`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
        throw new Error(data.details || data.error || 'Failed to start livestream');
      }
      
      // Obtener token de Agora
      if (user) {
        const numericUid = getUserIdForAgora(user.id);
        const tokenRes = await fetch(
          `/api/agora-token?channel=${data.channelName}&uid=${numericUid}&role=host`
        );
        const tokenData = await tokenRes.json();
        setToken(tokenData.token);
      }
      
      // Iniciar contador de tiempo
      setStreamStartTime(Date.now());
      
      // Actualizar el estado local
      setLesson(prev => prev ? {
        ...prev,
        isLive: true,
        agoraChannel: data.channelName,
        agoraAppId: data.appId,
        liveStatus: 'active',
      } : null);

      // Registrar presencia del host
      if (user) {
        const numericUid = getUserIdForAgora(user.id);
        await setDoc(doc(db, 'lessons', params.id as string, 'liveHosts', user.id), {
          uid: numericUid,
          name: user.name || 'Host',
          joinedAt: Timestamp.now(),
        }, { merge: true });
      }
    } catch (error: any) {
      console.error('Error starting livestream:', error);
      setStatusModalContent({
        type: 'error',
        title: 'Error al iniciar',
        message: error.message || 'No se pudo iniciar el livestream'
      });
      setShowStatusModal(true);
    } finally {
      setStarting(false);
    }
  };

  const handleScreenShare = async () => {
    // Bloquear si hay 2 hosts activos
    if (!isScreenSharing && hostsCount >= 2) {
      setShowShareBlockedModal(true);
      return;
    }

    if (isScreenSharing) {
      // Detener compartir pantalla
      console.log('🛑 Deteniendo compartir pantalla...');
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      // Limpiar en orden: primero stream, luego token y UID
      setScreenStream(null);
      await new Promise(resolve => setTimeout(resolve, 100));
      setScreenShareToken(null);
      setScreenShareUid(null);
      setIsScreenSharing(false);
    } else {
      // Iniciar compartir pantalla
      try {
        console.log('🎬 Solicitando permiso para compartir pantalla...');
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          // Solicitar audio del display (tab/ventana). El soporte depende del navegador/sistema.
          // En Chrome/Edge, el usuario debe marcar "Compartir audio de la pestaña" o "Compartir audio del sistema".
          audio: true
        } as DisplayMediaStreamOptions);

        console.log('✅ Permiso concedido, stream obtenido');

        // Generar token para el UID de pantalla compartida PRIMERO
        if (user && lesson?.agoraChannel) {
          const numericUid = getUserIdForAgora(user.id);
          
          // Usar convención estándar: UID de pantalla = baseUid + 1000
          const screenUid = numericUid + 1000;
          
          console.log('🔑 Generando token para pantalla compartida');
          console.log('🔑 UID de pantalla (base + 1000):', screenUid);
          
          const tokenRes = await fetch(
            `/api/agora-token?channel=${lesson.agoraChannel}&uid=${screenUid}&role=host`
          );
          const tokenData = await tokenRes.json();
          
          if (tokenData.error) {
            throw new Error(tokenData.error);
          }
          
          console.log('✅ Token generado para UID', screenUid);
          console.log('✅ Estableciendo estados...');
          
          // Establecer token y UID primero, luego stream (importante para evitar race condition)
          setScreenShareToken(tokenData.token);
          setScreenShareUid(screenUid);
          
          // Pequeño delay para asegurar que React procese el estado del token
          await new Promise(resolve => setTimeout(resolve, 50));
          
          setScreenStream(stream);
          setIsScreenSharing(true);
          
          console.log('✅ Estados establecidos: token y UID', screenUid);
        }

        // Detectar cuando el usuario detiene la compartición desde el navegador
        stream.getVideoTracks()[0].onended = () => {
          console.log('🛑 Usuario detuvo compartir pantalla desde el navegador');
          setScreenStream(null);
          setScreenShareToken(null);
          setScreenShareUid(null);
          setIsScreenSharing(false);
        };
      } catch (error) {
        console.error('❌ Error al compartir pantalla:', error);
        setStatusModalContent({
          type: 'error',
          title: 'Error al compartir pantalla',
          message: 'No se pudo iniciar la compartición de pantalla'
        });
        setShowStatusModal(true);
        // Limpiar estado en caso de error
        setScreenStream(null);
        setScreenShareToken(null);
        setScreenShareUid(null);
        setIsScreenSharing(false);
      }
    }
  };

  const handleCreatePoll = async (question: string, options: string[], duration: number) => {
    if (!user || !params.id) return;

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + duration * 1000);

      const pollData: Omit<LivePoll, 'id'> = {
        lessonId: params.id as string,
        question,
        options,
        duration,
        createdAt: now,
        expiresAt,
        isActive: true,
        createdBy: user.id
      };

      const pollRef = await addDoc(collection(db, 'livePolls'), {
        ...pollData,
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt)
      });

      console.log('✅ Encuesta creada:', pollRef.id);

      // Desactivar automáticamente después de la duración
      setTimeout(async () => {
        await updateDoc(doc(db, 'livePolls', pollRef.id), {
          isActive: false
        });
      }, duration * 1000);

    } catch (error) {
      console.error('Error creando encuesta:', error);
      setStatusModalContent({
        type: 'error',
        title: 'Error al crear encuesta',
        message: 'No se pudo crear la encuesta'
      });
      setShowStatusModal(true);
    }
  };

  const handleEndLivestream = async () => {
    try {
      setEnding(true);
      setShowEndConfirmModal(false);
      
      const response = await fetch(`/api/lessons/${params.id}/end-live`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to end livestream');
      }
      
      // Actualizar el estado local
      setLesson(prev => prev ? {
        ...prev,
        isLive: false,
        liveStatus: 'ended',
      } : null);
      
      setToken(null);
      setStreamStartTime(null);
      setStreamDuration(0);
      // Eliminar mi presencia
      if (user?.id) {
        try { await deleteDoc(doc(db, 'lessons', params.id as string, 'liveHosts', user.id)); } catch {}
      }
      setStatusModalContent({
        type: 'success',
        title: 'Livestream finalizado',
        message: 'La transmisión ha terminado correctamente.'
      });
      setShowStatusModal(true);
    } catch (error) {
      console.error('Error ending livestream:', error);
      setStatusModalContent({
        type: 'error',
        title: 'Error al finalizar',
        message: 'No se pudo finalizar el livestream correctamente'
      });
      setShowStatusModal(true);
    } finally {
      setEnding(false);
    }
  };

  const handleLeaveLivestream = async () => {
    try {
      setEnding(true);
      // Desmontar AgoraStream local
      setToken(null);
      setStreamStartTime(null);

      // Eliminar mi presencia
      if (user?.id) {
        try { await deleteDoc(doc(db, 'lessons', params.id as string, 'liveHosts', user.id)); } catch {}
      }

      // Pasar a modo espectador (audience) para seguir viendo
      if (lesson?.agoraChannel && user) {
        const numericUid = getUserIdForAgora(user.id);
        try {
          const tokenRes = await fetch(`/api/agora-token?channel=${lesson.agoraChannel}&uid=${numericUid}&role=audience`);
          const tokenData = await tokenRes.json();
          if (tokenData?.token) {
            setViewerToken(tokenData.token);
            setViewOnly(true);
          }
        } catch (e) {
          console.error('Error obteniendo token de audiencia al salir:', e);
        }
      }

      setStatusModalContent({
        type: 'success',
        title: 'Has salido del streaming',
        message: 'La transmisión continúa con el ponente restante.'
      });
      setShowStatusModal(true);
    } catch (error) {
      console.error('Error leaving livestream:', error);
    } finally {
      setEnding(false);
    }
  };

  // Suscripción a hosts activos
  useEffect(() => {
    if (!params.id) return;
    const unsub = onSnapshot(collection(db, 'lessons', params.id as string, 'liveHosts'), (snap) => {
      setHostsCount(snap.size);
      if (snap.size > 0) {
        autoEndArmedRef.current = true;
      }
      const map: Record<number, string> = {};
      snap.forEach((d) => {
        const data: any = d.data();
        if (typeof data?.uid === 'number') map[data.uid] = data?.name || 'Ponente';
      });
      setHostNames(map);
    });
    return () => unsub();
  }, [params.id]);

  // Registrar presencia al tener token (host unido)
  useEffect(() => {
    const register = async () => {
      if (!user?.id || !isLiveActive || !token) return;
      const numericUid = getUserIdForAgora(user.id);
      try {
        await setDoc(doc(db, 'lessons', params.id as string, 'liveHosts', user.id), {
          uid: numericUid,
          name: user.name || 'Host',
          joinedAt: Timestamp.now(),
        }, { merge: true });
      } catch (e) {
        console.error('Error registrando presencia:', e);
      }
    };
    register();
  }, [user?.id, token, isLiveActive, params.id]);

  // Auto finalizar cuando no queden hosts
  useEffect(() => {
    const autoEnd = async () => {
      if (hostsCount === 0 && isLiveActive && autoEndArmedRef.current && !autoEndingRef.current) {
        autoEndingRef.current = true;
        try {
          await fetch(`/api/lessons/${params.id}/end-live`, { method: 'POST' });
          setLesson(prev => prev ? { ...prev, isLive: false, liveStatus: 'ended' } : null);
          setToken(null);
          setStreamStartTime(null);
          setStreamDuration(0);
          setStatusModalContent({
            type: 'success',
            title: 'Livestream finalizado',
            message: 'La transmisión se cerró automáticamente al salir el último ponente.'
          });
          setShowStatusModal(true);
        } catch (e) {
          console.error('Auto end error:', e);
        } finally {
          autoEndingRef.current = false;
        }
      }
    };
    autoEnd();
  }, [hostsCount, isLiveActive, params.id]);

  // Si hay 2 hosts y estoy compartiendo, desactivar mi cámara para mantener máximo 2 fuentes
  useEffect(() => {
    if (hostsCount >= 2 && isScreenSharing && cameraEnabled) {
      setCameraEnabled(false);
      setStatusModalContent({
        type: 'success',
        title: 'Ajuste automático',
        message: 'Se desactivó tu cámara para mantener máximo 2 fuentes (pantalla + 1 cámara).'
      });
      setShowStatusModal(true);
    }
  }, [hostsCount, isScreenSharing]);

  // Cleanup de presencia al desmontar
  useEffect(() => {
    return () => {
      if (user?.id) {
        deleteDoc(doc(db, 'lessons', params.id as string, 'liveHosts', user.id)).catch(() => {});
      }
    };
  }, [user?.id, params.id]);

  const handleRejoinAsHost = async () => {
    try {
      if (hostsCount >= 2) {
        setStatusModalContent({
          type: 'error',
          title: 'No puedes reingresar ahora',
          message: 'Ya hay 2 ponentes activos. Espera a que salga uno para reingresar.'
        });
        setShowStatusModal(true);
        return;
      }
      if (!lesson?.agoraChannel || !user) return;
      setStarting(true);
      const numericUid = getUserIdForAgora(user.id);
      const tokenRes = await fetch(`/api/agora-token?channel=${lesson.agoraChannel}&uid=${numericUid}&role=host`);
      const tokenData = await tokenRes.json();
      if (!tokenData?.token) throw new Error('No se pudo obtener token de host');
      setToken(tokenData.token);
      setViewerToken(null);
      setViewOnly(false);
      // Registrar presencia
      await setDoc(doc(db, 'lessons', params.id as string, 'liveHosts', user.id), {
        uid: numericUid,
        name: user.name || 'Host',
        joinedAt: Timestamp.now(),
      }, { merge: true });
    } catch (e: any) {
      setStatusModalContent({
        type: 'error',
        title: 'Error al reingresar',
        message: e?.message || 'Intenta de nuevo'
      });
      setShowStatusModal(true);
    } finally {
      setStarting(false);
    }
  };

  // Cargar preguntas de la audiencia
  useEffect(() => {
    if (!params.id) return;

    const questionsQuery = query(
      collection(db, 'audienceQuestions'),
      where('lessonId', '==', params.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(questionsQuery, (snapshot) => {
      const questionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AudienceQuestion[];
      
      setQuestions(questionsData);
      
      // Contar preguntas no leídas
      const unreadCount = questionsData.filter(q => !(q as any).read).length;
      setUnreadQuestionsCount(unreadCount);
    });

    return () => unsubscribe();
  }, [params.id]);

  const handleMarkQuestionAnswered = async (questionId: string, isAnswered: boolean) => {
    try {
      await updateDoc(doc(db, 'audienceQuestions', questionId), {
        isAnswered,
        answeredAt: isAnswered ? Timestamp.now() : null
      });
    } catch (error) {
      console.error('Error al marcar pregunta:', error);
      alert('Error al actualizar la pregunta');
    }
  };

  const handleOpenQuestion = async (question: AudienceQuestion) => {
    setSelectedQuestion(question);
    setWrittenResponse('');
    setShowQuestionModal(true);
    
    // Marcar como leída
    if (!(question as any).read) {
      try {
        await updateDoc(doc(db, 'audienceQuestions', question.id), {
          read: true
        });
      } catch (error) {
        console.error('Error al marcar como leída:', error);
      }
    }
  };

  const handleSendWrittenResponse = async () => {
    if (!selectedQuestion || !writtenResponse.trim()) return;

    try {
      await updateDoc(doc(db, 'audienceQuestions', selectedQuestion.id), {
        response: writtenResponse.trim(),
        isAnswered: true,
        answeredAt: Timestamp.now()
      });
      
      setShowQuestionModal(false);
      setSelectedQuestion(null);
      setWrittenResponse('');
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
      alert('Error al enviar la respuesta');
    }
  };

  const handleMarkAsAnsweredVerbally = async () => {
    if (!selectedQuestion) return;

    try {
      await updateDoc(doc(db, 'audienceQuestions', selectedQuestion.id), {
        isAnswered: true,
        answeredAt: Timestamp.now(),
        answeredVerbally: true
      });
      
      setShowQuestionModal(false);
      setSelectedQuestion(null);
    } catch (error) {
      console.error('Error al marcar pregunta:', error);
      alert('Error al marcar la pregunta');
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

  // Formatear duración del stream
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto py-3">
      <button onClick={() => router.back()} className="btn btn-ghost btn-sm mb-3">
        ← Salir
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Video y Controles */}
        <div className="lg:col-span-2 space-y-3">
          {/* Header Compacto */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body py-2 px-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                {/* Título e info */}
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold">{lesson.title}</h1>
                  {user?.name && <span className="text-sm text-base-content/60">• {user.name}</span>}
                  {lesson.scheduledStartTime && (
                    <span className="text-sm text-base-content/60">
                      • {new Date(lesson.scheduledStartTime).toLocaleString('es-MX', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
                
                {/* Badges de estado */}
                <div className="flex items-center gap-2 flex-wrap">
                  {isLiveActive && (
                    <>
                      <div className="badge badge-error gap-2 text-white font-bold whitespace-nowrap shrink-0">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        EN VIVO
                      </div>
                      <div className="badge badge-neutral text-white font-mono whitespace-nowrap shrink-0">
                        {formatDuration(streamDuration)}
                      </div>
                    </>
                  )}
                  {isLiveActive && !micEnabled && (
                    <div className="badge badge-warning gap-1 text-white font-bold">
                      <IconMicrophoneOff size={14} />
                      MUTE
                    </div>
                  )}
                  {isLiveActive && !cameraEnabled && (
                    <div className="badge badge-warning gap-1 text-white font-bold">
                      <IconCameraOff size={14} />
                      OFF
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Video en Vivo con Agora */}
          {canLivestream && (
            <div className="card bg-base-100 shadow-xl">
              {/* Botón de activar/desactivar para streaming externo */}
              {lesson.streamingType === 'external_link' && lesson.liveStreamUrl && (
                <div className="p-4 bg-base-200 border-b border-base-300 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm">Estado de la Lección</h3>
                      <p className="text-xs text-base-content/60">
                        {lesson.isLive ? 'Los estudiantes pueden acceder al streaming en vivo' : lesson.videoUrl ? 'Los estudiantes pueden ver el video grabado' : 'Los estudiantes no pueden acceder aún'}
                      </p>
                    </div>
                    <div className="form-control">
                      <label className="label cursor-pointer gap-3 m-0 p-0">
                        <span className="label-text font-semibold text-base">{lesson.isLive ? 'En Vivo' : 'Finalizada'}</span>
                        <input 
                          type="checkbox" 
                          className="toggle toggle-success toggle-lg"
                          checked={lesson.isLive || false}
                          onChange={async (e) => {
                            try {
                              await updateDoc(doc(db, 'lessons', params.id as string), {
                                isLive: e.target.checked,
                                liveStatus: e.target.checked ? 'active' : 'idle'
                              });
                            } catch (error) {
                              console.error('Error al actualizar estado:', error);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="card-body p-0">
                <div className="aspect-video bg-base-300 rounded-t-2xl overflow-hidden relative">
                  {lesson.streamingType === 'external_link' ? (
                    lesson.liveStreamUrl ? (
                      /* Streaming externo con URL - Mostrar YouTube embed o link */
                      (() => {
                        const youtubeId = getYouTubeVideoId(lesson.liveStreamUrl);
                        if (youtubeId) {
                          return (
                            <iframe
                              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=1&disablekb=1&playsinline=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                              allowFullScreen
                              frameBorder="0"
                            />
                          );
                        }
                        return (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center text-white">
                              <IconLink size={64} className="mx-auto mb-4 opacity-50" />
                              <p className="text-xl font-semibold mb-2">Streaming Externo Activo</p>
                              <p className="text-sm opacity-70 mb-4">
                                Los estudiantes pueden ver el streaming desde la plataforma
                              </p>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      /* Streaming externo sin URL configurada */
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <IconLink size={64} className="mx-auto mb-4 opacity-50" />
                          <p className="text-xl font-semibold mb-2">Link de Streaming no configurado</p>
                          <p className="text-base-content/70 mb-4">
                            Por favor edita la lección para agregar el link del streaming
                          </p>
                        </div>
                      </div>
                    )
                  ) : isLiveActive && (token || viewerToken) && lesson.agoraChannel && lesson.agoraAppId && user ? (
                    /* Streaming nativo con Agora */
                    <AgoraStream
                      channel={lesson.agoraChannel}
                      role={token ? "host" : "audience"}
                      token={token || viewerToken!}
                      uid={getUserIdForAgora(user.id)}
                      appId={lesson.agoraAppId}
                      micEnabled={micEnabled}
                      cameraEnabled={cameraEnabled}
                      screenStream={screenStream}
                      screenShareToken={screenShareToken}
                      screenShareUid={screenShareUid}
                      hostNames={hostNames}
                    />
                  ) : (
                    /* Sin transmisión activa */
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <IconVideo size={64} className="mx-auto mb-4 opacity-50" />
                        <p className="text-xl font-semibold mb-2">
                          {isLiveActive ? 'Cargando transmisión...' : 'Transmisión no activa'}
                        </p>
                        <p className="text-base-content/70 mb-4">
                          {!isLiveActive && 'Inicia la transmisión para activar tu cámara'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controles de Transmisión */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Control de Transmisión</h2>
    
                  </div>

                  {/* Streaming Externo */}
                  {lesson.streamingType === 'external_link' ? (
                    lesson.liveStreamUrl ? (
                    /* Streaming Externo con URL - Solo mostrar encuestas */
                    <div className="space-y-4">
                      <div className="alert alert-info">
                        <IconLink size={24} />
                        <div>
                          <h3 className="font-bold text-white">Streaming Externo Configurado</h3>
                          <div className="text-sm text-white">
                            Esta lección usa un link externo para el streaming. Los estudiantes podrán acceder directamente desde la plataforma.
                          </div>
                        </div>
                      </div>
                      <a
                        href={lesson.liveStreamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary text-white gap-2 w-full"
                      >
                        <IconLink size={20} />
                        Abrir Link del Streaming
                      </a>

                      {/* Botón de encuesta para streaming externo */}
                      <button
                        onClick={() => setShowPollModal(true)}
                        className="btn btn-primary btn-sm w-full gap-2 text-white"
                      >
                        <IconChartBar size={18} />
                        Crear encuesta en vivo
                      </button>

                      {/* Tabs de Resultados y Preguntas para streaming externo */}
                      {(polls.length > 0 || questions.length > 0) && (
                        <div className="mt-4">
                          {/* Tabs */}
                          <div className="tabs tabs-boxed bg-base-200 mb-2">
                            <a 
                              className={`tab flex-1 text-xs ${activeResultsTab === 'polls' ? 'bg-red-200 text-black' : ''}`}
                              onClick={() => setActiveResultsTab('polls')}
                            >
                              Encuestas ({polls.length})
                            </a>
                            <a 
                              className={`tab flex-1 text-xs ${activeResultsTab === 'questions' ? 'bg-red-200 text-black' : ''} relative`}
                              onClick={() => setActiveResultsTab('questions')}
                            >
                              Preguntas ({questions.length})
                              {unreadQuestionsCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">
                                  {unreadQuestionsCount}
                                </span>
                              )}
                            </a>
                          </div>

                          {/* Contenido de tabs */}
                          <div className="bg-base-200 rounded-lg p-3 max-h-96 overflow-y-auto">
                            {activeResultsTab === 'polls' ? (
                              polls.length > 0 ? (
                                <PollResultsPanel polls={polls} />
                              ) : (
                                <div className="text-center text-sm text-base-content/60 py-4">
                                  No hay encuestas aún
                                </div>
                              )
                            ) : (
                              questions.length > 0 ? (
                                <div className="space-y-2">
                                  {questions.map((q) => (
                                    <div 
                                      key={q.id} 
                                      onClick={() => handleOpenQuestion(q)}
                                      className={`p-3 rounded-lg cursor-pointer hover:shadow-md transition-all ${
                                        q.isAnswered ? 'bg-success/10' : 
                                        (q as any).read ? 'bg-base-100' : 'bg-warning/10 border-2 border-warning'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <span className="font-semibold text-sm">{q.userName}</span>
                                        <div className="flex gap-1">
                                          {!(q as any).read && (
                                            <span className="badge badge-warning badge-sm">Nueva</span>
                                          )}
                                          {q.isAnswered && (
                                            <span className="badge badge-success badge-sm text-white">Respondida</span>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-sm text-base-content/80 mb-1 line-clamp-2">{q.question}</p>
                                      <span className="text-xs text-base-content/50">
                                        {q.createdAt?.toDate().toLocaleTimeString('es-MX', { 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        })}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center text-sm text-base-content/60 py-4">
                                  No hay preguntas aún
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    ) : (
                    /* Streaming Externo sin URL configurada */
                    <div className="space-y-4">
                      <div className="alert alert-warning">
                        <IconLink size={24} />
                        <div>
                          <h3 className="font-bold">Link Externo no configurado</h3>
                          <div className="text-sm">
                            Esta lección usa un link externo, pero aún no se ha configurado la URL del streaming. 
                            Por favor, edita la lección para agregar el link.
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/dashboard/lessons/${lesson.id}/edit`)}
                        className="btn btn-primary text-white gap-2 w-full"
                      >
                        Editar Lección
                      </button>
                    </div>
                    )
                  ) : !isLiveActive ? (
                    /* Streaming Nativo - Botón de iniciar */
                    <div>
                      <button
                        onClick={handleStartLivestream}
                        className="btn btn-success text-white gap-2 w-full"
                        disabled={starting}
                      >
                        <IconPlayerPlay size={20} />
                        {starting ? 'Iniciando...' : 'Iniciar Transmisión en Vivo'}
                      </button>
                    </div>
                  ) : (
                    /* Streaming Nativo Activo - Controles completos de Agora */
                    <div className="space-y-4">
                      {/* Controles en dos filas */}
                      <div className="space-y-2">
                        {/* Primera fila: Micro, Cámara, Compartir */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setMicEnabled(!micEnabled)}
                            className="btn btn-sm bg-red-500 hover:bg-red-600 text-white border-none flex-1"
                            disabled={viewOnly}
                          >
                            {micEnabled ? <IconMicrophone size={18} /> : <IconMicrophoneOff size={18} />}
                          </button>
                          <button
                            onClick={() => setCameraEnabled(!cameraEnabled)}
                            className="btn btn-sm bg-red-500 hover:bg-red-600 text-white border-none flex-1"
                            disabled={viewOnly}
                          >
                            {cameraEnabled ? <IconCamera size={18} /> : <IconCameraOff size={18} />}
                          </button>
                          <button
                            onClick={handleScreenShare}
                            className={`btn btn-sm ${isScreenSharing ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} text-white border-none flex-1`}
                            disabled={viewOnly}
                          >
                            {isScreenSharing ? <IconScreenShareOff size={18} /> : <IconScreenShare size={18} />}
                          </button>
                        </div>

                        {/* Segunda fila: Acciones de salida / finalizar / reingresar */}
                        {!viewOnly ? (
                          <button
                            onClick={hostsCount >= 2 ? handleLeaveLivestream : () => setShowEndConfirmModal(true)}
                            className="btn btn-sm bg-red-500 hover:bg-red-600 text-white border-none w-full gap-1"
                            disabled={ending}
                          >
                            <IconPlayerStop size={18} />
                            {ending ? (hostsCount >= 2 ? 'Saliendo' : 'Finalizando') : (hostsCount >= 2 ? 'Salir del streaming' : 'Finalizar streaming')}
                          </button>
                        ) : (
                          <button
                            onClick={handleRejoinAsHost}
                            className="btn btn-sm btn-primary text-white w-full gap-1"
                            disabled={starting}
                          >
                            {starting ? 'Reingresando...' : 'Reingresar al streaming'}
                          </button>
                        )}
                      </div>

                      {/* Botón de encuesta */}
                      <button
                        onClick={() => setShowPollModal(true)}
                        className="btn btn-primary btn-sm w-full gap-2 text-white"
                      >
                        <IconChartBar size={18} />
                        Crear encuesta en vivo
                      </button>

                      {/* Tabs de Resultados y Preguntas */}
                      {(polls.length > 0 || questions.length > 0) && (
                        <div className="mt-4">
                          {/* Tabs */}
                          <div className="tabs tabs-boxed bg-base-200 mb-2">
                            <a 
                              className={`tab flex-1 text-xs ${activeResultsTab === 'polls' ? 'bg-red-200 text-black' : ''}`}
                              onClick={() => setActiveResultsTab('polls')}
                            >
                              Encuestas ({polls.length})
                            </a>
                            <a 
                              className={`tab flex-1 text-xs ${activeResultsTab === 'questions' ? 'bg-red-200 text-black' : ''} relative`}
                              onClick={() => setActiveResultsTab('questions')}
                            >
                              Preguntas ({questions.length})
                              {unreadQuestionsCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">
                                  {unreadQuestionsCount}
                                </span>
                              )}
                            </a>
                          </div>

                          {/* Contenido de tabs */}
                          <div className="bg-base-200 rounded-lg p-3 max-h-96 overflow-y-auto">
                            {activeResultsTab === 'polls' ? (
                              polls.length > 0 ? (
                                <PollResultsPanel polls={polls} />
                              ) : (
                                <div className="text-center text-sm text-base-content/60 py-4">
                                  No hay encuestas aún
                                </div>
                              )
                            ) : (
                              questions.length > 0 ? (
                                <div className="space-y-2">
                                  {questions.map((q) => (
                                    <div 
                                      key={q.id} 
                                      onClick={() => handleOpenQuestion(q)}
                                      className={`p-3 rounded-lg cursor-pointer hover:shadow-md transition-all ${
                                        q.isAnswered ? 'bg-success/10' : 
                                        (q as any).read ? 'bg-base-100' : 'bg-warning/10 border-2 border-warning'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <span className="font-semibold text-sm">{q.userName}</span>
                                        <div className="flex gap-1">
                                          {!(q as any).read && (
                                            <span className="badge badge-warning badge-sm">Nueva</span>
                                          )}
                                          {q.isAnswered && (
                                            <span className="badge badge-success badge-sm text-white">Respondida</span>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-sm text-base-content/80 mb-1 line-clamp-2">{q.question}</p>
                                      <span className="text-xs text-base-content/50">
                                        {q.createdAt?.toDate().toLocaleTimeString('es-MX', { 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        })}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center text-sm text-base-content/60 py-4">
                                  No hay preguntas aún
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Video (si existe) */}
          {lesson.videoUrl && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Video</h2>
                <video
                  src={lesson.videoUrl}
                  controls
                  className="w-full rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Chat */}
        <div className="lg:col-span-1">
          {canLivestream && (isLiveActive || (lesson.streamingType === 'external_link' && lesson.liveStreamUrl)) && lesson.id ? (
            <div className="card bg-base-100 shadow-xl h-[600px]">
              <ChatBox streamId={lesson.id} instructorId={user?.id} />
            </div>
          ) : (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">Información</h3>
                <div className="space-y-4">
                  <div className="alert alert-info">
                    <span className="text-sm text-white">
                      El chat en vivo estará disponible cuando inicies la transmisión
                    </span>
                  </div>
                  
                  {lesson.scheduledStartTime && (
                    <div>
                      <p className="text-sm font-semibold mb-1">Programado para:</p>
                      <p className="text-sm text-base-content/70">
                        {new Date(lesson.scheduledStartTime).toLocaleString('es-MX', {
                          dateStyle: 'full',
                          timeStyle: 'short'
                        })}
                      </p>
                    </div>
                  )}
                  
                  {lesson.durationMinutes && (
                    <div>
                      <p className="text-sm font-semibold mb-1">Duración estimada:</p>
                      <p className="text-sm text-base-content/70">
                        {lesson.durationMinutes} minutos
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de crear encuesta */}
      <CreatePollModal
        isOpen={showPollModal}
        onClose={() => setShowPollModal(false)}
        onCreatePoll={handleCreatePoll}
      />

      {/* Modal bloqueo de compartir pantalla con 2 ponentes */}
      {showShareBlockedModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-warning">No se puede compartir pantalla</h3>
            <p className="py-4">
              Actualmente hay 2 ponentes en la videoconferencia. Para mantener la calidad, no es posible agregar una tercera fuente.
              Pide a uno de los ponentes que salga o detén tu cámara para compartir pantalla.
            </p>
            <div className="modal-action">
              <button className="btn" onClick={() => setShowShareBlockedModal(false)}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para terminar livestream */}
      {showEndConfirmModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-error">
              ¿Estás seguro de terminar el livestream?
            </h3>
            <p className="py-4">
              Esta acción finalizará la transmisión en vivo y todos los participantes serán desconectados. 
              No podrás reanudar esta sesión una vez finalizada.
            </p>
            <div className="modal-action">
              <button 
                className="btn btn-ghost"
                onClick={() => setShowEndConfirmModal(false)}
                disabled={ending}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-error text-white"
                onClick={handleEndLivestream}
                disabled={ending}
              >
                {ending ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Finalizando...
                  </>
                ) : (
                  'Sí, terminar livestream'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de estado (éxito/error) */}
      {showStatusModal && statusModalContent && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className={`font-bold text-lg ${statusModalContent.type === 'success' ? 'text-success' : 'text-error'}`}>
              {statusModalContent.title}
            </h3>
            <p className="py-4">{statusModalContent.message}</p>
            <div className="modal-action">
              <button 
                className="btn btn-primary text-white"
                onClick={() => {
                  setShowStatusModal(false);
                  setStatusModalContent(null);
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Responder Pregunta */}
      {showQuestionModal && selectedQuestion && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Pregunta de {selectedQuestion.userName}</h3>
            
            <div className="bg-base-200 p-4 rounded-lg mb-4">
              <p className="text-base-content/80">{selectedQuestion.question}</p>
              <span className="text-xs text-base-content/50 mt-2 block">
                {selectedQuestion.createdAt?.toDate().toLocaleString('es-MX')}
              </span>
            </div>

            {selectedQuestion.isAnswered && (selectedQuestion as any).response && (
              <div className="alert alert-success mb-4">
                <div>
                  <h4 className="font-bold">Respuesta enviada:</h4>
                  <p className="text-sm">{(selectedQuestion as any).response}</p>
                </div>
              </div>
            )}

            {!selectedQuestion.isAnswered && (
              <div className="space-y-4">
                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Responder por escrito</span>
                  </label>
                  <textarea
                    value={writtenResponse}
                    onChange={(e) => setWrittenResponse(e.target.value)}
                    placeholder="Escribe tu respuesta aquí..."
                    className="textarea textarea-bordered w-full h-24"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSendWrittenResponse}
                    disabled={!writtenResponse.trim()}
                    className="btn btn-primary text-white flex-1"
                  >
                    Enviar Respuesta Escrita
                  </button>
                  <button
                    onClick={handleMarkAsAnsweredVerbally}
                    className="btn btn-success text-white flex-1"
                  >
                    Marcar como Respondida Verbalmente
                  </button>
                </div>
              </div>
            )}

            <div className="modal-action">
              <button 
                className="btn btn-ghost"
                onClick={() => {
                  setShowQuestionModal(false);
                  setSelectedQuestion(null);
                  setWrittenResponse('');
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => {
            setShowQuestionModal(false);
            setSelectedQuestion(null);
            setWrittenResponse('');
          }}>
            <button>close</button>
          </div>
        </div>
      )}
    </div>
  );
}
