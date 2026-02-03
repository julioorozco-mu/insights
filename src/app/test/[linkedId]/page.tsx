"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/common/Loader";
import {
  IconMenu2,
  IconChevronLeft,
  IconChevronRight,
  IconAlertTriangle,
  IconClock,
  IconCheck,
} from "@tabler/icons-react";
import { Test, TestQuestion, CompletedTest, TestQuestionOption, QUESTION_TYPE_CONFIG } from "@/types/test";

interface SavedAnswer {
  questionId: string;
  answer: string | string[] | Record<string, string>;
}

export default function TakeTestPage() {
  const router = useRouter();
  const params = useParams();
  const linkedId = params.linkedId as string;
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [attempt, setAttempt] = useState<CompletedTest | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SavedAnswer>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  
  // Timer
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Iniciar test
  useEffect(() => {
    if (user) {
      startTest();
    }
  }, [user]);

  // Timer effect
  useEffect(() => {
    if (!attempt || !test) return;

    timerRef.current = setInterval(() => {
      if (test.timeMode === "timed" && timeRemaining !== null) {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 0) {
            // Tiempo agotado - auto-submit
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      } else {
        // Tiempo libre - contar hacia arriba
        setTimeElapsed((prev) => prev + 1);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [attempt, test, timeRemaining]);

  const startTest = async () => {
    if (!user) return;

    try {
      const res = await fetch(`/api/student/tests/${linkedId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: user.id }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Error al iniciar la evaluación");
        router.push("/dashboard");
        return;
      }

      const data = await res.json();
      setTest(data.test);
      setQuestions(data.test.questions || []);
      setAttempt(data.attempt);
      
      // Cargar respuestas guardadas
      if (data.savedAnswers) {
        const savedMap: Record<string, SavedAnswer> = {};
        data.savedAnswers.forEach((sa: any) => {
          savedMap[sa.questionId] = {
            questionId: sa.questionId,
            answer: sa.answer,
          };
        });
        setAnswers(savedMap);
      }

      // Configurar timer
      if (data.remainingTime !== null) {
        setTimeRemaining(data.remainingTime);
      }
    } catch (error) {
      console.error("Error starting test:", error);
      alert("Error al cargar la evaluación");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { questionId, answer },
    }));
  };

  const handleAutoSubmit = useCallback(async () => {
    if (submitting) return;
    await handleSubmit(true);
  }, [submitting]);

  const handleSubmit = async (autoSubmit = false) => {
    if (!user || !attempt) return;

    if (!autoSubmit) {
      const unanswered = questions.filter(q => !answers[q.id]);
      if (unanswered.length > 0) {
        const confirm = window.confirm(
          `Tienes ${unanswered.length} pregunta(s) sin responder. ¿Deseas enviar de todas formas?`
        );
        if (!confirm) return;
      }
    }

    setSubmitting(true);
    try {
      const answersArray = Object.values(answers).map(a => ({
        questionId: a.questionId,
        answer: a.answer,
      }));

      const res = await fetch(`/api/student/tests/${linkedId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user.id,
          answers: answersArray,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Error al enviar la evaluación");
        return;
      }

      const data = await res.json();
      
      // Guardar resultados en sessionStorage para la página de resultados
      sessionStorage.setItem(`test_results_${attempt.id}`, JSON.stringify({
        results: data.results,
        answersReview: data.answersReview || [],
        attempt: data.attempt,
        testTitle: data.testTitle || test?.title || "Evaluación",
        canRetake: data.canRetake || false,
        maxAttempts: data.maxAttempts || 2,
        remainingAttempts: data.remainingAttempts || 0,
      }));
      
      // Redirigir a resultados
      router.push(`/test/${linkedId}/results?attemptId=${attempt.id}`);
    } catch (error) {
      console.error("Error submitting test:", error);
      alert("Error al enviar la evaluación");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExit = () => {
    setShowExitModal(true);
  };

  const confirmExit = () => {
    router.push("/dashboard");
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getQuestionStatus = (index: number): "current" | "answered" | "pending" => {
    if (index === currentQuestionIndex) return "current";
    if (answers[questions[index]?.id]) return "answered";
    return "pending";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!test || !questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No se pudo cargar la evaluación</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?.id];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-80" : "w-0"
        } bg-[#1A2170] text-white flex flex-col transition-all duration-300 overflow-hidden flex-shrink-0`}
      >
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Header */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-6"
          >
            <IconMenu2 size={20} />
            <span className="text-sm">{sidebarOpen ? "Ocultar" : ""}</span>
          </button>

          {/* Test info */}
          <h2 className="font-semibold text-lg mb-2">{test.title}</h2>
          {test.creator && (
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                {test.creator.name?.charAt(0)}
              </div>
              <span className="text-sm text-white/70">{test.creator.name}</span>
            </div>
          )}

          {/* Questions list */}
          <div className="space-y-2">
            {questions.map((question, index) => {
              const status = getQuestionStatus(index);
              const config = QUESTION_TYPE_CONFIG[question.questionType];
              
              return (
                <button
                  key={question.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    status === "current"
                      ? "bg-purple-100 text-gray-800 border-l-4 border-purple-500"
                      : status === "answered"
                      ? "bg-green-100 text-gray-800"
                      : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  <div className="text-xs font-medium mb-1" style={{ color: status !== "pending" ? config.color : undefined }}>
                    Pregunta {index + 1}
                  </div>
                  <p className="text-sm line-clamp-2">{question.questionText}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Timer */}
        <div className="p-6 border-t border-white/10">
          <p className="text-xs text-white/60 mb-2">
            {test.timeMode === "timed" ? "Tiempo restante" : "Tiempo transcurrido"}
          </p>
          <div className="flex gap-1">
            {formatTime(test.timeMode === "timed" ? (timeRemaining || 0) : timeElapsed)
              .split("")
              .map((char, i) => (
                <div
                  key={i}
                  className={`${
                    char === ":" ? "px-1" : "w-8 h-10 bg-black/50 rounded flex items-center justify-center"
                  } text-xl font-mono font-bold`}
                >
                  {char}
                </div>
              ))}
          </div>
          {test.timeMode === "timed" && timeRemaining !== null && timeRemaining < 60 && (
            <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
              <IconAlertTriangle size={14} />
              ¡Tiempo casi agotado!
            </p>
          )}
        </div>
      </aside>

      {/* Botón toggle sidebar cuando está cerrado */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-4 z-50 bg-[#1A2170] text-white p-2 rounded-lg shadow-lg"
        >
          <IconMenu2 size={24} />
        </button>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b px-8 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-purple-600 font-medium">
              Pregunta {currentQuestionIndex + 1} de {questions.length}
            </p>
            <h1 className="text-lg font-semibold text-gray-800">{test.title}</h1>
          </div>
          <button
            onClick={handleExit}
            className="btn btn-ghost btn-sm"
          >
            Salir
          </button>
        </header>

        {/* Question area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            {/* Instructions */}
            {currentQuestion.questionType === "true_false" && (
              <p className="text-gray-500 mb-4">
                Selecciona &apos;Verdadero&apos; si estás de acuerdo con la afirmación o &apos;Falso&apos; si no.
              </p>
            )}

            {/* Question text */}
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              {currentQuestion.questionText}
            </h2>

            {/* Question media */}
            {currentQuestion.questionMediaUrl && (
              <div className="mb-6 rounded-xl overflow-hidden">
                <img
                  src={currentQuestion.questionMediaUrl}
                  alt="Imagen de la pregunta"
                  className="w-full max-h-96 object-cover"
                />
              </div>
            )}

            {/* Answer options */}
            {(currentQuestion.questionType === "multiple_choice" ||
              currentQuestion.questionType === "multiple_answer" ||
              currentQuestion.questionType === "true_false" ||
              currentQuestion.questionType === "poll") && (
              <div className="space-y-3">
                {(currentQuestion.options as TestQuestionOption[]).map((option) => {
                  const isSelected = currentQuestion.questionType === "multiple_answer"
                    ? Array.isArray(currentAnswer?.answer) && currentAnswer.answer.includes(option.id)
                    : currentAnswer?.answer === option.id;

                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        if (currentQuestion.questionType === "multiple_answer") {
                          const current = (currentAnswer?.answer as string[]) || [];
                          const newAnswer = current.includes(option.id)
                            ? current.filter(id => id !== option.id)
                            : [...current, option.id];
                          handleAnswerChange(currentQuestion.id, newAnswer);
                        } else {
                          handleAnswerChange(currentQuestion.id, option.id);
                        }
                      }}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "border-purple-500 bg-purple-500" : "border-gray-300"
                          }`}
                        >
                          {isSelected && <IconCheck size={12} className="text-white" />}
                        </div>
                        <span className="text-gray-800">{option.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Open ended */}
            {currentQuestion.questionType === "open_ended" && (
              <textarea
                className="textarea textarea-bordered w-full min-h-[200px]"
                placeholder="Escribe tu respuesta aquí..."
                value={(currentAnswer?.answer as string) || ""}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white border-t px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="btn btn-outline"
          >
            {submitting ? "Enviando..." : "Finalizar evaluación"}
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="btn btn-ghost"
            >
              <IconChevronLeft size={20} />
              Anterior
            </button>
            <button
              onClick={() => {
                if (currentQuestionIndex === questions.length - 1) {
                  handleSubmit();
                } else {
                  setCurrentQuestionIndex(currentQuestionIndex + 1);
                }
              }}
              className="btn btn-primary text-white"
              disabled={submitting}
            >
              {currentQuestionIndex === questions.length - 1 ? (
                submitting ? "Enviando..." : "Enviar"
              ) : (
                <>
                  Siguiente
                  <IconChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        </footer>
      </main>

      {/* Exit Modal */}
      {showExitModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-warning/20 p-4">
                <IconAlertTriangle size={48} className="text-warning" />
              </div>
            </div>
            
            <h3 className="font-bold text-xl text-center mb-2">
              ¿Abandonar evaluación?
            </h3>
            
            <div className="text-center mb-6">
              <p className="text-base-content/70 mb-2">
                Si sales ahora, perderás tu progreso actual.
              </p>
              <p className="font-medium">
                Respuestas guardadas: {Object.keys(answers).length} de {questions.length}
              </p>
            </div>
            
            <div className="modal-action justify-center">
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowExitModal(false)}
              >
                Continuar evaluación
              </button>
              <button 
                className="btn btn-error text-white"
                onClick={confirmExit}
              >
                Abandonar y salir
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowExitModal(false)}>
            <button>close</button>
          </div>
        </div>
      )}
    </div>
  );
}

