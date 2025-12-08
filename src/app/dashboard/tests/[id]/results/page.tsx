"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader } from "@/components/common/Loader";
import {
  IconArrowLeft,
  IconUsers,
  IconChartBar,
  IconTrophy,
  IconClock,
  IconCheck,
  IconX,
  IconDownload,
  IconSearch,
  IconFilter,
  IconEye,
  IconRefresh,
} from "@tabler/icons-react";
import { formatDate } from "@/utils/formatDate";
import { Test, TestAttempt, TestAttemptStatus } from "@/types/test";

interface TestResultsData {
  test: Test;
  stats: {
    totalAttempts: number;
    completedAttempts: number;
    averageScore: number;
    passRate: number;
    accreditationRate: number;
    averageTimeSeconds: number;
    highestScore: number;
    lowestScore: number;
  };
  attempts: Array<TestAttempt & {
    student: {
      id: string;
      name: string;
      lastName?: string;
      email: string;
      avatarUrl?: string;
    };
  }>;
}

export default function TestResultsPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TestResultsData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TestAttemptStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"date" | "score" | "name">("date");

  useEffect(() => {
    if (testId) {
      loadResults();
    }
  }, [testId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/tests/${testId}/results`);
      
      if (!res.ok) {
        if (res.status === 404) {
          // Si no hay API, mostrar datos vacíos
          setData(null);
        }
        return;
      }
      
      const responseData = await res.json();
      setData(responseData);
    } catch (error) {
      console.error("Error loading results:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: TestAttemptStatus, passed?: boolean) => {
    switch (status) {
      case "completed":
        return passed ? (
          <span className="badge badge-success text-white gap-1">
            <IconCheck size={12} /> Aprobado
          </span>
        ) : (
          <span className="badge badge-error text-white gap-1">
            <IconX size={12} /> Reprobado
          </span>
        );
      case "in_progress":
        return <span className="badge badge-warning text-white">En progreso</span>;
      case "abandoned":
        return <span className="badge badge-ghost">Abandonado</span>;
      case "timed_out":
        return <span className="badge badge-error text-white">Tiempo agotado</span>;
      default:
        return <span className="badge badge-ghost">{status}</span>;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Filtrar y ordenar intentos
  const filteredAttempts = data?.attempts
    ?.filter((attempt) => {
      const matchesSearch =
        attempt.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attempt.student.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || attempt.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "score":
          return (b.percentage || 0) - (a.percentage || 0);
        case "name":
          return a.student.name.localeCompare(b.student.name);
        case "date":
        default:
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      }
    }) || [];

  if (loading) {
    return <Loader />;
  }

  // Vista cuando no hay datos o no hay intentos
  if (!data) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/tests" className="btn btn-ghost btn-sm">
            <IconArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Resultados de Evaluación</h1>
            <p className="text-base-content/70">Estadísticas y resultados de estudiantes</p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-16">
            <div className="text-primary/40 mb-4 flex justify-center">
              <IconChartBar size={80} stroke={1} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Sin resultados aún</h2>
            <p className="text-base-content/70 mb-6 max-w-md mx-auto">
              Esta evaluación no tiene intentos registrados todavía.
              Los resultados aparecerán aquí cuando los estudiantes completen la evaluación.
            </p>
            <div className="flex justify-center gap-4">
              <button onClick={loadResults} className="btn btn-outline gap-2">
                <IconRefresh size={18} />
                Actualizar
              </button>
              <Link href="/dashboard/tests" className="btn btn-primary text-white">
                Volver a Evaluaciones
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/tests" className="btn btn-ghost btn-sm">
            <IconArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{data.test.title}</h1>
            <p className="text-base-content/70">Resultados y estadísticas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadResults} className="btn btn-ghost btn-sm gap-2">
            <IconRefresh size={18} />
            Actualizar
          </button>
          <button className="btn btn-outline btn-sm gap-2">
            <IconDownload size={18} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body py-4">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-xl">
                <IconUsers size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-base-content/60">Total Intentos</p>
                <p className="text-2xl font-bold">{data.stats.totalAttempts}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body py-4">
            <div className="flex items-center gap-4">
              <div className="bg-success/10 p-3 rounded-xl">
                <IconTrophy size={24} className="text-success" />
              </div>
              <div>
                <p className="text-sm text-base-content/60">Tasa de Aprobación</p>
                <p className="text-2xl font-bold">{data.stats.passRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body py-4">
            <div className="flex items-center gap-4">
              <div className="bg-info/10 p-3 rounded-xl">
                <IconChartBar size={24} className="text-info" />
              </div>
              <div>
                <p className="text-sm text-base-content/60">Promedio</p>
                <p className="text-2xl font-bold">{data.stats.averageScore.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body py-4">
            <div className="flex items-center gap-4">
              <div className="bg-warning/10 p-3 rounded-xl">
                <IconClock size={24} className="text-warning" />
              </div>
              <div>
                <p className="text-sm text-base-content/60">Tiempo Promedio</p>
                <p className="text-2xl font-bold">{formatTime(data.stats.averageTimeSeconds)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rango de calificaciones */}
      <div className="card bg-base-100 shadow-lg mb-8">
        <div className="card-body py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-base-content/60 mb-1">Rango de Calificaciones</p>
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-success font-bold text-lg">
                    {data.stats.highestScore.toFixed(1)}%
                  </span>
                  <span className="text-base-content/60 text-sm ml-1">más alta</span>
                </div>
                <div className="h-8 w-px bg-base-300" />
                <div>
                  <span className="text-error font-bold text-lg">
                    {data.stats.lowestScore.toFixed(1)}%
                  </span>
                  <span className="text-base-content/60 text-sm ml-1">más baja</span>
                </div>
                <div className="h-8 w-px bg-base-300" />
                <div>
                  <span className="text-primary font-bold text-lg">
                    {data.test.passingScore}%
                  </span>
                  <span className="text-base-content/60 text-sm ml-1">para aprobar</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-base-content/60">Acreditaciones</p>
              <p className="text-2xl font-bold text-success">
                {data.stats.accreditationRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card bg-base-100 shadow-lg mb-6">
        <div className="card-body py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40" size={20} />
                <input
                  type="text"
                  placeholder="Buscar estudiante..."
                  className="input input-bordered w-full pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                className="select select-bordered"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TestAttemptStatus | "all")}
              >
                <option value="all">Todos los estados</option>
                <option value="completed">Completados</option>
                <option value="in_progress">En progreso</option>
                <option value="abandoned">Abandonados</option>
                <option value="timed_out">Tiempo agotado</option>
              </select>
              <select
                className="select select-bordered"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "score" | "name")}
              >
                <option value="date">Ordenar por fecha</option>
                <option value="score">Ordenar por calificación</option>
                <option value="name">Ordenar por nombre</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de resultados */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body p-0">
          {filteredAttempts.length === 0 ? (
            <div className="text-center py-12">
              <IconUsers size={48} className="mx-auto text-base-content/30 mb-4" />
              <p className="text-base-content/60">
                {searchTerm || statusFilter !== "all"
                  ? "No se encontraron resultados con los filtros aplicados"
                  : "No hay intentos registrados"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Intento</th>
                    <th>Calificación</th>
                    <th>Estado</th>
                    <th>Tiempo</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttempts.map((attempt) => (
                    <tr key={attempt.id} className="hover">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              {attempt.student.avatarUrl ? (
                                <img
                                  src={attempt.student.avatarUrl}
                                  alt={attempt.student.name}
                                  className="rounded-full"
                                />
                              ) : (
                                <span className="text-primary font-bold">
                                  {attempt.student.name.charAt(0)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="font-bold">
                              {attempt.student.name} {attempt.student.lastName || ""}
                            </div>
                            <div className="text-sm text-base-content/60">
                              {attempt.student.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-ghost">#{attempt.attemptNumber}</span>
                      </td>
                      <td>
                        {attempt.percentage !== null && attempt.percentage !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="radial-progress text-sm"
                              style={{
                                "--value": attempt.percentage,
                                "--size": "2.5rem",
                                "--thickness": "3px",
                              } as React.CSSProperties}
                              role="progressbar"
                            >
                              <span className="text-xs font-bold">
                                {attempt.percentage.toFixed(0)}
                              </span>
                            </div>
                            <span className="text-base-content/60">%</span>
                          </div>
                        ) : (
                          <span className="text-base-content/40">-</span>
                        )}
                      </td>
                      <td>{getStatusBadge(attempt.status, attempt.passed ?? undefined)}</td>
                      <td>
                        {attempt.timeSpentSeconds ? (
                          <span className="text-sm">
                            {formatTime(attempt.timeSpentSeconds)}
                          </span>
                        ) : (
                          <span className="text-base-content/40">-</span>
                        )}
                      </td>
                      <td>
                        <div className="text-sm">
                          {formatDate(attempt.startTime)}
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm gap-1"
                          onClick={() => {
                            // TODO: Abrir modal con detalle de respuestas
                            console.log("Ver detalle:", attempt.id);
                          }}
                        >
                          <IconEye size={16} />
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

