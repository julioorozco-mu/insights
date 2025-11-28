"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Question } from "@/types/form";
import QuestionCard from "@/components/survey/QuestionCard";
import { IconPlus, IconDeviceFloppy, IconEdit, IconEye, IconCheck } from "@tabler/icons-react";
import { v4 as uuid } from "uuid";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader } from "@/components/common/Loader";

// Componente sortable para cada pregunta
function SortableQuestion({ 
  question, 
  index, 
  onUpdate, 
  onDelete,
  isExpanded,
  onToggleExpand
}: { 
  question: Question; 
  index: number; 
  onUpdate: (q: Question) => void; 
  onDelete: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <QuestionCard
        question={question}
        index={index}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    </div>
  );
}

// Componente de vista previa de pregunta
function QuestionPreview({ question, index }: { question: Question; index: number }) {
  // Función para obtener el texto de una opción (puede ser string u objeto)
  const getOptionText = (option: any): string => {
    if (typeof option === 'string') {
      return option;
    }
    if (option && typeof option === 'object') {
      return option.label || option.value || String(option);
    }
    return String(option);
  };

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <div className="flex items-start gap-2 mb-3">
          <span className="badge badge-primary text-white">{index + 1}</span>
          <div className="flex-1">
            <p className="font-semibold text-lg">{question.questionText}</p>
            {question.isRequired && <span className="text-error text-sm ml-2">*</span>}
          </div>
        </div>
        
        {/* Mostrar tipo de pregunta y opciones si las tiene */}
        <div className="text-sm text-base-content/60 mb-2">
          Tipo: {getQuestionTypeLabel(question.type)}
        </div>
        
        {question.options && question.options.length > 0 && (
          <div className="space-y-2">
            {question.options.map((option, idx) => {
              const isCorrect = typeof option === 'object' && option.isCorrect;
              return (
                <div key={idx} className={`flex items-center gap-2 p-2 rounded ${isCorrect ? 'bg-success/20 border border-success' : 'bg-base-200'}`}>
                  <span className="text-sm flex-1">{getOptionText(option)}</span>
                  {isCorrect && (
                    <span className="badge badge-success text-white gap-1">
                      <IconCheck size={12} />
                      Correcta
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getQuestionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    short_text: 'Respuesta corta',
    long_text: 'Respuesta larga',
    single_choice: 'Opción única',
    multiple_choice: 'Opción múltiple',
    dropdown: 'Lista desplegable',
    scale: 'Escala',
    quiz: 'Quiz',
  };
  return labels[type] || type;
}

export default function EditSurveyPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'entry' | 'exit' | 'general'>('general');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const loadSurvey = async () => {
      try {
        const surveyDoc = await getDoc(doc(db, 'surveys', params.id as string));
        if (surveyDoc.exists()) {
          const data = surveyDoc.data();
          setTitle(data.title || '');
          setDescription(data.description || '');
          setType(data.type || 'general');
          setQuestions(data.questions || []);
        }
      } catch (error) {
        console.error('Error loading survey:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSurvey();
  }, [params.id]);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: uuid(),
      type: 'short_text',
      questionText: '',
      isRequired: false,
      order: questions.length,
    };
    setQuestions([...questions, newQuestion]);
    setExpandedQuestionId(newQuestion.id); // Expandir la nueva pregunta automáticamente
  };

  const updateQuestion = (index: number, updatedQuestion: Question) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i })));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((q, i) => ({ ...q, order: i }));
      });
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Por favor ingresa un título para la encuesta');
      return;
    }

    if (questions.length === 0) {
      alert('Agrega al menos una pregunta');
      return;
    }

    const invalidQuestions = questions.filter(q => !q.questionText.trim());
    if (invalidQuestions.length > 0) {
      alert('Todas las preguntas deben tener texto');
      return;
    }

    const questionsNeedingOptions = questions.filter(q => 
      ['single_choice', 'multiple_choice', 'dropdown', 'quiz'].includes(q.type) &&
      (!q.options || q.options.length === 0)
    );
    if (questionsNeedingOptions.length > 0) {
      alert('Las preguntas de opción múltiple deben tener al menos una opción');
      return;
    }

    try {
      setSaving(true);
      const now = new Date();

      const surveyData = {
        title,
        description,
        type,
        questions,
        updatedAt: Timestamp.fromDate(now),
      };

      await updateDoc(doc(db, 'surveys', params.id as string), surveyData);
      
      setShowSuccessModal(true);
      setEditMode(false);
    } catch (error) {
      console.error('Error updating survey:', error);
      alert('Error al actualizar la encuesta');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      <button onClick={() => router.back()} className="btn btn-ghost mb-6">
        ← Volver
      </button>

      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-3xl font-bold">{editMode ? 'Editar Encuesta' : 'Vista Previa de Encuesta'}</h1>
            <button
              onClick={() => setEditMode(!editMode)}
              className={`btn gap-2 ${editMode ? 'btn-ghost' : 'btn-primary text-white'}`}
            >
              {editMode ? (
                <>
                  <IconEye size={20} />
                  Ver Preview
                </>
              ) : (
                <>
                  <IconEdit size={20} />
                  Modo Edición
                </>
              )}
            </button>
          </div>

          {/* Información básica */}
          {editMode ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Título *</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Encuesta de Satisfacción del Curso"
                    className="input input-bordered"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Tipo *</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="select select-bordered"
                  >
                    <option value="general">General</option>
                    <option value="entry">Entrada (Pre-curso)</option>
                    <option value="exit">Salida (Post-curso)</option>
                  </select>
                </div>
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-semibold">Descripción (opcional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe el propósito de esta encuesta..."
                  className="textarea textarea-bordered h-24"
                />
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2">{title}</h2>
              {description && <p className="text-base-content/70 mb-4">{description}</p>}
              <div className="flex gap-2 mb-4">
                <div className={`badge ${type === 'entry' ? 'badge-info' : type === 'exit' ? 'badge-success' : 'badge-neutral'} text-white`}>
                  {type === 'entry' ? 'Entrada' : type === 'exit' ? 'Salida' : 'General'}
                </div>
                <div className="badge badge-outline">{questions.length} preguntas</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preguntas */}
      <div className="mb-6">
        {editMode && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Preguntas ({questions.length})</h2>
            <button
              onClick={addQuestion}
              className="btn btn-primary text-white gap-2"
            >
              <IconPlus size={20} />
              Agregar Pregunta
            </button>
          </div>
        )}

        {questions.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center py-12">
              <p className="text-base-content/70 mb-4">
                No hay preguntas aún. {editMode && 'Haz clic en "Agregar Pregunta" para comenzar.'}
              </p>
              {editMode && (
                <button
                  onClick={addQuestion}
                  className="btn btn-primary text-white gap-2 mx-auto"
                >
                  <IconPlus size={20} />
                  Agregar Primera Pregunta
                </button>
              )}
            </div>
          </div>
        ) : editMode ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={questions.map(q => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <SortableQuestion
                    key={question.id}
                    question={question}
                    index={index}
                    onUpdate={(updated) => updateQuestion(index, updated)}
                    onDelete={() => deleteQuestion(index)}
                    isExpanded={expandedQuestionId === question.id}
                    onToggleExpand={() => setExpandedQuestionId(expandedQuestionId === question.id ? null : question.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <QuestionPreview key={question.id} question={question} index={index} />
            ))}
          </div>
        )}
      </div>

      {/* Botones de acción - solo en modo edición */}
      {editMode && (
        <div className="flex gap-4 sticky bottom-4 bg-base-100 p-4 rounded-lg shadow-xl border-2 border-base-300">
          <button
            onClick={() => setEditMode(false)}
            className="btn btn-ghost flex-1"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary text-white flex-1 gap-2"
            disabled={saving || questions.length === 0}
          >
            <IconDeviceFloppy size={20} />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      )}

      {/* Modal de éxito */}
      {showSuccessModal && (
        <div className="modal modal-open">
          <div className="modal-box text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-success/20 p-4">
                <IconCheck size={48} className="text-success" />
              </div>
            </div>
            <h3 className="font-bold text-2xl mb-2">¡Encuesta actualizada!</h3>
            <p className="text-base-content/70 mb-6">
              Los cambios se han guardado exitosamente
            </p>
            <div className="modal-action justify-center">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="btn btn-primary text-white"
              >
                Continuar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowSuccessModal(false)}>
            <button>close</button>
          </div>
        </div>
      )}
    </div>
  );
}
