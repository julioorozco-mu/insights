"use client";

import { useState } from "react";
import { IconX, IconPlus, IconTrash } from "@tabler/icons-react";

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (question: string, options: string[], duration: number) => void;
}

export default function CreatePollModal({ isOpen, onClose, onCreatePoll }: CreatePollModalProps) {
  const [pollType, setPollType] = useState<"yes-no" | "custom">("yes-no");
  const [question, setQuestion] = useState("");
  const [customOptions, setCustomOptions] = useState<string[]>(["", ""]);
  const [duration, setDuration] = useState(60);
  const [error, setError] = useState("");

  const handleAddOption = () => {
    if (customOptions.length < 3) {
      setCustomOptions([...customOptions, ""]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (customOptions.length > 2) {
      setCustomOptions(customOptions.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...customOptions];
    newOptions[index] = value;
    setCustomOptions(newOptions);
  };

  const handleSubmit = () => {
    setError("");

    if (!question.trim()) {
      setError("Por favor ingresa una pregunta");
      return;
    }

    const options = pollType === "yes-no" 
      ? ["Sí", "No"] 
      : customOptions.filter(opt => opt.trim() !== "");

    if (options.length < 2) {
      setError("Debes tener al menos 2 opciones");
      return;
    }

    onCreatePoll(question, options, duration);
    
    // Reset form
    setQuestion("");
    setCustomOptions(["", ""]);
    setDuration(60);
    setPollType("yes-no");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Crear Encuesta en Vivo</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <IconX size={20} />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        )}

        {/* Pregunta */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold">Pregunta</span>
          </label>
          <input
            type="text"
            placeholder="¿Cuál es tu pregunta?"
            className="input input-bordered w-full"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>

        {/* Tipo de encuesta */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-semibold ">Tipo de respuesta</span>
          </label>
          <div className="flex gap-2">
            <button
              className={`btn flex-1 ${pollType === "yes-no" ? "btn-primary text-white" : "btn-outline"}`}
              onClick={() => setPollType("yes-no")}
            >
              Sí / No
            </button>
            <button
              className={`btn flex-1 ${pollType === "custom" ? "btn-primary text-white" : "btn-outline"}`}
              onClick={() => setPollType("custom")}
            >
              Personalizado
            </button>
          </div>
        </div>

        {/* Opciones personalizadas */}
        {pollType === "custom" && (
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Opciones (máx. 3)</span>
            </label>
            <div className="space-y-2">
              {customOptions.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Opción ${index + 1}`}
                    className="input input-bordered flex-1"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                  />
                  {customOptions.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(index)}
                      className="btn btn-square btn-error btn-outline"
                    >
                      <IconTrash size={18} />
                    </button>
                  )}
                </div>
              ))}
              {customOptions.length < 3 && (
                <button
                  onClick={handleAddOption}
                  className="btn btn-sm btn-outline gap-2 w-full"
                >
                  <IconPlus size={16} />
                  Agregar opción
                </button>
              )}
            </div>
          </div>
        )}

        {/* Duración */}
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text font-semibold">Duración</span>
            <span className="label-text-alt">{duration} segundos</span>
          </label>
          <input
            type="range"
            min="20"
            max="120"
            step="10"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="range range-primary"
          />
          <div className="w-full flex justify-between text-xs px-2 mt-1">
            <span>20s</span>
            <span>60s</span>
            <span>120s</span>
          </div>
        </div>

        {/* Botones */}
        <div className="modal-action">
          <button onClick={onClose} className="btn btn-ghost">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="btn btn-primary text-white">
            Lanzar Encuesta
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
