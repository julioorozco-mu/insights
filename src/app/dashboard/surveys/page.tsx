"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader } from "@/components/common/Loader";
import { IconChartBar, IconPlus, IconEdit, IconTrash, IconAlertTriangle, IconCopy } from "@tabler/icons-react";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { formatDate } from "@/utils/formatDate";
import { useAuth } from "@/hooks/useAuth";

interface Survey {
  id: string;
  title: string;
  description?: string;
  type: "entry" | "exit" | "lesson";
  questions: any[];
  createdAt: string;
}

export default function SurveysPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null);
  const [isUsedInCourses, setIsUsedInCourses] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cloning, setCloning] = useState<string | null>(null);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      // Usar API del servidor para evitar problemas de RLS y timeouts
      const res = await fetch('/api/admin/getSurveys');
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Error loading surveys:", errorData);
        setSurveys([]);
        return;
      }
      
      const data = await res.json();
      setSurveys(data.surveys || []);
    } catch (error) {
      console.error("Error loading surveys:", error);
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  };

  const checkSurveyUsage = async (surveyId: string): Promise<boolean> => {
    try {
      // Verificar si la encuesta está siendo usada en algún curso
      const courses = await courseRepository.findAll();
      const isUsed = courses.some((course) => {
        return (
          course.entrySurveyId === surveyId ||
          course.exitSurveyId === surveyId
        );
      });
      return isUsed;
    } catch (error) {
      console.error("Error checking survey usage:", error);
      return false;
    }
  };

  const handleDeleteClick = async (survey: Survey) => {
    setSurveyToDelete(survey);
    const isUsed = await checkSurveyUsage(survey.id);
    setIsUsedInCourses(isUsed);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!surveyToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/surveys?id=${surveyToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar el cuestionario');
      }
      
      setShowDeleteModal(false);
      setSurveyToDelete(null);
      loadSurveys();
    } catch (error: any) {
      console.error("Error deleting survey:", error);
      alert(error.message || "Error al eliminar el cuestionario");
    } finally {
      setDeleting(false);
    }
  };

  const handleCloneSurvey = async (survey: Survey) => {
    if (!user) return;
    
    setCloning(survey.id);
    try {
      const response = await fetch('/api/admin/surveys/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyId: survey.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al clonar el cuestionario');
      }
      
      // Recargar cuestionarios
      await loadSurveys();
      
      alert(data.message || 'Cuestionario clonado exitosamente');
    } catch (error: any) {
      console.error('Error cloning survey:', error);
      alert(error.message || 'Error al clonar el cuestionario');
    } finally {
      setCloning(null);
    }
  };

  if (loading) {
    return <Loader />;
  }

  const getSurveyTypeLabel = (type: string) => {
    switch (type) {
      case "entry":
        return "Entrada";
      case "exit":
        return "Salida";
      case "lesson":
        return "Lección";
      default:
        return type;
    }
  };

  const getSurveyTypeBadge = (type: string) => {
    switch (type) {
      case "entry":
        return "badge-info text-white";
      case "exit":
        return "badge-success text-white";
      case "lesson":
        return "badge-warning text-white";
      default:
        return "badge-neutral text-white";
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Cuestionarios</h1>
          <p className="text-base-content/70">Gestiona los cuestionarios de evaluación</p>
        </div>
        <Link href="/dashboard/surveys/new" className="btn btn-primary text-white gap-2">
          <IconPlus size={20} />
          Crear Cuestionario
        </Link>
      </div>

      {surveys.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-primary mb-4 flex justify-center">
              <IconChartBar size={64} stroke={2} />
            </div>
            <h2 className="text-2xl font-bold mb-2">No hay cuestionarios creados</h2>
            <p className="text-base-content/70 mb-4">
              Crea cuestionarios para evaluar a tus estudiantes
            </p>
            <Link href="/dashboard/surveys/new" className="btn btn-primary text-white gap-2 mx-auto">
              <IconPlus size={20} />
              Crear Primer Cuestionario
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {surveys.map((survey, index) => (
            <div key={survey.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="card-body">
                <div className="flex justify-between items-start gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="badge badge-primary text-white font-bold">{index + 1}</span>
                      <h2 className="card-title text-xl">{survey.title}</h2>
                      <div className={`badge ${getSurveyTypeBadge(survey.type)}`}>
                        {getSurveyTypeLabel(survey.type)}
                      </div>
                      <div className="badge badge-success text-white">Activo</div>
                    </div>
                    {survey.description && (
                      <p className="text-base-content/70 mb-3">{survey.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-base-content/60">
                      <span>{survey.questions?.length || 0} preguntas</span>
                      <span>•</span>
                      <span>Creada: {formatDate(survey.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Acciones</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => router.push(`/dashboard/surveys/${survey.id}/edit`)}
                        className="btn btn-sm btn-primary text-white gap-2"
                      >
                        <IconEdit size={16} />
                        Editar
                      </button>
                      <button 
                        onClick={() => handleCloneSurvey(survey)}
                        className="btn btn-sm btn-info text-white gap-2"
                        disabled={cloning === survey.id}
                      >
                        <IconCopy size={16} />
                        {cloning === survey.id ? 'Clonando...' : 'Clonar'}
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(survey)}
                        className="btn btn-sm btn-ghost text-error gap-2"
                      >
                        <IconTrash size={16} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && surveyToDelete && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-error/20 p-4">
                <IconAlertTriangle size={48} className="text-error" />
              </div>
            </div>
            
            <h3 className="font-bold text-xl text-center mb-2">
              ¿Eliminar Cuestionario?
            </h3>
            
            <div className="text-center mb-6">
              <p className="text-base-content/70 mb-4">
                Estás a punto de eliminar el cuestionario:
              </p>
              <p className="font-semibold text-lg">"{surveyToDelete.title}"</p>
            </div>

            {isUsedInCourses && (
              <div className="alert alert-warning text-white mb-4">
                <IconAlertTriangle size={20} />
                <div>
                  <h4 className="font-semibold">⚠️ Este cuestionario está siendo usado en cursos</h4>
                  <p className="text-sm">
                    Se eliminarán también las referencias en los cursos asociados.
                  </p>
                </div>
              </div>
            )}
            
            <div className="alert alert-error text-white mb-4">
              <IconAlertTriangle size={20} />
              <div>
                <h4 className="font-semibold">Esta acción no se puede deshacer</h4>
                <p className="text-sm">
                  El cuestionario será eliminado permanentemente de la base de datos.
                </p>
              </div>
            </div>
            
            <div className="modal-action">
              <button 
                className="btn btn-ghost" 
                onClick={() => {
                  setShowDeleteModal(false);
                  setSurveyToDelete(null);
                }}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-error text-white"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Procesando...' : 'Eliminar'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => !deleting && setShowDeleteModal(false)}>
            <button>close</button>
          </div>
        </div>
      )}
    </div>
  );
}
