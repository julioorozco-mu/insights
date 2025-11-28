"use client";

import { useState, useRef } from "react";
import { IconFileSpreadsheet, IconUpload, IconAlertCircle, IconCheckbox, IconSquare } from "@tabler/icons-react";
import { Question } from "@/types/form";
import { v4 as uuid } from "uuid";

interface ExcelImporterProps {
  onImport: (questions: Question[]) => void;
}

type RowType = 'question' | 'answer';

interface RowData {
  content: string;
  type: RowType;
  originalIndex: number;
}

export default function ExcelImporter({ onImport }: ExcelImporterProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [questionType, setQuestionType] = useState<'single_choice' | 'multiple_choice'>('single_choice');
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<RowData[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      
      // Importación dinámica de XLSX solo cuando se necesita
      const XLSX = await import('xlsx');
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          // Convertir a formato RowData con detección inteligente
          const rows: RowData[] = [];
          jsonData.forEach((row, index) => {
            // Combinar todas las celdas de la fila en un solo string
            const content = row
              .filter(cell => cell && String(cell).trim())
              .map(cell => String(cell).trim())
              .join(' ');
            
            if (content) {
              // Detectar automáticamente si es pregunta o respuesta
              const isQuestion = 
                content.includes('?') || // Contiene signo de interrogación
                content.match(/^\d+\.?\s/) || // Empieza con número (1., 2., etc.)
                !content.match(/^[a-z]\)/i); // NO empieza con a), b), c)
              
              rows.push({
                content,
                type: isQuestion ? 'question' : 'answer',
                originalIndex: index,
              });
            }
          });

          setPreviewData(rows);
        } catch (err) {
          setError("Error al leer el archivo. Asegúrate de que sea un archivo Excel válido.");
          console.error(err);
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      setError("Error al cargar la librería de Excel. Intenta recargar la página.");
      console.error(err);
    }
  };

  const toggleRowType = (index: number) => {
    if (!previewData) return;
    
    const newData = [...previewData];
    newData[index].type = newData[index].type === 'question' ? 'answer' : 'question';
    setPreviewData(newData);
  };

  const processExcelData = () => {
    if (!previewData || previewData.length === 0) {
      setError("No hay datos para procesar");
      return;
    }

    // Validar que haya al menos una pregunta
    const hasQuestion = previewData.some(row => row.type === 'question');
    if (!hasQuestion) {
      setError("Debes marcar al menos una fila como pregunta");
      return;
    }

    try {
      const questions: Question[] = [];
      let currentQuestion: string | null = null;
      let currentOptions: Array<{ label: string; value: string }> = [];
      let questionIndex = 0;

      // Procesar las filas agrupando preguntas con sus respuestas
      previewData.forEach((row, index) => {
        if (row.type === 'question') {
          // Si ya había una pregunta anterior, guardarla
          if (currentQuestion) {
            if (currentOptions.length > 0) {
              questions.push({
                id: uuid(),
                type: questionType,
                questionText: currentQuestion,
                options: currentOptions,
                isRequired: false,
                order: questions.length,
              });
            }
          }
          
          // Iniciar nueva pregunta
          currentQuestion = row.content;
          currentOptions = [];
          questionIndex++;
        } else {
          // Es una respuesta
          if (currentQuestion) {
            const optionText = row.content.trim();
            // Remover los prefijos a), b), c), etc. si existen
            const cleanText = optionText.replace(/^[a-z]\)\s*/i, '').replace(/✅/g, '').trim();
            
            currentOptions.push({
              label: cleanText,
              value: `option_${questionIndex}_${currentOptions.length}`,
            });
          }
        }
      });

      // Guardar la última pregunta
      if (currentQuestion && currentOptions.length > 0) {
        questions.push({
          id: uuid(),
          type: questionType,
          questionText: currentQuestion,
          options: currentOptions,
          isRequired: false,
          order: questions.length,
        });
      }

      if (questions.length === 0) {
        setError("No se encontraron preguntas válidas con opciones");
        return;
      }

      // Validar que todas las preguntas tengan al menos una opción
      const questionsWithoutOptions = questions.filter(q => !q.options || q.options.length === 0);
      if (questionsWithoutOptions.length > 0) {
        setError("Todas las preguntas deben tener al menos una respuesta. Verifica que las filas de respuestas estén después de su pregunta.");
        return;
      }

      onImport(questions);
      setIsModalOpen(false);
      setPreviewData(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError("Error al procesar los datos. Verifica el formato del archivo.");
      console.error(err);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="btn btn-outline btn-success gap-2"
      >
        <IconFileSpreadsheet size={20} />
        Importar desde Excel
      </button>

      {isModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg mb-4">Importar Preguntas desde Excel</h3>

            <div className="space-y-4">
              {/* Instrucciones */}
              <div className="alert alert-info">
                <IconAlertCircle size={20} />
                <div className="text-sm">
                  <p className="font-semibold mb-1">Instrucciones:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Carga un archivo Excel donde cada fila contiene una pregunta o una respuesta</li>
                    <li>Después de cargar, marca cuáles filas son <strong>preguntas</strong> y cuáles son <strong>respuestas</strong></li>
                    <li>Las respuestas deben estar después de su pregunta correspondiente</li>
                    <li>Haz clic en cada fila para cambiar su tipo</li>
                  </ul>
                </div>
              </div>

              {/* Selector de tipo de pregunta */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Tipo de pregunta *</span>
                </label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as 'single_choice' | 'multiple_choice')}
                  className="select select-bordered"
                >
                  <option value="single_choice">Opción Única (una sola respuesta)</option>
                  <option value="multiple_choice">Opción Múltiple (varias respuestas)</option>
                </select>
              </div>

              {/* Cargador de archivo */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Archivo Excel</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="file-input file-input-bordered file-input-primary w-full"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="alert alert-error">
                  <IconAlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              {/* Preview con selección de tipo */}
              {previewData && previewData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Marca cada fila como Pregunta o Respuesta:</span>
                    <span className="text-sm text-base-content/70">
                      {previewData.filter(row => row.type === 'question').length} pregunta(s), 
                      {' '}{previewData.filter(row => row.type === 'answer').length} respuesta(s)
                    </span>
                  </div>
                  <div className="alert alert-warning text-sm py-2">
                    <IconAlertCircle size={16} />
                    <span>💡 Haz clic en cada fila para cambiar entre Pregunta y Respuesta</span>
                  </div>
                  <div className="overflow-x-auto max-h-96 border border-base-300 rounded-lg">
                    <div className="space-y-1 p-2">
                      {previewData.map((row, index) => (
                        <div
                          key={index}
                          onClick={() => toggleRowType(index)}
                          className={`
                            flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all
                            ${row.type === 'question' 
                              ? 'bg-primary/10 border-2 border-primary hover:bg-primary/20' 
                              : 'bg-base-200 border-2 border-transparent hover:bg-base-300'
                            }
                          `}
                        >
                          <div className="flex-shrink-0 pt-1">
                            {row.type === 'question' ? (
                              <div className="flex items-center gap-2">
                                <IconCheckbox size={20} className="text-primary" />
                                <span className="badge badge-primary badge-sm">Pregunta</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <IconSquare size={20} className="text-base-content/40" />
                                <span className="badge badge-ghost badge-sm">Respuesta</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-base-content/50">Fila {index + 1}</span>
                            </div>
                            <p className={`text-sm ${row.type === 'question' ? 'font-semibold text-primary' : 'text-base-content/80'}`}>
                              {row.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-action">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setPreviewData(null);
                  setError(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={processExcelData}
                className="btn btn-primary text-white gap-2"
                disabled={!previewData || previewData.length === 0}
              >
                <IconUpload size={20} />
                Importar {previewData ? `${previewData.filter(row => row.type === 'question').length} Pregunta(s)` : ''}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => {
              setIsModalOpen(false);
              setPreviewData(null);
              setError(null);
            }}>close</button>
          </form>
        </dialog>
      )}
    </>
  );
}
