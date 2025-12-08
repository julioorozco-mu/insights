"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/common/Loader";
import {
  IconPlus,
  IconTrash,
  IconGripVertical,
  IconCopy,
  IconCheck,
  IconArrowLeft,
  IconDeviceFloppy,
  IconEye,
  IconPhoto,
  IconInfoCircle,
  IconX,
  IconCloudUpload,
  IconPlayerPlay,
} from "@tabler/icons-react";
import {
  CheckSquare,
  ListChecks,
  ToggleLeft,
  AlignLeft,
  BarChart2,
  ArrowUpDown,
  Link2,
  Move,
  ListOrdered,
} from "lucide-react";
import { 
  Test, 
  TestQuestion, 
  TestQuestionType,
  TestQuestionOption,
  QUESTION_TYPE_CONFIG,
  getQuestionTypeBackgroundColor,
  TestStatus,
} from "@/types/test";

// Iconos para cada tipo de pregunta
const QUESTION_TYPE_ICONS: Record<TestQuestionType, React.ElementType> = {
  multiple_choice: CheckSquare,
  multiple_answer: ListChecks,
  true_false: ToggleLeft,
  open_ended: AlignLeft,
  poll: BarChart2,
  reorder: ArrowUpDown,
  match: Link2,
  drag_drop: Move,
  sequencing: ListOrdered,
};

