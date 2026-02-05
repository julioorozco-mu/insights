'use client';

import React, { useState, useEffect } from 'react';
import {
  IconLoader2,
  IconCheck,
  IconX,
  IconStar,
  IconThumbUp,
  IconNote,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface QuizOption {
  label: string;
  value: string;
  imageUrl?: string;
  isCorrect?: boolean;
}

interface QuizQuestion {
  id: string;
  type: string;
  questionText: string;
  options?: QuizOption[];
  correctAnswer?: string | string[];
  isRequired?: boolean;
}

interface QuizData {
  id: string;
  title: string;
  description?: string;
  type: string;
  questions: QuizQuestion[];
}

export interface QuizBlockProps {
  quizId?: string;
  quizTitle?: string;
  courseId: string;
  lessonId?: string;
  subsectionIndex?: number;
  totalSubsections?: number;
  onProgressUpdate?: (subsectionIndex: number, isCompleted: boolean) => void;
  onQuizScoreUpdate?: (
    lessonId: string,
    subsectionIndex: number,
    score: { correct: number; total: number } | null
  ) => void;
  userId?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function getFeedbackMessage(correctAnswers: number): {
  title: string;
  message: string;
  type: 'low' | 'medium' | 'high'
} {
  if (correctAnswers <= 4) {
    return {
      title: 'Necesitas reforzar',
      message: 'Los resultados indican que todavía hay dudas importantes sobre los conceptos de democracia, ciudadanía y ciudadanía universitaria. Se recomienda releer las definiciones básicas, revisar los recursos digitales y regresar al mapa conceptual para reforzar la comprensión antes de avanzar.',
      type: 'low'
    };
  } else if (correctAnswers <= 7) {
    return {
      title: 'Buen progreso',
      message: 'Se reconoce un dominio intermedio de los conceptos; hay una base, pero aún existen áreas por clarificar. Es conveniente revisar con atención las preguntas falladas y contrastarlas con ejemplos concretos de la vida universitaria para fortalecer la comprensión.',
      type: 'medium'
    };
  } else {
    return {
      title: '¡Excelente trabajo!',
      message: 'Los resultados muestran una comprensión adecuada de los conceptos básicos, lo que permite avanzar al siguiente tema con confianza. Se sugiere seguir conectando estas ideas con experiencias reales de participación y ejercicios de ciudadanía universitaria.',
      type: 'high'
    };
  }
}

function getQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'single_choice': 'Selección única',
    'multiple_choice': 'Selección múltiple',
    'short_text': 'Respuesta corta',
    'long_text': 'Respuesta larga',
    'dropdown': 'Desplegable',
    'quiz': 'Quiz',
  };
  return labels[type] || type;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function QuizBlock({
  quizId,
  quizTitle,
  courseId,
  lessonId,
  subsectionIndex,
  totalSubsections,
  onProgressUpdate,
  onQuizScoreUpdate,
  userId,
}: QuizBlockProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    if (!quizId) {
      setLoading(false);
      setError("No se encontró el ID del quiz");
      return;
    }

    const loadQuiz = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/student/getSurvey?surveyId=${quizId}&courseId=${courseId}`);
        if (!res.ok) throw new Error('Error al cargar el quiz');

        const data = await res.json();
        const survey = data.survey;

        if (survey) {
          const quizData: QuizData = {
            id: survey.id,
            title: survey.title,
            description: survey.description,
            type: survey.type,
            questions: survey.questions || [],
          };
          setQuiz(quizData);

          // Cargar respuestas guardadas si existen
          if (userId && survey.id) {
            try {
              const savedAnswersRes = await fetch(
                `/api/student/getQuizResponse?surveyId=${survey.id}&userId=${userId}`
              );
              if (savedAnswersRes.ok) {
                const savedData = await savedAnswersRes.json();
                if (savedData.response && savedData.response.answers) {
                  // Restaurar respuestas guardadas
                  const savedAnswers: Record<string, string | string[]> = {};
                  savedData.response.answers.forEach((ans: { questionId: string; answer: string | string[] }) => {
                    savedAnswers[ans.questionId] = ans.answer;
                  });
                  setAnswers(savedAnswers);

                  // Si hay respuestas guardadas, marcar como enviado y calcular score
                  if (Object.keys(savedAnswers).length > 0) {
                    setSubmitted(true);
                    setShowResults(true);

                    // Calcular score
                    let correctCount = 0;
                    quizData.questions.forEach((q) => {
                      const userAnswer = savedAnswers[q.id];
                      if (q.options && q.options.some((o) => o.isCorrect)) {
                        const correctOptions = q.options.filter((o) => o.isCorrect).map((o) => o.value);
                        if (q.type === 'multiple_choice') {
                          const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
                          if (correctOptions.length === userAnswers.length &&
                            correctOptions.every((c: string) => userAnswers.includes(c))) {
                            correctCount++;
                          }
                        } else {
                          if (correctOptions.includes(userAnswer as string)) {
                            correctCount++;
                          }
                        }
                      } else if (q.correctAnswer) {
                        if (Array.isArray(q.correctAnswer)) {
                          if (Array.isArray(userAnswer) &&
                            userAnswer.length === q.correctAnswer.length &&
                            userAnswer.every((a: string) => q.correctAnswer?.includes(a))) {
                            correctCount++;
                          }
                        } else if (userAnswer === q.correctAnswer) {
                          correctCount++;
                        }
                      }
                    });
                    setScore({ correct: correctCount, total: quizData.questions.length });

                    if (onQuizScoreUpdate && lessonId && subsectionIndex !== undefined) {
                      onQuizScoreUpdate(lessonId, subsectionIndex, {
                        correct: correctCount,
                        total: quizData.questions.length,
                      });
                    }

                    // Solo actualizar progreso si el quiz fue APROBADO (≥60%)
                    const percentage = correctCount / quizData.questions.length;
                    const isQuizPassed = percentage >= 0.6;

                    if (isQuizPassed && onProgressUpdate && subsectionIndex !== undefined && totalSubsections !== undefined) {
                      const isLastSubsection = subsectionIndex === totalSubsections - 1;
                      setTimeout(() => {
                        onProgressUpdate(subsectionIndex, isLastSubsection);
                      }, 100);
                    }
                  }
                }
              }
            } catch (err) {
              console.error('Error loading saved answers:', err);
            }
          }
        } else {
          setError('Quiz no encontrado');
        }
      } catch (err) {
        console.error("Error loading quiz:", err);
        setError(err instanceof Error ? err.message : "Error al cargar el quiz");
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [quizId, courseId, userId, lessonId, subsectionIndex, totalSubsections, onProgressUpdate, onQuizScoreUpdate]);

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!quiz || !quizId || !userId) return;

    setSavingAnswers(true);

    try {
      // Calcular score
      let correctCount = 0;
      quiz.questions.forEach(q => {
        const userAnswer = answers[q.id];

        // Verificar usando isCorrect en las opciones
        if (q.options && q.options.some(o => o.isCorrect)) {
          const correctOptions = q.options.filter(o => o.isCorrect).map(o => o.value);

          if (q.type === 'multiple_choice') {
            const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
            if (correctOptions.length === userAnswers.length &&
              correctOptions.every(c => userAnswers.includes(c))) {
              correctCount++;
            }
          } else {
            if (correctOptions.includes(userAnswer as string)) {
              correctCount++;
            }
          }
        } else if (q.correctAnswer) {
          if (Array.isArray(q.correctAnswer)) {
            if (Array.isArray(userAnswer) &&
              userAnswer.length === q.correctAnswer.length &&
              userAnswer.every(a => q.correctAnswer?.includes(a))) {
              correctCount++;
            }
          } else if (userAnswer === q.correctAnswer) {
            correctCount++;
          }
        }
      });

      // Preparar respuestas para guardar
      const answersToSave = quiz.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || '',
      }));

      // Guardar respuestas en la base de datos
      const saveRes = await fetch('/api/student/submitQuiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: quizId,
          courseId,
          lessonId: lessonId || null,
          answers: answersToSave,
        }),
      });

      if (!saveRes.ok) {
        console.error('Error saving quiz answers');
      }

      setScore({ correct: correctCount, total: quiz.questions.length });
      setSubmitted(true);
      setShowResults(true);
      setShowFeedbackModal(true);

      if (onQuizScoreUpdate && lessonId && subsectionIndex !== undefined) {
        onQuizScoreUpdate(lessonId, subsectionIndex, {
          correct: correctCount,
          total: quiz.questions.length,
        });
      }

      // Actualizar progreso solo si el quiz fue APROBADO (≥60%)
      const quizPercentage = correctCount / quiz.questions.length;
      const quizPassed = quizPercentage >= 0.6;

      if (quizPassed && onProgressUpdate && subsectionIndex !== undefined && totalSubsections !== undefined) {
        const isLastSubsection = subsectionIndex === totalSubsections - 1;
        onProgressUpdate(subsectionIndex, isLastSubsection);
      }
    } catch (err) {
      console.error('Error submitting quiz:', err);
    } finally {
      setSavingAnswers(false);
    }
  };

  const handleRetry = async () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    setShowResults(false);

    if (onQuizScoreUpdate && lessonId && subsectionIndex !== undefined) {
      onQuizScoreUpdate(lessonId, subsectionIndex, null);
    }

    // Eliminar respuestas guardadas de la base de datos
    if (quizId && userId) {
      try {
        await fetch('/api/student/deleteQuizResponse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            surveyId: quizId,
            userId,
          }),
        });
      } catch (err) {
        console.error('Error deleting quiz response:', err);
      }
    }
  };

  const isCorrectAnswer = (questionId: string, optionValue: string): boolean => {
    if (!quiz) return false;
    const question = quiz.questions.find(q => q.id === questionId);
    if (!question) return false;

    const option = question.options?.find(o => o.value === optionValue);
    if (option?.isCorrect) return true;

    if (!question.correctAnswer) return false;

    if (Array.isArray(question.correctAnswer)) {
      return question.correctAnswer.includes(optionValue);
    }
    return question.correctAnswer === optionValue;
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <div className="my-6 p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
        <div className="flex items-center justify-center gap-3 text-purple-600">
          <IconLoader2 className="w-6 h-6 animate-spin" />
          <span className="font-medium">Cargando quiz...</span>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="my-6 p-6 bg-red-50 rounded-xl border border-red-200">
        <div className="flex items-center gap-3 text-red-600">
          <IconX className="w-6 h-6" />
          <span className="font-medium">{error || "No se pudo cargar el quiz"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="my-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 overflow-hidden">
      {/* Header */}
      <div className="bg-[#192170] text-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <IconCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{quiz.title || quizTitle || "Quiz"}</h3>
            {quiz.description && (
              <p className="text-white/80 text-sm mt-1">{quiz.description}</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-white/70">
          <span>{quiz.questions.length} preguntas</span>
          {score && (
            <span className="bg-white/20 px-3 py-1 rounded-full font-semibold">
              Puntuación: {score.correct}/{score.total} ({Math.round((score.correct / score.total) * 100)}%)
            </span>
          )}
        </div>
      </div>

      {/* Questions */}
      <div className="p-6 space-y-6">
        {quiz.questions.map((question, index) => (
          <div
            key={question.id}
            className={cn(
              "p-5 rounded-xl border transition-all",
              showResults && question.correctAnswer
                ? isCorrectAnswer(question.id, answers[question.id] as string)
                  ? "bg-green-50 border-green-300"
                  : "bg-red-50 border-red-300"
                : "bg-white border-gray-200"
            )}
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="w-8 h-8 bg-[#192170] text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{question.questionText}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {getQuestionTypeLabel(question.type)}
                  {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                </p>
              </div>
            </div>

            {/* Options for choice questions */}
            {['single_choice', 'multiple_choice', 'dropdown', 'quiz'].includes(question.type) && question.options && (
              <div className="space-y-2 ml-11">
                {question.options.map((option, optIndex) => {
                  const optionValue = option.value;
                  const optionLabel = option.label;

                  const isSelected = question.type === 'multiple_choice'
                    ? (answers[question.id] as string[] || []).includes(optionValue)
                    : answers[question.id] === optionValue;

                  const optionIsCorrect = option.isCorrect || isCorrectAnswer(question.id, optionValue);
                  const isSelectedAndCorrect = showResults && isSelected && optionIsCorrect;
                  const isSelectedAndWrong = showResults && isSelected && !optionIsCorrect;

                  return (
                    <label
                      key={optIndex}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                        submitted ? "cursor-default" : "hover:bg-gray-50",
                        isSelected && !showResults && "bg-purple-50 border-purple-300",
                        isSelectedAndCorrect && "bg-green-100 border-green-400",
                        isSelectedAndWrong && "bg-red-100 border-red-400",
                        !isSelected && !isSelectedAndCorrect && !isSelectedAndWrong && "border-gray-200"
                      )}
                    >
                      <input
                        type={question.type === 'multiple_choice' ? 'checkbox' : 'radio'}
                        name={question.id}
                        value={optionValue}
                        checked={isSelected}
                        disabled={submitted}
                        onChange={(e) => {
                          if (question.type === 'multiple_choice') {
                            const current = (answers[question.id] as string[]) || [];
                            if (e.target.checked) {
                              handleAnswerChange(question.id, [...current, optionValue]);
                            } else {
                              handleAnswerChange(question.id, current.filter(o => o !== optionValue));
                            }
                          } else {
                            handleAnswerChange(question.id, optionValue);
                          }
                        }}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span className={cn(
                        "flex-1",
                        isSelectedAndCorrect && "font-semibold text-green-700",
                        isSelectedAndWrong && "text-red-700"
                      )}>
                        {optionLabel}
                      </span>
                      {isSelectedAndCorrect && (
                        <IconCheck className="w-5 h-5 text-green-600" />
                      )}
                      {isSelectedAndWrong && (
                        <IconX className="w-5 h-5 text-red-600" />
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            {/* Text input for text questions */}
            {['short_text', 'long_text'].includes(question.type) && (
              <div className="ml-11">
                {question.type === 'short_text' ? (
                  <input
                    type="text"
                    value={(answers[question.id] as string) || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    disabled={submitted}
                    placeholder="Escribe tu respuesta..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50"
                  />
                ) : (
                  <textarea
                    value={(answers[question.id] as string) || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    disabled={submitted}
                    placeholder="Escribe tu respuesta..."
                    rows={4}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 resize-none"
                  />
                )}
              </div>
            )}
          </div>
        ))}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-purple-200">
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length === 0 || savingAnswers}
              className="px-6 py-3 bg-[#192170] text-white rounded-lg font-semibold hover:bg-[#141a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {savingAnswers ? (
                <>
                  <IconLoader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <IconCheck className="w-5 h-5" />
                  Enviar respuestas
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-purple-100 text-purple-700 rounded-lg font-semibold hover:bg-purple-200 transition-colors flex items-center gap-2"
            >
              Intentar de nuevo
            </button>
          )}

          {score && (() => {
            const percentage = score.correct / score.total;
            const passed = percentage >= 0.6;
            return (
              <div className={cn(
                "text-lg font-bold px-4 py-2 rounded-lg",
                passed
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              )}>
                {passed ? "¡Aprobado! " : "No aprobado - "}
                {Math.round(percentage * 100)}%
                {!passed && (
                  <span className="text-sm font-normal ml-2">
                    (Se requiere 60%)
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Modal de Retroalimentación General */}
      {showFeedbackModal && score && (() => {
        const feedback = getFeedbackMessage(score.correct);
        const bgColor = feedback.type === 'high' ? 'bg-emerald-50' : feedback.type === 'medium' ? 'bg-amber-50' : 'bg-red-50';
        const borderColor = feedback.type === 'high' ? 'border-emerald-200' : feedback.type === 'medium' ? 'border-amber-200' : 'border-red-200';
        const titleColor = feedback.type === 'high' ? 'text-emerald-700' : feedback.type === 'medium' ? 'text-amber-700' : 'text-red-700';
        const iconBgColor = feedback.type === 'high' ? 'bg-emerald-100' : feedback.type === 'medium' ? 'bg-amber-100' : 'bg-red-100';
        const iconColor = feedback.type === 'high' ? 'text-emerald-600' : feedback.type === 'medium' ? 'text-amber-600' : 'text-red-600';
        const buttonColor = feedback.type === 'high' ? 'bg-emerald-600 hover:bg-emerald-700' : feedback.type === 'medium' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700';

        return (
          <dialog className="modal modal-open">
            <div className={cn("modal-box max-w-lg", bgColor, borderColor, "border-2")}>
              <div className="flex flex-col items-center text-center">
                {/* Icono */}
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", iconBgColor)}>
                  {feedback.type === 'high' ? (
                    <IconStar className={cn("w-8 h-8", iconColor)} />
                  ) : feedback.type === 'medium' ? (
                    <IconThumbUp className={cn("w-8 h-8", iconColor)} />
                  ) : (
                    <IconNote className={cn("w-8 h-8", iconColor)} />
                  )}
                </div>

                {/* Puntuación */}
                <div className="mb-4">
                  <span className={cn("text-4xl font-bold", titleColor)}>
                    {score.correct}/{score.total}
                  </span>
                  <p className="text-gray-500 text-sm mt-1">aciertos</p>
                </div>

                {/* Título */}
                <h3 className={cn("text-xl font-bold mb-3", titleColor)}>
                  {feedback.title}
                </h3>

                {/* Mensaje */}
                <p className="text-gray-700 leading-relaxed mb-6">
                  {feedback.message}
                </p>

                {/* Botón */}
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className={cn("px-6 py-3 text-white rounded-lg font-semibold transition-colors", buttonColor)}
                >
                  Entendido
                </button>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop bg-black/50">
              <button onClick={() => setShowFeedbackModal(false)}>close</button>
            </form>
          </dialog>
        );
      })()}
    </div>
  );
}
