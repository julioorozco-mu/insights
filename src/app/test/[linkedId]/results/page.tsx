"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/common/Loader";
import {
  IconCheck,
  IconX,
  IconArrowRight,
  IconRefresh,
  IconTrophy,
  IconChartBar,
  IconClock,
} from "@tabler/icons-react";
import { TestQuestionOption, QUESTION_TYPE_CONFIG } from "@/types/test";

interface AnswerReview {
  questionId: string;
  questionText: string;
  questionType: string;
  options: TestQuestionOption[];
  studentAnswer: string | string[] | null;
  correctAnswer: string | string[] | null;
  isCorrect: boolean;
  pointsEarned: number;
  explanation?: string;
}

interface Results {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unanswered: number;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  timeSpent: number;
}

interface Attempt {
  id: string;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
}

export default function TestResultsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const linkedId = params.linkedId as string;
  const attemptId = searchParams.get("attemptId");
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [testTitle, setTestTitle] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [answersReview, setAnswersReview] = useState<AnswerReview[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [canRetake, setCanRetake] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(2);

  useEffect(() => {
    if (user && attemptId) {
      loadResults();
    }
  }, [user, attemptId]);

  const loadResults = async () => {
    try {
      // En un caso real, cargaríamos los resultados desde la API
      // Por ahora, simulamos con los datos del localStorage o sessionStorage
      const storedResults = sessionStorage.getItem(`test_results_${attemptId}`);
      
      if (storedResults) {
        const data = JSON.parse(storedResults);
        setResults(data.results);
        setAnswersReview(data.answersReview || []);
        setAttempt(data.attempt);
        setTestTitle(data.testTitle || "Evaluación");
        setCanRetake(data.canRetake || false);
        setRemainingAttempts(data.remainingAttempts || 0);
        setMaxAttempts(data.maxAttempts || 2);
      } else {
        // Fallback: intentar obtener de la API
        // Para esto necesitaríamos una API de resultados
        console.log("No se encontraron resultados almacenados");
      }
    } catch (error) {
      console.error("Error loading results:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRetake = () => {
    router.push(`/test/${linkedId}`);
  };

  const handleBackToDashboard = () => {
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Vista de fallback si no hay resultados
  if (!results) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <IconTrophy size={64} className="text-purple-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">¡Evaluación completada!</h1>
          <p className="text-gray-600 mb-6">
            Tu evaluación ha sido enviada correctamente.
          </p>
          <button
            onClick={handleBackToDashboard}
            className="btn btn-primary text-white"
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">{testTitle}</h1>
          <p className="text-gray-500">Resultados de tu evaluación</p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto p-8">
        {/* Results summary card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-center mb-6">
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center ${
                results.passed ? "bg-green-100" : "bg-red-100"
              }`}
            >
              {results.passed ? (
                <IconTrophy size={48} className="text-green-600" />
              ) : (
                <IconX size={48} className="text-red-600" />
              )}
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-2">
              {results.percentage.toFixed(0)}%
            </h2>
            <p
              className={`text-lg font-medium ${
                results.passed ? "text-green-600" : "text-red-600"
              }`}
            >
              {results.passed ? "¡Aprobado!" : "No aprobado"}
            </p>
            <p className="text-gray-500 mt-2">
              Respondiste correctamente {results.correctAnswers} de {results.totalQuestions} preguntas
            </p>
            {!results.passed && (
              <p className="text-gray-400 text-sm mt-2">
                Se requiere mínimo 60% para aprobar
              </p>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <IconCheck className="mx-auto mb-2 text-green-600" size={24} />
              <p className="text-2xl font-bold text-green-600">{results.correctAnswers}</p>
              <p className="text-sm text-gray-600">Correctas</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <IconX className="mx-auto mb-2 text-red-600" size={24} />
              <p className="text-2xl font-bold text-red-600">{results.incorrectAnswers}</p>
              <p className="text-sm text-gray-600">Incorrectas</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <IconClock className="mx-auto mb-2 text-blue-600" size={24} />
              <p className="text-2xl font-bold text-blue-600">
                {formatTime(results.timeSpent)}
              </p>
              <p className="text-sm text-gray-600">Tiempo</p>
            </div>
          </div>
        </div>

        {/* Answers review */}
        {answersReview.length > 0 && (
          <div className="space-y-4 mb-8">
            <h3 className="text-xl font-semibold text-gray-800">
              Revisión de respuestas
            </h3>
            
            {answersReview.map((review, index) => {
              const config = QUESTION_TYPE_CONFIG[review.questionType as keyof typeof QUESTION_TYPE_CONFIG];
              
              return (
                <div
                  key={review.questionId}
                  className={`bg-white rounded-xl p-6 border-l-4 ${
                    review.isCorrect ? "border-green-500" : "border-red-500"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        review.isCorrect ? "bg-green-100" : "bg-red-100"
                      }`}
                    >
                      {review.isCorrect ? (
                        <IconCheck size={14} className="text-green-600" />
                      ) : (
                        <IconX size={14} className="text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        Pregunta {index + 1} • {config?.labelEs || review.questionType}
                      </p>
                      <p className="text-gray-800 font-medium">{review.questionText}</p>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        review.isCorrect ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      +{review.pointsEarned} pts
                    </span>
                  </div>

                  {/* Options */}
                  {review.options && (
                    <div className="space-y-2 ml-9">
                      {review.options.map((option) => {
                        const isStudentAnswer = Array.isArray(review.studentAnswer)
                          ? review.studentAnswer.includes(option.id)
                          : review.studentAnswer === option.id;
                        const isCorrectAnswer = Array.isArray(review.correctAnswer)
                          ? review.correctAnswer.includes(option.id)
                          : review.correctAnswer === option.id;

                        return (
                          <div
                            key={option.id}
                            className={`p-3 rounded-lg border ${
                              isCorrectAnswer
                                ? "border-green-500 bg-green-50"
                                : isStudentAnswer && !isCorrectAnswer
                                ? "border-red-500 bg-red-50"
                                : "border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isCorrectAnswer && (
                                <IconCheck size={16} className="text-green-600" />
                              )}
                              {isStudentAnswer && !isCorrectAnswer && (
                                <IconX size={16} className="text-red-600" />
                              )}
                              <span className={isCorrectAnswer ? "text-green-800" : ""}>
                                {option.text}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Your answer for open ended */}
                  {review.questionType === "open_ended" && review.studentAnswer && (
                    <div className="ml-9 mt-2">
                      <p className="text-sm text-gray-500">Tu respuesta:</p>
                      <p className="text-gray-800 bg-gray-50 p-3 rounded-lg mt-1">
                        {review.studentAnswer as string}
                      </p>
                    </div>
                  )}

                  {/* Explanation */}
                  {review.explanation && (
                    <div className="mt-4 ml-9 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-1">Explicación:</p>
                      <p className="text-blue-700">{review.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Mensaje de intentos restantes */}
        {!results.passed && (
          <div className="mb-6 text-center">
            {canRetake ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 inline-block">
                <p className="text-yellow-800">
                  Tienes <span className="font-bold">{remainingAttempts}</span> intento{remainingAttempts !== 1 ? 's' : ''} restante{remainingAttempts !== 1 ? 's' : ''} de {maxAttempts}
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 inline-block">
                <p className="text-red-800">
                  Has agotado los {maxAttempts} intentos disponibles
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4">
          {canRetake && !results.passed && (
            <button
              onClick={handleRetake}
              className="btn btn-outline gap-2"
            >
              <IconRefresh size={20} />
              Reintentar evaluación ({remainingAttempts} intento{remainingAttempts !== 1 ? 's' : ''} restante{remainingAttempts !== 1 ? 's' : ''})
            </button>
          )}
          <button
            onClick={handleBackToDashboard}
            className="btn btn-primary text-white gap-2"
          >
            Continuar
            <IconArrowRight size={20} />
          </button>
        </div>
      </main>
    </div>
  );
}

