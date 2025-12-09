"use client";

import { CalendarDays, Clock, Video, Users, Bell, CheckCircle } from "lucide-react";

export default function CalendarPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Calendario</h1>
        <p className="text-base-content/70">Gestiona tus clases, eventos y sesiones en vivo</p>
      </div>

      {/* Coming Soon Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center py-16">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <CalendarDays className="w-12 h-12 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Calendario de Actividades</h2>
          <p className="text-base-content/70 max-w-md mb-8">
            El calendario estará disponible próximamente. Podrás programar clases en vivo, 
            gestionar horarios y sincronizar con tu calendario personal.
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
                <Video className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold">Clases en Vivo</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Programa y gestiona tus sesiones de streaming en vivo
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-success" />
              </div>
              <h3 className="font-semibold">Reuniones</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Agenda reuniones con estudiantes y tutorías personalizadas
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-warning" />
              </div>
              <h3 className="font-semibold">Recordatorios</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Recibe notificaciones antes de cada evento programado
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-info/10 rounded-full flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-info" />
              </div>
              <h3 className="font-semibold">Sincronización</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Sincroniza con Google Calendar, Outlook y otros servicios
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-error/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-error" />
              </div>
              <h3 className="font-semibold">Fechas Límite</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Visualiza entregas de tareas y fechas de evaluaciones
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-secondary" />
              </div>
              <h3 className="font-semibold">Zonas Horarias</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Soporte para múltiples zonas horarias en eventos internacionales
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
