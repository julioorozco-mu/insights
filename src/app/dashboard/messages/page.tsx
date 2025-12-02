"use client";

import { MessageCircle, Users, Bell, Search, Clock, Send } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Mensajes</h1>
        <p className="text-base-content/70">Centro de comunicación y notificaciones</p>
      </div>

      {/* Coming Soon Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center py-16">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <MessageCircle className="w-12 h-12 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Centro de Mensajes</h2>
          <p className="text-base-content/70 max-w-md mb-8">
            El sistema de mensajería estará disponible próximamente. Podrás comunicarte 
            con instructores, estudiantes y recibir notificaciones importantes.
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
              <Send className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold">Mensajes Directos</h3>
            <p className="text-sm text-base-content/60">
              Comunícate directamente con instructores y compañeros
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-success" />
            </div>
            <h3 className="font-semibold">Grupos</h3>
            <p className="text-sm text-base-content/60">
              Participa en grupos de discusión por curso
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mb-3">
              <Bell className="w-6 h-6 text-warning" />
            </div>
            <h3 className="font-semibold">Notificaciones</h3>
            <p className="text-sm text-base-content/60">
              Recibe alertas de clases, tareas y anuncios
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
