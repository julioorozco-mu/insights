import React from 'react';
import { Question } from '@/types/form';
import { 
  IconGripVertical, 
  IconTrash, 
  IconPlus,
  IconX,
  IconCheck
} from '@tabler/icons-react';

interface Props {
  question: Question;
  index: number;
  onUpdate: (question: Question) => void;
  onDelete: () => void;
  dragHandleProps?: any;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function QuestionCard({ question, index, onUpdate, onDelete, dragHandleProps, isExpanded = true, onToggleExpand }: Props) {
  const addOption = () => {
    const newOptions = [...(question.options || []), { label: '', value: `option_${Date.now()}` }];
    onUpdate({ ...question, options: newOptions });
  };

  const updateOption = (optionIndex: number, field: 'label' | 'isCorrect', value: string | boolean) => {
    const newOptions = [...(question.options || [])];
    newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };
    onUpdate({ ...question, options: newOptions });
  };

  const removeOption = (optionIndex: number) => {
    const newOptions = question.options?.filter((_, i) => i !== optionIndex);
    onUpdate({ ...question, options: newOptions });
  };

  const needsOptions = ['single_choice', 'multiple_choice', 'dropdown', 'quiz'].includes(question.type);

  return (
    <div className={`card bg-base-100 shadow-xl border-2 ${isExpanded ? 'border-primary' : 'border-base-300'}`}>
      <div className="card-body">
        {/* Header con drag handle */}
        <div className="flex items-start gap-3">
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing mt-2">
            <IconGripVertical size={20} className="text-base-content/40" />
          </div>
          
          <div className="flex-1">
            {/* Header colapsable */}
            <div 
              className="flex items-center gap-2 mb-4 cursor-pointer"
              onClick={onToggleExpand}
            >
              <span className="badge badge-primary text-white">Pregunta {index + 1}</span>
              <span className="font-medium flex-1">{question.questionText || 'Nueva pregunta'}</span>
              <button 
                type="button"
                className="btn btn-sm btn-ghost btn-circle"
              >
                {isExpanded ? '−' : '+'}
              </button>
            </div>

            {isExpanded && (
              <>
            {/* Tipo de pregunta */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Tipo de pregunta</span>
              </label>
              <select
                value={question.type}
                onChange={(e) => onUpdate({ ...question, type: e.target.value as Question['type'] })}
                className="select select-bordered select-sm"
              >
                <option value="short_text">Texto Corto</option>
                <option value="long_text">Texto Largo</option>
                <option value="number">Numérica</option>
                <option value="single_choice">Opción Única (Radio)</option>
                <option value="multiple_choice">Opción Múltiple (Checkbox)</option>
                <option value="dropdown">Selector (Dropdown)</option>
                <option value="quiz">Quiz (con respuesta correcta)</option>
              </select>
            </div>

            {/* Texto de la pregunta */}
            <div className="form-control mb-3">
              <input
                type="text"
                value={question.questionText}
                onChange={(e) => onUpdate({ ...question, questionText: e.target.value })}
                placeholder="Escribe tu pregunta aquí..."
                className="input input-bordered font-semibold"
              />
            </div>

            {/* Descripción opcional */}
            <div className="form-control mb-3">
              <input
                type="text"
                value={question.description || ''}
                onChange={(e) => onUpdate({ ...question, description: e.target.value })}
                placeholder="Descripción opcional..."
                className="input input-bordered input-sm"
              />
            </div>

            {/* Opciones (si el tipo lo requiere) */}
            {needsOptions && (
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <label className="label-text font-semibold">Opciones de respuesta:</label>
                  <button
                    onClick={addOption}
                    className="btn btn-sm btn-ghost gap-2"
                  >
                    <IconPlus size={16} />
                    Agregar opción
                  </button>
                </div>
                
                <div className="alert alert-info text-white text-xs py-2">
                  <IconCheck size={16} />
                  <span>Marca con ✓ las respuestas correctas. Las preguntas de texto se validan manualmente.</span>
                </div>

                {question.options?.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center gap-2">
                    {/* Indicador visual del tipo de pregunta */}
                    {question.type === 'single_choice' && (
                      <input type="radio" name={`q-${question.id}`} className="radio radio-sm" disabled />
                    )}
                    {question.type === 'multiple_choice' && (
                      <input type="checkbox" className="checkbox checkbox-sm" disabled />
                    )}
                    {question.type === 'dropdown' && (
                      <span className="badge badge-sm">{optionIndex + 1}</span>
                    )}
                    {question.type === 'quiz' && (
                      <span className="badge badge-sm badge-info text-white">Q</span>
                    )}
                    
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) => updateOption(optionIndex, 'label', e.target.value)}
                      placeholder={`Opción ${optionIndex + 1}`}
                      className="input input-bordered input-sm flex-1"
                    />
                    
                    {/* Botón para marcar como correcta (todos los tipos de selección) */}
                    <button
                      onClick={() => updateOption(optionIndex, 'isCorrect', !option.isCorrect)}
                      className={`btn btn-sm btn-circle ${option.isCorrect ? 'btn-success text-white' : 'btn-ghost'}`}
                      title={option.isCorrect ? 'Respuesta correcta' : 'Marcar como correcta'}
                    >
                      {option.isCorrect ? <IconCheck size={16} /> : <IconCheck size={16} className="opacity-30" />}
                    </button>
                    
                    <button
                      onClick={() => removeOption(optionIndex)}
                      className="btn btn-sm btn-ghost btn-circle text-error"
                    >
                      <IconX size={16} />
                    </button>
                  </div>
                ))}

                {(!question.options || question.options.length === 0) && (
                  <div className="alert alert-warning">
                    <span className="text-sm">Agrega al menos una opción de respuesta</span>
                  </div>
                )}
              </div>
            )}

