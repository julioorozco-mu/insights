"use client";

import { Bookmark, Heart, FolderHeart, Bell, Clock, BookOpen } from "lucide-react";

export default function FavoritesPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Mis Favoritos</h1>
        <p className="text-base-content/70">Cursos guardados para ver más tarde</p>
      </div>

      {/* Coming Soon Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center py-16">
          <div className="w-24 h-24 bg-error/10 rounded-full flex items-center justify-center mb-6">
            <Heart className="w-12 h-12 text-error" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Lista de Favoritos</h2>
          <p className="text-base-content/70 max-w-md mb-8">
            Tu lista de favoritos estará disponible próximamente. Podrás guardar 
            cursos que te interesen y acceder a ellos fácilmente.
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
            <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center mb-3">
              <Bookmark className="w-6 h-6 text-error" />
            </div>
            <h3 className="font-semibold">Guardar Cursos</h3>
            <p className="text-sm text-base-content/60">
              Marca cursos para inscribirte después
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-info/10 rounded-full flex items-center justify-center mb-3">
              <FolderHeart className="w-6 h-6 text-info" />
            </div>
            <h3 className="font-semibold">Organizar</h3>
            <p className="text-sm text-base-content/60">
              Crea colecciones de cursos por tema
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mb-3">
              <Bell className="w-6 h-6 text-warning" />
            </div>
            <h3 className="font-semibold">Alertas</h3>
            <p className="text-sm text-base-content/60">
              Recibe notificaciones de disponibilidad
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
