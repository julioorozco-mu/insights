"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";
import { lessonRepository } from "@/lib/repositories/lessonRepository";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { Loader } from "@/components/common/Loader";
import AgoraStream from "@/components/live/AgoraStream";
import { ChatBox } from "@/components/chat/ChatBox";
import { getUserIdForAgora } from "@/utils/agoraUtils";
import { IconVideo, IconPlayerPlay, IconLink } from "@tabler/icons-react";
import ActivePoll from "@/components/live/ActivePoll";
import { LivePoll, PollResponse, PollResults } from "@/types/poll";
import { AudienceQuestion } from "@/types/question";

interface Lesson {
  id: string;
  title: string;
  description?: string;
  type: 'video' | 'livestream' | 'hybrid';
  videoUrl?: string;
  isLive?: boolean;
  agoraChannel?: string;
  agoraAppId?: string;
  liveStatus?: 'idle' | 'active' | 'ended';
  instructorId?: string;
  streamingType?: 'agora' | 'external_link';
  liveStreamUrl?: string;
  recordedVideoUrl?: string;
  scheduledStartTime?: string;
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

// Helper para verificar si la clase ya pasó
function hasClassEnded(scheduledStartTime?: string): boolean {
  if (!scheduledStartTime) return false;
  const scheduledDate = new Date(scheduledStartTime);
  const now = new Date();
  // Considerar que la clase terminó si pasaron más de 2 horas desde el inicio programado
  const twoHoursAfter = new Date(scheduledDate.getTime() + 2 * 60 * 60 * 1000);
  return now > twoHoursAfter;
}

export default function StudentLivestreamPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [agoraToken, setAgoraToken] = useState<string | null>(null);
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [activePoll, setActivePoll] = useState<LivePoll | null>(null);
  const [pollResults, setPollResults] = useState<PollResults | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [hostNames, setHostNames] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<'chat' | 'questions'>('chat');
  const [questions, setQuestions] = useState<AudienceQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [userQuestionCount, setUserQuestionCount] = useState(0);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [showQuestionSentModal, setShowQuestionSentModal] = useState(false);
  const [lessonNotes, setLessonNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showNotesSavedModal, setShowNotesSavedModal] = useState(false);

