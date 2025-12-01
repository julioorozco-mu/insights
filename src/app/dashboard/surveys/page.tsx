"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader } from "@/components/common/Loader";
import { IconChartBar, IconPlus, IconEdit, IconTrash, IconAlertTriangle, IconCopy } from "@tabler/icons-react";
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";
import { courseRepository } from "@/lib/repositories/courseRepository";
import { formatDate } from "@/utils/formatDate";
import { useAuth } from "@/hooks/useAuth";

interface Survey {
  id: string;
  title: string;
  description?: string;
  type: "entry" | "exit" | "general";
  questions: any[];
  isActive: boolean;
  isDeleted?: boolean;
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
      const { data, error } = await supabaseClient
        .from(TABLES.SURVEYS)
        .select('*')
        .or('is_deleted.is.null,is_deleted.eq.false');
      
      if (error) throw error;
      
      const surveysData = (data || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        type: s.type,
        questions: s.questions || [],
        isActive: s.is_active,
        isDeleted: s.is_deleted,
        createdAt: s.created_at,
      })) as Survey[];
      setSurveys(surveysData);
    } catch (error) {
      console.error("Error loading surveys:", error);
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
      if (isUsedInCourses) {
        // Baja lógica: marcar como eliminada
        await supabaseClient
          .from(TABLES.SURVEYS)
          .update({
            is_deleted: true,
            is_active: false,
            deleted_at: new Date().toISOString()
          })
          .eq('id', surveyToDelete.id);
      } else {
        // Eliminación física
        await supabaseClient
          .from(TABLES.SURVEYS)
          .delete()
          .eq('id', surveyToDelete.id);
      }
      
      setShowDeleteModal(false);
      setSurveyToDelete(null);
      loadSurveys();
    } catch (error) {
      console.error("Error deleting survey:", error);
      alert("Error al eliminar la encuesta");
    } finally {
      setDeleting(false);
    }
  };

  const handleCloneSurvey = async (survey: Survey) => {
    if (!user) return;
    
    setCloning(survey.id);
    try {
      // Crear una copia de la encuesta con un nuevo nombre
      const clonedSurvey = {
        title: `Copia de ${survey.title}`,
        description: survey.description || '',
        type: survey.type,
        questions: survey.questions || [],
        is_active: false, // Crear como inactiva para que el admin la revise
        is_deleted: false,
        created_by: user.id,
      };

      await supabaseClient.from(TABLES.SURVEYS).insert(clonedSurvey);
      
      // Recargar encuestas
      await loadSurveys();
      
      alert('Encuesta clonada exitosamente');
    } catch (error) {
      console.error('Error cloning survey:', error);
      alert('Error al clonar la encuesta');
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
      default:
        return "General";
    }
  };

  const getSurveyTypeBadge = (type: string) => {
    switch (type) {
      case "entry":
        return "badge-info text-white";
      case "exit":
        return "badge-success text-white";
      default:
        return "badge-neutral text-white";
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Encuestas</h1>
          <p className="text-base-content/70">Gestiona las encuestas de evaluación</p>
        </div>
        <Link href="/dashboard/surveys/new" className="btn btn-primary text-white gap-2">
          <IconPlus size={20} />
          Crear Encuesta
        </Link>
      </div>

      {surveys.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-primary mb-4 flex justify-center">
              <IconChartBar size={64} stroke={2} />
            </div>
            <h2 className="text-2xl font-bold mb-2">No hay encuestas creadas</h2>
            <p className="text-base-content/70 mb-4">
              Crea encuestas para evaluar a tus estudiantes
            </p>
            <Link href="/dashboard/surveys/new" className="btn btn-primary text-white gap-2 mx-auto">
              <IconPlus size={20} />
              Crear Primera Encuesta
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {surveys.map((survey) => (
            <div key={survey.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="card-title text-xl">{survey.title}</h2>
                      <div className={`badge ${getSurveyTypeBadge(survey.type)}`}>
                        {getSurveyTypeLabel(survey.type)}
                      </div>
                      {survey.isActive ? (
                        <div className="badge badge-success text-white">Activa</div>
                      ) : (
                        <div className="badge badge-ghost text-white">Inactiva</div>
                      )}
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
                  <div className="flex gap-2">
                    {user?.role === 'admin' && (
                      <>
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
                        </button>
                      </>
                    )}
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
              {isUsedInCourses ? '¿Desactivar Encuesta?' : '¿Eliminar Encuesta?'}
            </h3>
            
            <div className="text-center mb-6">
              <p className="text-base-content/70 mb-4">
                Estás a punto de {isUsedInCourses ? 'desactivar' : 'eliminar'} la encuesta:
              </p>
              <p className="font-semibold text-lg">"{surveyToDelete.title}"</p>
            </div>

            {isUsedInCourses ? (
              <div className="alert alert-warning text-white mb-4">
                <IconAlertTriangle size={20} />
                <div>
                  <h4 className="font-semibold">Esta encuesta está siendo usada en cursos</h4>
                  <p className="text-sm">
                    No se puede eliminar completamente. Se realizará una baja lógica y la encuesta se marcará como inactiva.
                  </p>
                </div>
              </div>
            ) : (
              <div className="alert alert-error text-white mb-4">
                <IconAlertTriangle size={20} />
                <div>
                  <h4 className="font-semibold">Esta acción no se puede deshacer</h4>
                  <p className="text-sm">
                    La encuesta será eliminada permanentemente de la base de datos.
                  </p>
                </div>
              </div>
            )}
            
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
                {deleting ? 'Procesando...' : (isUsedInCourses ? 'Desactivar' : 'Eliminar')}
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
