"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Question } from "@/types/form";
import QuestionCard from "@/components/survey/QuestionCard";
import ExcelImporter from "@/components/survey/ExcelImporter";
import { IconPlus, IconDeviceFloppy } from "@tabler/icons-react";
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
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";

// Componente sortable para cada pregunta
function SortableQuestion({ 
  question, 
  index, 
  onUpdate, 
  onDelete 
}: { 
  question: Question; 
  index: number; 
  onUpdate: (q: Question) => void; 
  onDelete: () => void;
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
      />
    </div>
  );
}

export default function NewSurveyPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'entry' | 'exit' | 'general'>('general');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addQuestion = () => {
    const newQuestion: Question = {
      id: uuid(),
      type: 'short_text',
      questionText: '',
      isRequired: false,
      order: questions.length,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updatedQuestion: Question) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    // Reordenar
    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i })));
  };

  const handleExcelImport = (importedQuestions: Question[]) => {
    // Actualizar el orden de las preguntas importadas
    const newQuestions = importedQuestions.map((q, i) => ({
      ...q,
      order: questions.length + i,
    }));
    setQuestions([...questions, ...newQuestions]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const reordered = arrayMove(items, oldIndex, newIndex);
        // Actualizar el orden
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

    // Validar que todas las preguntas tengan texto
    const invalidQuestions = questions.filter(q => !q.questionText.trim());
    if (invalidQuestions.length > 0) {
      alert('Todas las preguntas deben tener texto');
      return;
    }

    // Validar que preguntas con opciones tengan al menos una opción
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
        is_active: true,
      };

      await supabaseClient.from(TABLES.SURVEYS).insert(surveyData);
      
      router.push('/dashboard/surveys');
    } catch (error) {
      console.error('Error saving survey:', error);
      alert('Error al guardar la encuesta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <button onClick={() => router.back()} className="btn btn-ghost mb-6">
        ← Volver
      </button>

      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h1 className="text-3xl font-bold mb-6">Crear Nueva Encuesta</h1>

          {/* Información básica */}
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
        </div>
      </div>

      {/* Preguntas */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Preguntas ({questions.length})</h2>
          <div className="flex gap-2">
            <ExcelImporter onImport={handleExcelImport} />
            <button
              onClick={addQuestion}
              className="btn btn-primary text-white gap-2"
            >
              <IconPlus size={20} />
              Agregar Pregunta
            </button>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center py-12">
              <p className="text-base-content/70 mb-4">
                No hay preguntas aún. Haz clic en &quot;Agregar Pregunta&quot; para comenzar.
              </p>
              <button
                onClick={addQuestion}
                className="btn btn-primary text-white gap-2 mx-auto"
              >
                <IconPlus size={20} />
                Agregar Primera Pregunta
              </button>
            </div>
          </div>
        ) : (
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
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex gap-4 sticky bottom-4 bg-base-100 p-4 rounded-lg shadow-xl border-2 border-base-300">
        <button
          onClick={() => router.back()}
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
          {saving ? 'Guardando...' : 'Guardar Encuesta'}
        </button>
      </div>
    </div>
  );
}
