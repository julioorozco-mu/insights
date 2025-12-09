"use client";

import { CheckCircle, Award, RefreshCw, Star, Clock, BookOpen } from "lucide-react";

export default function CompletedCoursesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Cursos Completados</h1>
        <p className="text-base-content/70">Historial de microcredenciales que has finalizado</p>
      </div>

      {/* Coming Soon Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center py-16">
          <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-12 h-12 text-success" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Historial de Completados</h2>
          <p className="text-base-content/70 max-w-md mb-8">
            Tu historial de cursos completados estará disponible próximamente. 
            Podrás ver todos los cursos que has finalizado y acceder a su contenido.
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
              <Award className="w-6 h-6 text-success" />
            </div>
            <h3 className="font-semibold">Certificados</h3>
            <p className="text-sm text-base-content/60">
              Accede a los certificados de cada curso completado
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-info/10 rounded-full flex items-center justify-center mb-3">
              <RefreshCw className="w-6 h-6 text-info" />
            </div>
            <h3 className="font-semibold">Repaso</h3>
            <p className="text-sm text-base-content/60">
              Vuelve a revisar el contenido cuando lo necesites
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mb-3">
              <Star className="w-6 h-6 text-warning" />
            </div>
            <h3 className="font-semibold">Calificaciones</h3>
            <p className="text-sm text-base-content/60">
              Consulta tus calificaciones y evaluaciones
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
