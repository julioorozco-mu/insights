"use client";

import { TrendingUp, Target, Award, BarChart3, Clock, CheckCircle } from "lucide-react";

export default function ProgressPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Mi Progreso</h1>
        <p className="text-base-content/70">Visualiza tu avance en las microcredenciales</p>
      </div>

      {/* Coming Soon Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center py-16">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <TrendingUp className="w-12 h-12 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Panel de Progreso</h2>
          <p className="text-base-content/70 max-w-md mb-8">
            El panel de progreso estará disponible próximamente. Podrás ver estadísticas 
            detalladas de tu avance, logros obtenidos y metas pendientes.
          </p>

          <div className="badge badge-primary badge-lg gap-2">
            <Clock className="w-4 h-4" />
            Próximamente
          </div>
        </div>
      </div>

      {/* Features Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-3">
              <BarChart3 className="w-6 h-6 text-success" />
            </div>
            <h3 className="font-semibold">Estadísticas</h3>
            <p className="text-sm text-base-content/60">
              Visualiza tu progreso con gráficos interactivos
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mb-3">
              <Target className="w-6 h-6 text-warning" />
            </div>
            <h3 className="font-semibold">Metas</h3>
            <p className="text-sm text-base-content/60">
              Establece y rastrea tus objetivos de aprendizaje
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-info/10 rounded-full flex items-center justify-center mb-3">
              <Award className="w-6 h-6 text-info" />
            </div>
            <h3 className="font-semibold">Logros</h3>
            <p className="text-sm text-base-content/60">
              Desbloquea insignias y reconocimientos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
