"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader } from "@/components/common/Loader";
import { 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconAlertTriangle, 
  IconCopy, 
  IconChartBar,
  IconClock,
  IconListCheck,
  IconEye,
  IconSearch,
  IconFilter,
  IconDatabase,
} from "@tabler/icons-react";
import { formatDate } from "@/utils/formatDate";
import { useAuth } from "@/hooks/useAuth";
import { Test, TestStatus } from "@/types/test";

export default function TestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [testToDelete, setTestToDelete] = useState<Test | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cloning, setCloning] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TestStatus | "all">("all");
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    loadTests();
  }, [statusFilter]);

  const loadTests = async () => {
    try {
      setLoading(true);
      setDbError(null);
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      
      const res = await fetch(`/api/admin/tests?${params.toString()}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        // Verificar si es error de tabla no existente
        if (errorData.error?.includes("tabla") || res.status === 500) {
          setDbError("migration_needed");
        }
        console.error("Error loading tests:", errorData);
        setTests([]);
        return;
      }
      
      const data = await res.json();
      setTests(data.tests || []);
    } catch (error) {
      console.error("Error loading tests:", error);
      setDbError("connection_error");
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (test: Test) => {
    setTestToDelete(test);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!testToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tests/${testToDelete.id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        throw new Error("Error deleting test");
      }
      
      setShowDeleteModal(false);
      setTestToDelete(null);
      loadTests();
    } catch (error) {
      console.error("Error deleting test:", error);
      alert("Error al eliminar la evaluación");
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicateTest = async (test: Test) => {
    if (!user) return;
    
    setCloning(test.id);
    try {
      const res = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Copia de ${test.title}`,
          description: test.description,
          instructions: test.instructions,
          timeMode: test.timeMode,
          timeLimitMinutes: test.timeLimitMinutes,
          passingScore: test.passingScore,
          maxAttempts: test.maxAttempts,
          shuffleQuestions: test.shuffleQuestions,
          shuffleOptions: test.shuffleOptions,
          showResultsImmediately: test.showResultsImmediately,
          showCorrectAnswers: test.showCorrectAnswers,
          allowReview: test.allowReview,
          createdBy: user.id,
        }),
      });
      
      if (!res.ok) {
        throw new Error("Error duplicating test");
      }
      
      const data = await res.json();
      
      // Duplicar preguntas
      const questionsRes = await fetch(`/api/admin/tests/${test.id}/questions`);
      if (questionsRes.ok) {
        const questionsData = await questionsRes.json();
        for (const question of questionsData.questions || []) {
          await fetch(`/api/admin/tests/${data.test.id}/questions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
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
            }),
          });
        }
      }
      
      await loadTests();
      alert("Evaluación duplicada exitosamente");
    } catch (error) {
      console.error("Error duplicating test:", error);
      alert("Error al duplicar la evaluación");
    } finally {
      setCloning(null);
    }
  };

  const filteredTests = tests.filter(test => 
    test.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: TestStatus) => {
    switch (status) {
      case "draft":
        return "badge-warning";
      case "published":
        return "badge-success";
      case "archived":
        return "badge-neutral";
      default:
        return "badge-ghost";
    }
  };

  const getStatusLabel = (status: TestStatus) => {
    switch (status) {
      case "draft":
        return "Borrador";
      case "published":
        return "Publicado";
      case "archived":
        return "Archivado";
      default:
        return status;
    }
  };

  if (loading) {
    return <Loader />;
  }

  // Mostrar mensaje cuando se necesita ejecutar migración
  if (dbError === "migration_needed") {
    return (
      <div>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Evaluaciones de Acreditación</h1>
            <p className="text-base-content/70">Exámenes finales para acreditar microcredenciales</p>
          </div>
        </div>
        
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-warning mb-4 flex justify-center">
              <IconDatabase size={64} stroke={1.5} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Configuración Requerida</h2>
            <p className="text-base-content/70 mb-6 max-w-lg mx-auto">
              El sistema de evaluaciones de acreditación requiere ejecutar una migración en la base de datos.
              Contacta al administrador para ejecutar el archivo de migración:
            </p>
            <div className="bg-base-200 rounded-lg p-4 max-w-xl mx-auto mb-6">
              <code className="text-sm text-primary">
                supabase/migrations/add_tests_tables.sql
              </code>
            </div>
            <div className="alert alert-info max-w-xl mx-auto">
              <IconAlertTriangle size={20} />
              <div className="text-left">
                <h4 className="font-semibold">Instrucciones para el administrador:</h4>
                <ol className="text-sm list-decimal list-inside mt-2 space-y-1">
                  <li>Accede al panel de Supabase del proyecto</li>
                  <li>Ve a SQL Editor</li>
                  <li>Copia y ejecuta el contenido del archivo de migración</li>
                  <li>Recarga esta página</li>
                </ol>
              </div>
            </div>
            <button 
              onClick={loadTests}
              className="btn btn-primary text-white mt-6 mx-auto"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Evaluaciones de Acreditación</h1>
          <p className="text-base-content/70">
            Crea exámenes finales para acreditar microcredenciales
          </p>
        </div>
        <Link href="/dashboard/tests/create" className="btn btn-primary text-white gap-2">
          <IconPlus size={20} />
          Crear Evaluación
        </Link>
      </div>

      {/* Información sobre el sistema */}
      <div className="alert alert-info mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
          <h3 className="font-bold">¿Cómo funciona?</h3>
          <div className="text-sm">
            Las <strong>evaluaciones de acreditación</strong> son exámenes finales que se vinculan a un curso completo (microcredencial). 
            El estudiante debe completar todos los niveles antes de presentar la evaluación. 
            Los <strong>cuestionarios por nivel</strong> (en la sección Cuestionarios) son solo de práctica y no impactan la calificación final.
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40" size={20} />
                <input
                  type="text"
                  placeholder="Buscar evaluación..."
                  className="input input-bordered w-full pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <IconFilter size={20} className="text-base-content/60" />
              <select
                className="select select-bordered"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TestStatus | "all")}
              >
                <option value="all">Todos los estados</option>
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {filteredTests.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-primary mb-4 flex justify-center">
              <IconListCheck size={64} stroke={1.5} />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {searchTerm || statusFilter !== "all" 
                ? "No se encontraron evaluaciones" 
                : "No hay evaluaciones de acreditación"}
            </h2>
            <p className="text-base-content/70 mb-4">
              {searchTerm || statusFilter !== "all"
                ? "Intenta con otros filtros de búsqueda"
                : "Crea evaluaciones finales para acreditar a los estudiantes en tus microcredenciales"}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Link href="/dashboard/tests/create" className="btn btn-primary text-white gap-2 mx-auto">
                <IconPlus size={20} />
                Crear Primera Evaluación
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredTests.map((test) => (
            <div key={test.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h2 className="card-title text-xl">{test.title}</h2>
                      <div className={`badge ${getStatusBadge(test.status)} text-white`}>
                        {getStatusLabel(test.status)}
                      </div>
                      {test.timeMode === "timed" && (
                        <div className="badge badge-info text-white gap-1">
                          <IconClock size={12} />
                          {test.timeLimitMinutes} min
                        </div>
                      )}
                    </div>
                    {test.description && (
                      <p className="text-base-content/70 mb-3 line-clamp-2">{test.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-base-content/60 flex-wrap">
                      <span className="flex items-center gap-1">
                        <IconListCheck size={16} />
                        {test.questionsCount || 0} preguntas
                      </span>
                      <span>•</span>
                      <span>Aprobación: {test.passingScore}%</span>
                      <span>•</span>
                      <span>Intentos: {test.maxAttempts}</span>
                      <span>•</span>
                      <span>Creada: {formatDate(test.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button 
                      onClick={() => router.push(`/dashboard/tests/${test.id}/edit`)}
                      className="btn btn-sm btn-primary text-white gap-2"
                    >
                      <IconEdit size={16} />
                      Editar
                    </button>
                    {test.status === "published" && (
                      <button 
                        onClick={() => router.push(`/dashboard/tests/${test.id}/results`)}
                        className="btn btn-sm btn-info text-white gap-2"
                      >
                        <IconChartBar size={16} />
                        Resultados
                      </button>
                    )}
                    <button 
                      onClick={() => handleDuplicateTest(test)}
                      className="btn btn-sm btn-ghost gap-2"
                      disabled={cloning === test.id}
                    >
                      <IconCopy size={16} />
                      {cloning === test.id ? "..." : "Duplicar"}
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(test)}
                      className="btn btn-sm btn-ghost text-error gap-2"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && testToDelete && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-error/20 p-4">
                <IconAlertTriangle size={48} className="text-error" />
              </div>
            </div>
            
            <h3 className="font-bold text-xl text-center mb-2">
              ¿Eliminar Evaluación?
            </h3>
            
            <div className="text-center mb-6">
              <p className="text-base-content/70 mb-4">
                Estás a punto de eliminar la evaluación:
              </p>
              <p className="font-semibold text-lg">&quot;{testToDelete.title}&quot;</p>
            </div>

            <div className="alert alert-error mb-4">
              <IconAlertTriangle size={20} />
              <div>
                <h4 className="font-semibold">Esta acción archivará la evaluación</h4>
                <p className="text-sm">
                  La evaluación no estará disponible para los estudiantes.
                </p>
              </div>
            </div>
            
            <div className="modal-action">
              <button 
                className="btn btn-ghost" 
                onClick={() => {
                  setShowDeleteModal(false);
                  setTestToDelete(null);
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
                {deleting ? "Procesando..." : "Eliminar"}
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

