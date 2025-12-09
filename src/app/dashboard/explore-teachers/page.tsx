"use client";

import { GraduationCap, Search, Star, MessageCircle, Clock, Users } from "lucide-react";

export default function ExploreTeachersPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Docentes</h1>
        <p className="text-base-content/70">Conoce a los expertos que imparten las microcredenciales</p>
      </div>

      {/* Coming Soon Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center py-16">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <GraduationCap className="w-12 h-12 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Directorio de Docentes</h2>
          <p className="text-base-content/70 max-w-md mb-8">
            El directorio de docentes estará disponible próximamente. Podrás explorar 
            perfiles, ver sus cursos y ponerte en contacto con ellos.
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
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold">Buscar Expertos</h3>
            <p className="text-sm text-base-content/60">
              Encuentra docentes por área de especialización
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mb-3">
              <Star className="w-6 h-6 text-warning" />
            </div>
            <h3 className="font-semibold">Valoraciones</h3>
            <p className="text-sm text-base-content/60">
              Consulta las reseñas de otros estudiantes
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-success" />
            </div>
            <h3 className="font-semibold">Contacto</h3>
            <p className="text-sm text-base-content/60">
              Envía mensajes directos a los docentes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