  useEffect(() => {
    const loadLesson = async () => {
      console.log('🔵 loadLesson iniciado');
      console.log('User:', user);
      console.log('Params:', params);
      
      if (!user) {
        console.log('❌ No hay usuario, saliendo');
        return;
      }

      try {
        console.log('🔵 Cargando lección:', params.lessonId);
        const lessonData = await lessonRepository.findById(params.lessonId as string);
        if (!lessonData) {
          console.log('❌ Lección no existe');
          router.push(`/dashboard/student/courses/${params.id}`);
          return;
        }

        const mappedLesson = {
          id: lessonData.id,
          title: lessonData.title,
          description: lessonData.description,
          type: lessonData.type as 'video' | 'livestream' | 'hybrid',
          videoUrl: lessonData.videoUrl,
          isLive: lessonData.isLive,
          agoraChannel: lessonData.agoraChannel,
          agoraAppId: lessonData.agoraAppId,
          liveStatus: lessonData.liveStatus as 'idle' | 'active' | 'ended' | undefined,
          streamingType: lessonData.streamingType as 'agora' | 'external_link' | undefined,
          liveStreamUrl: lessonData.liveStreamUrl,
          recordedVideoUrl: lessonData.recordedVideoUrl,
          scheduledStartTime: lessonData.scheduledStartTime,
        } as Lesson;
        setLesson(mappedLesson);
        console.log('✅ Lección cargada');

        // Obtener el instructor del curso
        console.log('🔵 Intentando cargar curso con ID:', params.id);
        const courseData = await courseRepository.findById(params.id as string);
        console.log('✅ Curso obtenido. Existe?', !!courseData);
        
        if (courseData) {
          console.log('📦 Course data completo:', courseData);
          
          // El curso tiene speakerIds (array), tomar el primero
          let instructorIdFromCourse = null;
          
          if (courseData.speakerIds && Array.isArray(courseData.speakerIds) && courseData.speakerIds.length > 0) {
            instructorIdFromCourse = courseData.speakerIds[0];
            console.log('✅ Instructor ID obtenido de speakerIds[0]:', instructorIdFromCourse);
          } else {
            console.log('❌ No se encontró instructor ID en ningún campo');
          }
          
          console.log('✅ Instructor ID final:', instructorIdFromCourse);
          setInstructorId(instructorIdFromCourse);
        } else {
          console.log('❌ El curso NO existe');
        }

        // Si está en vivo, obtener token de Agora
        if (mappedLesson.isLive && mappedLesson.agoraChannel) {
          const numericUid = getUserIdForAgora(user.id);
          const tokenRes = await fetch(
            `/api/agora-token?channel=${lessonData.agoraChannel}&uid=${numericUid}&role=audience`
          );
          const tokenData = await tokenRes.json();
          setAgoraToken(tokenData.token);
        }
      } catch (error) {
        console.error('Error loading lesson:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLesson();
  }, [params.lessonId, params.id, user, router]);

  // Polling para actualizar estado de la lección
  useEffect(() => {
    if (!user || !params.lessonId) return;

    const pollLesson = async () => {
      const data = await lessonRepository.findById(params.lessonId as string);
      if (!data) return;
      
      const mappedData = {
        id: data.id,
        title: data.title,
        description: data.description,
        type: data.type as 'video' | 'livestream' | 'hybrid',
        videoUrl: data.videoUrl,
        isLive: data.isLive,
        agoraChannel: data.agoraChannel,
        agoraAppId: data.agoraAppId,
        liveStatus: data.liveStatus as 'idle' | 'active' | 'ended' | undefined,
        streamingType: data.streamingType as 'agora' | 'external_link' | undefined,
        liveStreamUrl: data.liveStreamUrl,
        recordedVideoUrl: data.recordedVideoUrl,
        scheduledStartTime: data.scheduledStartTime,
      } as Lesson;
      
      // Si la lección se desactiva, redirigir al estudiante
      if (lesson && lesson.isLive && !mappedData.isLive) {
        console.log('⚠️ Lección desactivada, redirigiendo...');
        router.push(`/dashboard/student/courses/${params.id}`);
        return;
      }
      
      setLesson(mappedData);

      // Si el live está activo asegúrate de tener/agregar token de audiencia
      if (mappedData.isLive && mappedData.agoraChannel) {
        if (!agoraToken) {
          const numericUid = getUserIdForAgora(user.id);
          try {
            const tokenRes = await fetch(
              `/api/agora-token?channel=${mappedData.agoraChannel}&uid=${numericUid}&role=audience`
            );
            const tokenData = await tokenRes.json();
            if (tokenData?.token) setAgoraToken(tokenData.token);
          } catch (e) {
            console.error('Error obteniendo token de audiencia:', e);
          }
        }
      } else {
        setAgoraToken(null);
      }
    };

    pollLesson();
    const interval = setInterval(pollLesson, 3000);
    return () => clearInterval(interval);
  }, [params.lessonId, user, agoraToken, lesson, router, params.id]);

  // Nombres de ponentes desde liveHosts (polling)
  useEffect(() => {
    if (!params.lessonId) return;
    
    const pollHosts = async () => {
      const { data } = await supabaseClient
        .from('live_hosts')
        .select('*')
        .eq('lesson_id', params.lessonId as string);
      
      const map: Record<number, string> = {};
      (data || []).forEach((d: any) => {
        if (typeof d?.uid === 'number') {
          map[d.uid] = d?.name || 'Ponente';
        }
      });
      setHostNames(map);
    };
    
    pollHosts();
    const interval = setInterval(pollHosts, 5000);
    return () => clearInterval(interval);
  }, [params.lessonId]);

  // Polling para encuestas activas
  useEffect(() => {
    if (!params.lessonId || !user) return;

    const pollPolls = async () => {
      const { data: pollsData } = await supabaseClient
        .from('live_polls')
        .select('*')
        .eq('lesson_id', params.lessonId as string)
        .eq('is_active', true)
        .limit(1);

      if (!pollsData || pollsData.length === 0) {
        setActivePoll(null);
        setPollResults(null);
        setHasVoted(false);
        return;
      }

      const pollDoc = pollsData[0];
      const poll: LivePoll = { 
        id: pollDoc.id, 
        lessonId: pollDoc.lesson_id,
        question: pollDoc.question,
        options: pollDoc.options,
        duration: pollDoc.duration,
        createdAt: new Date(pollDoc.created_at),
        expiresAt: new Date(pollDoc.expires_at),
        isActive: pollDoc.is_active,
        createdBy: pollDoc.created_by
      };
      setActivePoll(poll);

      // Verificar si ya votó
      const { data: votedData } = await supabaseClient
        .from('poll_responses')
        .select('id')
        .eq('poll_id', pollDoc.id)
        .eq('user_id', user.id)
        .limit(1);
      setHasVoted((votedData || []).length > 0);

      // Obtener resultados
      const { data: responsesData } = await supabaseClient
        .from('poll_responses')
        .select('*')
        .eq('poll_id', pollDoc.id);
      
      const responses = responsesData || [];
      const totalResponses = responses.length;
      const responseCounts = poll.options.map((option: string, index: number) => {
        const count = responses.filter((r: any) => r.selected_option === index).length;
        return {
          option,
          count,
          percentage: totalResponses > 0 ? (count / totalResponses) * 100 : 0
        };
      });

      setPollResults({
        pollId: pollDoc.id,
        question: poll.question,
        options: poll.options,
        totalResponses,
        responses: responseCounts,
        expiresAt: poll.expiresAt,
        isActive: poll.isActive
      });
    };

    pollPolls();
    const interval = setInterval(pollPolls, 3000);
    return () => clearInterval(interval);
  }, [params.lessonId, user]);

  // Polling para preguntas de la audiencia
  useEffect(() => {
    if (!params.lessonId) return;

    const pollQuestions = async () => {
      const { data } = await supabaseClient
        .from('audience_questions')
        .select('*')
        .eq('lesson_id', params.lessonId as string)
        .order('created_at', { ascending: false });
      
      const questionsData = (data || []).map((q: any) => ({
        id: q.id,
        lessonId: q.lesson_id,
        userId: q.user_id,
        userName: q.user_name,
        question: q.question,
        isAnswered: q.is_answered,
        createdAt: { toMillis: () => new Date(q.created_at).getTime() },
      })) as AudienceQuestion[];
      
      setQuestions(questionsData);

      // Contar preguntas del usuario actual
      if (user) {
        const userQuestions = questionsData.filter(q => q.userId === user.id);
        setUserQuestionCount(userQuestions.length);
      }
    };

    pollQuestions();
    const interval = setInterval(pollQuestions, 5000);
    return () => clearInterval(interval);
  }, [params.lessonId, user]);

  // Cargar notas del estudiante para esta lección
  useEffect(() => {
    if (!user || !params.lessonId) return;

    const loadNotes = async () => {
      try {
        console.log('Cargando notas para:', { studentId: user.id, lessonId: params.lessonId });
        
        const { data: notesData } = await supabaseClient
          .from('lesson_notes')
          .select('*')
          .eq('student_id', user.id)
          .eq('lesson_id', params.lessonId as string)
          .limit(1);
        
        console.log('Notas encontradas:', notesData?.length || 0);
        
        if (notesData && notesData.length > 0) {
          console.log('Datos de notas:', notesData[0]);
          setLessonNotes(notesData[0].notes || '');
        } else {
          console.log('No hay notas guardadas aún');
          setLessonNotes('');
        }
      } catch (error) {
        console.error('Error al cargar notas:', error);
      }
    };

    loadNotes();
  }, [user, params.lessonId]);

  // Guardar notas del estudiante
  const handleSaveNotes = async () => {
    if (!user || !lesson) return;

    setSavingNotes(true);
    try {
      console.log('Guardando notas:', { lessonNotes, lessonId: lesson.id, studentId: user.id });
      
      const { data: existingNotes } = await supabaseClient
        .from('lesson_notes')
        .select('id')
        .eq('student_id', user.id)
        .eq('lesson_id', lesson.id)
        .limit(1);

      if (!existingNotes || existingNotes.length === 0) {
        // Crear nuevo documento de notas
        console.log('Creando nuevo documento de notas');
        const { data: newDoc, error } = await supabaseClient
          .from('lesson_notes')
          .insert({
            student_id: user.id,
            student_name: user.name || 'Anónimo',
            lesson_id: lesson.id,
            course_id: params.id,
            notes: lessonNotes,
          })
          .select('id')
          .single();
        if (error) throw error;
        console.log('Notas guardadas con ID:', newDoc?.id);
      } else {
        // Actualizar notas existentes
        console.log('Actualizando notas existentes');
        const { error } = await supabaseClient
          .from('lesson_notes')
          .update({ notes: lessonNotes, updated_at: new Date().toISOString() })
          .eq('id', existingNotes[0].id);
        if (error) throw error;
        console.log('Notas actualizadas:', existingNotes[0].id);
      }
      
      // Mostrar modal de confirmación
      setShowNotesSavedModal(true);
    } catch (error) {
      console.error('Error al guardar notas:', error);
      alert('Error al guardar las notas');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleVote = async (optionIndex: number) => {
    if (!activePoll || !user || hasVoted) return;

    try {
      await supabaseClient.from('poll_responses').insert({
        poll_id: activePoll.id,
        user_id: user.id,
        user_name: user.name || 'Anónimo',
        selected_option: optionIndex,
      });

      setHasVoted(true);
    } catch (error) {
      console.error('Error al votar:', error);
      alert('Error al registrar tu voto');
    }
  };

  const handleSubmitQuestion = async () => {
    if (!user || !lesson || !newQuestion.trim() || userQuestionCount >= 3) return;

    setSubmittingQuestion(true);
    try {
      await supabaseClient.from('audience_questions').insert({
        lesson_id: lesson.id,
        user_id: user.id,
        user_name: user.name || 'Anónimo',
        question: newQuestion.trim(),
        is_answered: false,
      });

      setNewQuestion('');
      setShowQuestionSentModal(true);
    } catch (error) {
      console.error('Error al enviar pregunta:', error);
      alert('Error al enviar la pregunta');
    } finally {
      setSubmittingQuestion(false);
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
    <div className="flex flex-col max-w-7xl mx-auto w-full" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Header con botón de regresar, título y EN VIVO */}
      <div className="flex items-center justify-between p-2 border-b border-base-300 flex-shrink-0">
        <button 
          onClick={() => router.push(`/dashboard/student/courses/${params.id}`)} 
          className="btn btn-ghost"
        >
          ← Salir de la conferencia
        </button>
        
        <div className="flex-1 text-center">
          <h1 className="text-xl font-bold">{lesson.title}</h1>
          {lesson.description && (
            <p className="text-sm text-base-content/70">{lesson.description}</p>
          )}
        </div>
        
        {(lesson.isLive || (lesson.streamingType === 'external_link' && lesson.liveStreamUrl)) && !lesson.recordedVideoUrl && (
          <div className="badge badge-error gap-2 text-white font-bold whitespace-nowrap">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            EN VIVO
          </div>
        )}
      </div>

      {/* Contenido principal con altura reducida */}
      <div className={`flex-1 flex overflow-hidden ${lesson.recordedVideoUrl ? 'flex-col' : ''}`}>
        {/* Lado izquierdo - Video */}
        <div className={lesson.recordedVideoUrl ? "w-full flex-1" : "flex-1 pr-4"} style={!lesson.recordedVideoUrl ? { maxHeight: '60vh' } : {}}>
          <div className={`h-full flex flex-col ${lesson.recordedVideoUrl ? 'p-0' : 'p-4'}`}>
            <div className={`flex-1 bg-black ${lesson.recordedVideoUrl ? '' : 'rounded-lg'} overflow-hidden`}>
              {/* Mostrar video grabado si la clase ya pasó y hay recordedVideoUrl */}
              {lesson.recordedVideoUrl ? (
                /* Video grabado - siempre tiene prioridad si existe */
                (() => {
                  const youtubeId = getYouTubeVideoId(lesson.recordedVideoUrl);
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
                    <video
                      src={lesson.recordedVideoUrl}
                      controls
                      className="w-full h-full"
                    />
                  );
                })()
              ) : lesson.streamingType === 'external_link' ? (
                lesson.liveStreamUrl ? (
                  /* Streaming externo con URL (YouTube u otro) */
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
                          <p className="text-xl font-semibold mb-2">Streaming Externo</p>
                          <a 
                            href={lesson.liveStreamUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-primary text-white mt-4"
                          >
                            Abrir Streaming
                          </a>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* Streaming externo sin URL - transmisión no disponible */
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-white">
                      <IconVideo size={64} className="mx-auto mb-4 opacity-50" />
                      <p className="text-xl font-semibold mb-2">La transmisión aún no está disponible</p>
                      <p className="text-sm opacity-70">
                        El instructor aún no ha configurado el link del streaming
                      </p>
                    </div>
                  </div>
                )
              ) : lesson.isLive && lesson.agoraChannel && lesson.agoraAppId && agoraToken && user ? (
                /* Streaming nativo con Agora */
                <AgoraStream
                  channel={lesson.agoraChannel}
                  role="audience"
                  token={agoraToken}
                  uid={getUserIdForAgora(user.id)}
                  appId={lesson.agoraAppId}
                  leftPreferredUid={instructorId ? getUserIdForAgora(instructorId) : undefined}
                  hostNames={hostNames}
                />
              ) : lesson.videoUrl ? (
                /* Video pregrabado */
                <video
                  src={lesson.videoUrl}
                  controls
                  className="w-full h-full"
                />
              ) : (
                /* Sin contenido disponible */
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-white">
                    <IconVideo size={64} className="mx-auto mb-4 opacity-50" />
                    <p className="text-xl font-semibold mb-2">No hay video disponible</p>
                    {lesson.type === 'livestream' && !lesson.isLive && (
                      <p className="text-sm opacity-70">
                        El livestream aún no ha comenzado
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lado derecho - Chat y Preguntas */}
        {!lesson.recordedVideoUrl && (
          <div className="w-80 border-l border-base-300" style={!lesson.recordedVideoUrl ? { maxHeight: '60vh' } : {}}>
            {(lesson.isLive || (lesson.streamingType === 'external_link' && lesson.liveStreamUrl)) ? (
              <div className="h-full flex flex-col bg-base-100">
                {/* Tabs */}
                <div className="tabs tabs-boxed p-2 bg-base-200 border-b border-base-300">
                  <a 
                    className={`tab flex-1 ${activeTab === 'chat' ? 'bg-red-200 text-black' : ''}`}
                    onClick={() => setActiveTab('chat')}
                  >
                    Chat
                  </a>
                  <a 
                    className={`tab flex-1 font-bold relative overflow-hidden transition-all duration-500 ${
                      activeTab === 'questions' 
                        ? 'bg-red-200 text-black' 
                        : 'text-primary hover:bg-primary/10 hover:scale-105'
                    }`}
                    onClick={() => setActiveTab('questions')}
                  >
                    <span className={`relative z-10 transition-all duration-300 ${
                      activeTab !== 'questions' 
                        ? 'animate-pulse drop-shadow-sm' 
                        : ''
                    }`}>
                      Preguntar
                    </span>
                    {activeTab !== 'questions' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-50 animate-pulse" />
                    )}
                  </a>
                </div>

                {/* Contenido de tabs */}
                <div className="flex-1 overflow-hidden">
                  {activeTab === 'chat' ? (
                    <ChatBox 
                      streamId={lesson.id} 
                      instructorId={instructorId || undefined}
                      pollComponent={
                        activePoll && pollResults ? (
                          <ActivePoll
                            pollId={activePoll.id}
                            question={activePoll.question}
                            options={activePoll.options}
                            expiresAt={activePoll.expiresAt}
                            duration={activePoll.duration}
                            onVote={handleVote}
                            results={pollResults}
                            hasVoted={hasVoted}
                          />
                        ) : null
                      }
                    />
                  ) : (
                    <div className="h-full flex flex-col p-4">
                      {/* Formulario para nueva pregunta */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-sm">Haz una pregunta</h3>
                          <span className="text-xs text-base-content/60">
                            {userQuestionCount}/3
                          </span>
                        </div>
                        
                        {userQuestionCount < 3 ? (
                          <div className="space-y-2">
                            <textarea
                              value={newQuestion}
                              onChange={(e) => setNewQuestion(e.target.value)}
                              placeholder="Escribe tu pregunta aquí..."
                              className="textarea textarea-bordered w-full h-16 text-sm"
                              maxLength={500}
                            />
                            <button
                              onClick={handleSubmitQuestion}
                              disabled={!newQuestion.trim() || submittingQuestion}
                              className="btn btn-primary btn-sm w-full text-white"
                            >
                              {submittingQuestion ? 'Enviando...' : 'Enviar'}
                            </button>
                          </div>
                        ) : (
                          <div className="alert alert-warning py-2">
                            <span className="text-xs">
                              Límite de 3 preguntas alcanzado
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Lista de preguntas */}
                      <div className="flex-1 overflow-y-auto space-y-2">
                        <h4 className="font-bold text-xs mb-2 text-base-content/70">PREGUNTAS DE LA AUDIENCIA</h4>
                        {questions.length === 0 ? (
                          <div className="text-center text-xs text-base-content/60 py-8">
                            No hay preguntas aún
                          </div>
                        ) : (
                          questions.map((q) => (
                            <div 
                              key={q.id} 
                              className={`p-2 rounded-lg ${q.isAnswered ? 'bg-success/10' : 'bg-base-200'}`}
                            >
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <span className="font-semibold text-xs">{q.userName}</span>
                                {q.isAnswered && (
                                  <span className="badge badge-success badge-xs text-white">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-base-content/80 mb-1">{q.question}</p>
                              {(q as any).response && (
                                <div className="mt-1 p-1 bg-primary/10 rounded text-xs">
                                  <p className="font-semibold text-primary">Respuesta:</p>
                                  <p className="text-base-content/80">{(q as any).response}</p>
                                </div>
                              )}
                              <span className="text-xs text-base-content/50">
                                {q.createdAt?.toDate().toLocaleTimeString('es-MX', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-4">
                <div className="text-center">
                  <h3 className="font-bold mb-2">Chat en Vivo</h3>
                  <div className="alert alert-info">
                    <span className="text-sm">
                      Disponible cuando inicie la transmisión
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sección de Notas - Solo visible cuando hay video grabado */}
      {lesson.recordedVideoUrl && (
        <div className="p-2 border-t border-base-300 bg-base-100 overflow-y-auto flex-shrink-0" style={{ height: '150px' }}>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-sm font-bold mb-2">Notas del Curso</h2>
            <div className="form-control">
              <label className="label py-0">
                <span className="label-text text-xs">Agrega tus notas personales de esta lección</span>
              </label>
              <textarea
                value={lessonNotes}
                onChange={(e) => setLessonNotes(e.target.value)}
                placeholder="Escribe aquí tus notas, observaciones o puntos importantes..."
                className="textarea textarea-bordered h-16 text-xs resize-none"
                maxLength={5000}
              />
              <label className="label py-0">
                <span className="label-text-alt text-base-content/60 text-xs">
                  {lessonNotes.length}/5000 caracteres
                </span>
              </label>
            </div>
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="btn btn-primary btn-sm text-white mt-1"
            >
              {savingNotes ? 'Guardando...' : 'Guardar Notas'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Notas Guardadas */}
      {showNotesSavedModal && (
        <div className="modal modal-open">
          <div className="modal-box text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-success p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="font-bold text-2xl mb-2">¡Notas Guardadas!</h3>
            <p className="text-base-content/70 mb-6">
              Tus notas han sido guardadas correctamente. Puedes seguir editándolas en cualquier momento.
            </p>
            <button
              onClick={() => setShowNotesSavedModal(false)}
              className="btn btn-primary text-white w-full"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal de Pregunta Enviada */}
      {showQuestionSentModal && (
        <div className="modal modal-open">
          <div className="modal-box text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-success p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="font-bold text-2xl mb-2">¡Pregunta Enviada!</h3>
            <p className="text-base-content/70 mb-6">
              Tu pregunta ha sido enviada al ponente. Podrás ver la respuesta aquí cuando sea contestada.
            </p>
            <button
              onClick={() => setShowQuestionSentModal(false)}
              className="btn btn-primary text-white w-full"
            >
              Entendido
            </button>
          </div>
          <div className="modal-backdrop" onClick={() => setShowQuestionSentModal(false)}>
            <button>close</button>
          </div>
        </div>
      )}
    </div>
  );
}
