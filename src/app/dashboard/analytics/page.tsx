"use client";

import { BarChart3, TrendingUp, Users, BookOpen, Clock, Award } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Analytics</h1>
        <p className="text-base-content/70">Métricas y estadísticas de la plataforma</p>
      </div>

      {/* Coming Soon Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center py-16">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <BarChart3 className="w-12 h-12 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Panel de Analytics</h2>
          <p className="text-base-content/70 max-w-md mb-8">
            El módulo de analytics estará disponible próximamente. Podrás visualizar 
            métricas de cursos, estudiantes, engagement y más.
          </p>

          <div className="badge badge-primary badge-lg gap-2">
            <Clock className="w-4 h-4" />
            Próximamente
          </div>
        </div>
      </div>

      {/* Features Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold">Estudiantes</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Métricas de inscripción, retención y progreso de estudiantes
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-success" />
              </div>
              <h3 className="font-semibold">Cursos</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Popularidad de cursos, tasas de completado y calificaciones
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-info/10 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-info" />
              </div>
              <h3 className="font-semibold">Engagement</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Tiempo de visualización, interacciones y participación en vivo
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
                <Award className="w-5 h-5 text-warning" />
              </div>
              <h3 className="font-semibold">Certificados</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Certificados emitidos, validaciones y estadísticas de logros
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-error/10 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-error" />
              </div>
              <h3 className="font-semibold">Reportes</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Genera reportes personalizados y exporta datos en múltiples formatos
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-secondary" />
              </div>
              <h3 className="font-semibold">Tiempo Real</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Monitorea actividad en tiempo real durante transmisiones en vivo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