interface QuestionEditorProps {
  question: TestQuestion;
  index: number;
  onUpdate: (question: TestQuestion) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function QuestionEditor({ question, index, onUpdate, onDelete, onDuplicate }: QuestionEditorProps) {
  const [showExplanation, setShowExplanation] = useState(!!question.explanation);
  const config = QUESTION_TYPE_CONFIG[question.questionType];
  const Icon = QUESTION_TYPE_ICONS[question.questionType];

  const handleOptionChange = (optionIndex: number, field: string, value: string) => {
    const options = [...(question.options as TestQuestionOption[])];
    options[optionIndex] = { ...options[optionIndex], [field]: value };
    onUpdate({ ...question, options });
  };

  const handleAddOption = () => {
    const options = [...(question.options as TestQuestionOption[])];
    const newId = `opt_${Date.now()}`;
    options.push({ id: newId, text: "" });
    onUpdate({ ...question, options });
  };

  const handleRemoveOption = (optionIndex: number) => {
    const options = [...(question.options as TestQuestionOption[])];
    const removedOption = options[optionIndex];
    options.splice(optionIndex, 1);
    
    let newCorrectAnswer = question.correctAnswer;
    if (question.questionType === "multiple_choice" && question.correctAnswer === removedOption.id) {
      newCorrectAnswer = null;
    } else if (question.questionType === "multiple_answer" && Array.isArray(question.correctAnswer)) {
      newCorrectAnswer = (question.correctAnswer as string[]).filter(id => id !== removedOption.id);
    }
    
    onUpdate({ ...question, options, correctAnswer: newCorrectAnswer });
  };

  const handleSetCorrectAnswer = (optionId: string) => {
    if (question.questionType === "multiple_choice" || question.questionType === "true_false") {
      onUpdate({ ...question, correctAnswer: optionId });
    } else if (question.questionType === "multiple_answer") {
      const currentAnswers = (question.correctAnswer as string[]) || [];
      if (currentAnswers.includes(optionId)) {
        onUpdate({ ...question, correctAnswer: currentAnswers.filter(id => id !== optionId) });
      } else {
        onUpdate({ ...question, correctAnswer: [...currentAnswers, optionId] });
      }
    }
  };

  const isCorrectOption = (optionId: string): boolean => {
    if (question.questionType === "multiple_choice" || question.questionType === "true_false") {
      return question.correctAnswer === optionId;
    }
    if (question.questionType === "multiple_answer" && Array.isArray(question.correctAnswer)) {
      return question.correctAnswer.includes(optionId);
    }
    return false;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
      {/* Header de la pregunta */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button className="cursor-grab text-gray-400 hover:text-gray-600">
          <IconGripVertical size={20} />
        </button>
        
        <div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
          style={{ backgroundColor: getQuestionTypeBackgroundColor(question.questionType) }}
        >
          <Icon size={16} style={{ color: config.color }} />
          <span>{index + 1}. {config.labelEs}</span>
        </div>

        <select
          className="select select-sm select-bordered"
          value={question.timeLimitSeconds || ""}
          onChange={(e) => onUpdate({ ...question, timeLimitSeconds: e.target.value ? parseInt(e.target.value) : undefined })}
        >
          <option value="">Sin límite</option>
          <option value="30">30 seg</option>
          <option value="60">1 min</option>
          <option value="120">2 min</option>
          <option value="300">5 min</option>
        </select>

        <select
          className="select select-sm select-bordered"
          value={question.points}
          onChange={(e) => onUpdate({ ...question, points: parseFloat(e.target.value) })}
        >
          <option value="0">0 puntos</option>
          <option value="1">1 punto</option>
          <option value="2">2 puntos</option>
          <option value="5">5 puntos</option>
          <option value="10">10 puntos</option>
        </select>

        <div className="flex-1" />

        <button 
          onClick={onDuplicate}
          className="btn btn-sm btn-ghost"
          title="Duplicar pregunta"
        >
          <IconCopy size={18} />
        </button>
        <button 
          onClick={onDelete}
          className="btn btn-sm btn-ghost text-error"
          title="Eliminar pregunta"
        >
          <IconTrash size={18} />
        </button>
      </div>

      {/* Campo de pregunta */}
      <div className="mb-4">
        <label className="label">
          <span className="label-text font-medium">Pregunta</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full min-h-[80px]"
          placeholder="Escribe tu pregunta aquí..."
          value={question.questionText}
          onChange={(e) => onUpdate({ ...question, questionText: e.target.value })}
        />
        <button className="btn btn-sm btn-ghost text-primary mt-2 gap-1">
          <IconPlus size={16} />
          Agregar media
        </button>
      </div>

      {/* Toggle para múltiples respuestas */}
      {question.questionType === "multiple_choice" && (
        <div className="form-control mb-4">
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={question.questionType === "multiple_answer"}
              onChange={() => onUpdate({ 
                ...question, 
                questionType: "multiple_answer",
                correctAnswer: question.correctAnswer ? [question.correctAnswer as string] : []
              })}
            />
            <span className="label-text">Permitir múltiples respuestas</span>
          </label>
        </div>
      )}

      {question.questionType === "multiple_answer" && (
        <div className="form-control mb-4">
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={question.questionType === "multiple_answer"}
              onChange={() => onUpdate({ 
                ...question, 
                questionType: "multiple_choice",
                correctAnswer: Array.isArray(question.correctAnswer) && question.correctAnswer.length > 0 
                  ? question.correctAnswer[0] 
                  : null
              })}
            />
            <span className="label-text">Permitir múltiples respuestas</span>
          </label>
        </div>
      )}

      {/* Opciones de respuesta */}
      {(question.questionType === "multiple_choice" || 
        question.questionType === "multiple_answer" || 
        question.questionType === "true_false" ||
        question.questionType === "poll") && (
        <div className="space-y-3">
          {(question.options as TestQuestionOption[]).map((option, optIndex) => (
            <div key={option.id} className="flex items-center gap-3">
              <button
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isCorrectOption(option.id)
                    ? "border-success bg-success text-white"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onClick={() => handleSetCorrectAnswer(option.id)}
                title={question.questionType === "poll" ? "Encuesta sin respuesta correcta" : "Marcar como correcta"}
                disabled={question.questionType === "poll"}
              >
                {isCorrectOption(option.id) && <IconCheck size={14} />}
              </button>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-sm text-gray-500">Opción {optIndex + 1}</span>
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  placeholder="Escribe una opción..."
                  value={option.text}
                  onChange={(e) => handleOptionChange(optIndex, "text", e.target.value)}
                />
              </div>
              {question.questionType !== "true_false" && (
                <button 
                  onClick={() => handleRemoveOption(optIndex)}
                  className="btn btn-sm btn-ghost text-error"
                  disabled={(question.options as TestQuestionOption[]).length <= 2}
                >
                  <IconTrash size={18} />
                </button>
              )}
            </div>
          ))}

          {question.questionType !== "true_false" && (
            <button 
              onClick={handleAddOption}
              className="btn btn-ghost w-full border-2 border-dashed border-gray-300 hover:border-primary"
            >
              <IconPlus size={18} />
              Agregar opción
            </button>
          )}
        </div>
      )}

      {/* Campo de respuesta abierta */}
      {question.questionType === "open_ended" && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-500 text-sm">
            Los estudiantes escribirán su respuesta en un campo de texto libre.
            Esta pregunta requiere revisión manual.
          </p>
        </div>
      )}

      {/* Explicación */}
      <div className="mt-4 pt-4 border-t">
        {showExplanation ? (
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="label-text font-medium">Explicación (opcional)</label>
              <button 
                onClick={() => {
                  setShowExplanation(false);
                  onUpdate({ ...question, explanation: undefined });
                }}
                className="btn btn-xs btn-ghost"
              >
                <IconX size={14} />
              </button>
            </div>
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="Explica la respuesta correcta..."
              value={question.explanation || ""}
              onChange={(e) => onUpdate({ ...question, explanation: e.target.value })}
            />
          </div>
        ) : (
          <button 
            onClick={() => setShowExplanation(true)}
            className="btn btn-sm btn-ghost text-primary gap-1"
          >
            <IconPlus size={16} />
            Agregar explicación
            <IconInfoCircle size={16} className="text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function EditTestPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [publishing, setPublishing] = useState(false);
  
  // Estado del test
  const [test, setTest] = useState<Partial<Test>>({
    title: "",
    description: "",
    instructions: "",
    status: "draft",
    timeMode: "unlimited",
    timeLimitMinutes: undefined,
    passingScore: 60,
    maxAttempts: 1,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResultsImmediately: true,
    showCorrectAnswers: true,
    allowReview: true,
  });
  
  // Estado de las preguntas
  const [questions, setQuestions] = useState<TestQuestion[]>([]);

  // Cargar datos del test existente
  useEffect(() => {
    if (testId) {
      loadTestData();
    }
  }, [testId]);

  const loadTestData = async () => {
    try {
      setLoading(true);
      
      // Cargar información del test
      const testRes = await fetch(`/api/admin/tests/${testId}`);
      if (!testRes.ok) {
        router.push("/dashboard/tests");
        return;
      }
      const testData = await testRes.json();
      setTest(testData.test);

      // Cargar preguntas del test
      const questionsRes = await fetch(`/api/admin/tests/${testId}/questions`);
      if (questionsRes.ok) {
        const questionsData = await questionsRes.json();
        setQuestions(questionsData.questions || []);
      }
    } catch (error) {
      console.error("Error loading test:", error);
      router.push("/dashboard/tests");
    } finally {
      setLoading(false);
    }
  };

  // Crear una pregunta vacía
  const createEmptyQuestion = (type: TestQuestionType, order: number): TestQuestion => {
    const baseQuestion: TestQuestion = {
      id: `temp_${Date.now()}_${order}`,
      testId: testId,
      questionType: type,
      questionText: "",
      options: [],
      correctAnswer: null,
      points: 1,
      order,
      isRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (type === "true_false") {
      baseQuestion.options = [
        { id: "true", text: "Verdadero" },
        { id: "false", text: "Falso" },
      ];
    } else if (type === "multiple_choice" || type === "multiple_answer" || type === "poll") {
      baseQuestion.options = [
        { id: `opt_${Date.now()}_1`, text: "" },
        { id: `opt_${Date.now()}_2`, text: "" },
      ];
    }

    return baseQuestion;
  };

  const handleAddQuestion = (type: TestQuestionType) => {
    const newQuestion = createEmptyQuestion(type, questions.length);
    setQuestions([...questions, newQuestion]);
  };

  const handleUpdateQuestion = (index: number, updatedQuestion: TestQuestion) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
  };

  const handleDeleteQuestion = async (index: number) => {
    const question = questions[index];
    
    // Si la pregunta ya existe en la BD, eliminarla
    if (question.id && !question.id.startsWith("temp_")) {
      try {
        await fetch(`/api/admin/tests/${testId}/questions/${question.id}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.error("Error deleting question:", error);
      }
    }
    
    const newQuestions = questions.filter((_, i) => i !== index);
    newQuestions.forEach((q, i) => {
      q.order = i;
    });
    setQuestions(newQuestions);
  };

  const handleDuplicateQuestion = (index: number) => {
    const questionToDuplicate = questions[index];
    const newQuestion: TestQuestion = {
      ...questionToDuplicate,
      id: `temp_${Date.now()}`,
      order: questions.length,
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleSaveTest = async () => {
    if (!user || !test.title) {
      alert("El título es requerido");
      return;
    }

    setSaving(true);
    try {
      // Actualizar el test
      const testRes = await fetch(`/api/admin/tests/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(test),
      });

      if (!testRes.ok) {
        throw new Error("Error al actualizar la evaluación");
      }

      // Guardar preguntas
      for (const question of questions) {
        const questionData = {
          questionType: question.questionType,
          questionText: question.questionText,
          questionMediaUrl: question.questionMediaUrl,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          points: question.points,
          timeLimitSeconds: question.timeLimitSeconds,
          order: question.order,
          isRequired: question.isRequired,
        };

        if (question.id.startsWith("temp_")) {
          // Crear nueva pregunta
          const res = await fetch(`/api/admin/tests/${testId}/questions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(questionData),
          });
          if (res.ok) {
            const data = await res.json();
            question.id = data.question.id;
          }
        } else {
          // Actualizar pregunta existente
          await fetch(`/api/admin/tests/${testId}/questions/${question.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(questionData),
          });
        }
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving test:", error);
      alert("Error al guardar la evaluación");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (questions.length === 0) {
      alert("Agrega al menos una pregunta antes de publicar");
      return;
    }

    setPublishing(true);
    try {
      // Primero guardar
      await handleSaveTest();

      // Luego publicar
      const res = await fetch(`/api/admin/tests/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });

      if (res.ok) {
        setTest({ ...test, status: "published" });
        alert("Evaluación publicada exitosamente");
      }
    } catch (error) {
      console.error("Error publishing test:", error);
      alert("Error al publicar la evaluación");
    } finally {
      setPublishing(false);
    }
  };

  const questionTypeGroups = [
    {
      title: "",
      types: ["multiple_choice", "true_false"] as TestQuestionType[],
    },
    {
      title: "Respuestas abiertas",
      types: ["open_ended", "poll"] as TestQuestionType[],
    },
    {
      title: "Pensamiento interactivo",
      types: ["reorder", "match"] as TestQuestionType[],
    },
    {
      title: "Pensamiento espacial",
      types: ["drag_drop", "sequencing"] as TestQuestionType[],
    },
  ];

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header oscuro */}
      <div className="bg-[#1A2170] text-white px-6 py-4">
        <div className="flex items-center justify-between max-w-[1440px] mx-auto">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push("/dashboard/tests")}
              className="btn btn-ghost btn-sm text-white"
            >
              <IconArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  className="bg-transparent border-none text-lg font-medium focus:outline-none placeholder:text-white/50"
                  placeholder="Título de la evaluación"
                  value={test.title}
                  onChange={(e) => setTest({ ...test, title: e.target.value })}
                />
                {test.status === "published" ? (
                  <span className="badge badge-success text-white text-xs">Publicada</span>
                ) : (
                  <span className="badge badge-warning text-white text-xs">Borrador</span>
                )}
              </div>
              <p className="text-white/60 text-sm">{questions.length} preguntas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-white/60 text-sm flex items-center gap-1">
                <IconCheck size={16} />
                Guardado {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <button 
              onClick={handleSaveTest}
              disabled={saving || !test.title}
              className="btn btn-outline btn-sm text-white border-white hover:bg-white/10 gap-2"
            >
              <IconDeviceFloppy size={18} />
              {saving ? "Guardando..." : "Guardar"}
            </button>
            {test.status === "draft" && (
              <button 
                onClick={handlePublish}
                disabled={publishing || questions.length === 0}
                className="btn btn-success btn-sm gap-2"
              >
                <IconCloudUpload size={18} />
                {publishing ? "Publicando..." : "Publicar"}
              </button>
            )}
            <button 
              onClick={() => router.push(`/dashboard/tests/${testId}/results`)}
              className="btn btn-info btn-sm gap-2"
            >
              <IconEye size={18} />
              Resultados
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal - 3 columnas */}
      <div className="max-w-[1440px] mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar izquierdo - Tipos de pregunta */}
          <div className="col-span-3">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
              <h3 className="font-semibold text-lg mb-4">Agregar pregunta</h3>
              
              {questionTypeGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="mb-4">
                  {group.title && (
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                      {group.title}
                    </p>
                  )}
                  <div className="space-y-2">
                    {group.types.map((type) => {
                      const config = QUESTION_TYPE_CONFIG[type];
                      const Icon = QUESTION_TYPE_ICONS[type];
                      return (
                        <button
                          key={type}
                          onClick={() => handleAddQuestion(type)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                        >
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: config.color }}
                          >
                            <Icon size={18} className="text-white" />
                          </div>
                          <span className="font-medium text-sm">{config.labelEs}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Panel central - Editor de preguntas */}
          <div className="col-span-6">
            {questions.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <IconPlus size={64} className="mx-auto" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Agrega tu primera pregunta</h3>
                <p className="text-gray-500 mb-6">
                  Selecciona un tipo de pregunta del panel izquierdo para comenzar
                </p>
                <button 
                  onClick={() => handleAddQuestion("multiple_choice")}
                  className="btn btn-primary"
                >
                  <IconPlus size={20} />
                  Agregar pregunta
                </button>
              </div>
            ) : (
              <div>
                {questions.map((question, index) => (
                  <QuestionEditor
                    key={question.id}
                    question={question}
                    index={index}
                    onUpdate={(q) => handleUpdateQuestion(index, q)}
                    onDelete={() => handleDeleteQuestion(index)}
                    onDuplicate={() => handleDuplicateQuestion(index)}
                  />
                ))}
                
                <button 
                  onClick={() => handleAddQuestion("multiple_choice")}
                  className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <IconPlus size={20} />
                  Agregar otra pregunta
                </button>
              </div>
            )}
          </div>

          {/* Panel derecho - Configuración */}
          <div className="col-span-3">
            {/* Actualización masiva */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h3 className="font-semibold mb-4">Actualización masiva</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-sm">Tiempo</label>
                  <select className="select select-bordered w-full select-sm">
                    <option>Sin límite</option>
                    <option>30 seg</option>
                    <option>1 min</option>
                    <option>2 min</option>
                  </select>
                </div>
                <div>
                  <label className="label text-sm">Puntos</label>
                  <select className="select select-bordered w-full select-sm">
                    <option>0 puntos</option>
                    <option>1 punto</option>
                    <option>2 puntos</option>
                    <option>5 puntos</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Configuración del test */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-semibold mb-4">Configuración</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="label text-sm">Descripción</label>
                  <textarea
                    className="textarea textarea-bordered w-full text-sm"
                    placeholder="Describe la evaluación..."
                    rows={3}
                    value={test.description || ""}
                    onChange={(e) => setTest({ ...test, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label text-sm">Modo de tiempo</label>
                  <select 
                    className="select select-bordered w-full select-sm"
                    value={test.timeMode}
                    onChange={(e) => setTest({ 
                      ...test, 
                      timeMode: e.target.value as "unlimited" | "timed",
                      timeLimitMinutes: e.target.value === "unlimited" ? undefined : 30
                    })}
                  >
                    <option value="unlimited">Sin límite</option>
                    <option value="timed">Con tiempo</option>
                  </select>
                </div>

                {test.timeMode === "timed" && (
                  <div>
                    <label className="label text-sm">Tiempo límite (minutos)</label>
                    <input
                      type="number"
                      className="input input-bordered w-full input-sm"
                      value={test.timeLimitMinutes || 30}
                      onChange={(e) => setTest({ ...test, timeLimitMinutes: parseInt(e.target.value) })}
                      min={1}
                    />
                  </div>
                )}

                <div>
                  <label className="label text-sm">Porcentaje para aprobar</label>
                  <input
                    type="number"
                    className="input input-bordered w-full input-sm"
                    value={test.passingScore}
                    onChange={(e) => setTest({ ...test, passingScore: parseInt(e.target.value) })}
                    min={0}
                    max={100}
                  />
                </div>

                <div>
                  <label className="label text-sm">Intentos máximos</label>
                  <input
                    type="number"
                    className="input input-bordered w-full input-sm"
                    value={test.maxAttempts}
                    onChange={(e) => setTest({ ...test, maxAttempts: parseInt(e.target.value) })}
                    min={1}
                  />
                </div>

                <div className="divider"></div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={test.shuffleQuestions}
                      onChange={(e) => setTest({ ...test, shuffleQuestions: e.target.checked })}
                    />
                    <span className="text-sm">Mezclar preguntas</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={test.shuffleOptions}
                      onChange={(e) => setTest({ ...test, shuffleOptions: e.target.checked })}
                    />
                    <span className="text-sm">Mezclar opciones</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={test.showResultsImmediately}
                      onChange={(e) => setTest({ ...test, showResultsImmediately: e.target.checked })}
                    />
                    <span className="text-sm">Mostrar resultados al terminar</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={test.showCorrectAnswers}
                      onChange={(e) => setTest({ ...test, showCorrectAnswers: e.target.checked })}
                    />
                    <span className="text-sm">Mostrar respuestas correctas</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