            {/* Vista previa según el tipo */}
            <div className="bg-base-200 p-4 rounded-lg">
              <p className="text-sm font-semibold mb-3">Vista previa:</p>
              
              {/* Mostrar la pregunta en la vista previa */}
              {question.questionText && (
                <p className="font-medium mb-3">{question.questionText}</p>
              )}
              
              {question.type === 'short_text' && (
                <input type="text" placeholder="Respuesta corta..." className="input input-bordered input-sm w-full" disabled />
              )}
              
              {question.type === 'long_text' && (
                <textarea placeholder="Respuesta larga..." className="textarea textarea-bordered w-full" rows={3} disabled />
              )}
              
              {question.type === 'number' && (
                <input type="number" placeholder="0" className="input input-bordered input-sm w-full" disabled />
              )}
              
              {question.type === 'single_choice' && (
                <div className="space-y-2">
                  {question.options && question.options.length > 0 ? (
                    question.options.map((opt, i) => (
                      <label key={i} className="flex items-center gap-3 p-2 hover:bg-base-300 rounded cursor-pointer">
                        <input type="radio" name={`preview-${question.id}`} className="radio radio-sm" disabled />
                        <span className="text-sm">{opt.label || `Opción ${i + 1}`}</span>
                      </label>
                    ))
                  ) : (
                    <span className="text-sm text-base-content/50">Agrega opciones para ver la vista previa</span>
                  )}
                </div>
              )}
              
              {question.type === 'multiple_choice' && (
                <div className="space-y-2">
                  {question.options && question.options.length > 0 ? (
                    question.options.map((opt, i) => (
                      <label key={i} className="flex items-center gap-3 p-2 hover:bg-base-300 rounded cursor-pointer">
                        <input type="checkbox" className="checkbox checkbox-sm" disabled />
                        <span className="text-sm">{opt.label || `Opción ${i + 1}`}</span>
                      </label>
                    ))
                  ) : (
                    <span className="text-sm text-base-content/50">Agrega opciones para ver la vista previa</span>
                  )}
                </div>
              )}
              
              {question.type === 'dropdown' && (
                <select className="select select-bordered select-sm w-full" disabled>
                  <option>Selecciona una opción...</option>
                  {question.options?.map((opt, i) => (
                    <option key={i}>{opt.label || `Opción ${i + 1}`}</option>
                  ))}
                </select>
              )}
              
              {question.type === 'quiz' && (
                <div className="space-y-2">
                  {question.options && question.options.length > 0 ? (
                    question.options.map((opt, i) => (
                      <label key={i} className="flex items-center gap-3 p-2 hover:bg-base-300 rounded cursor-pointer">
                        <input type="radio" name={`preview-quiz-${question.id}`} className="radio radio-sm radio-primary" disabled />
                        <span className="text-sm flex-1">{opt.label || `Opción ${i + 1}`}</span>
                        {opt.isCorrect && (
                          <span className="badge badge-success badge-xs text-white">Correcta</span>
                        )}
                      </label>
                    ))
                  ) : (
                    <span className="text-sm text-base-content/50">Agrega opciones para ver la vista previa</span>
                  )}
                </div>
              )}
            </div>

            {/* Configuración adicional */}
            <div className="flex items-center gap-4 mt-4">
              <label className="label cursor-pointer gap-2">
                <input
                  type="checkbox"
                  checked={question.isRequired}
                  onChange={(e) => onUpdate({ ...question, isRequired: e.target.checked })}
                  className="checkbox checkbox-sm"
                />
                <span className="label-text">Obligatoria</span>
              </label>

              {question.type === 'quiz' && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Puntos:</span>
                  </label>
                  <input
                    type="number"
                    value={question.points || 0}
                    onChange={(e) => onUpdate({ ...question, points: parseInt(e.target.value) })}
                    className="input input-bordered input-sm w-20"
                    min="0"
                  />
                </div>
              )}
            </div>
              </>
            )}
          </div>

          {/* Botón eliminar */}
          <button
            onClick={onDelete}
            className="btn btn-sm btn-ghost btn-circle text-error"
          >
            <IconTrash size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
