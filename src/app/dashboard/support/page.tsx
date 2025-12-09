"use client";

import { HelpCircle, MessageSquare, FileQuestion, Book, Clock, Mail } from "lucide-react";

export default function SupportPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Soporte</h1>
        <p className="text-base-content/70">Centro de ayuda y asistencia técnica</p>
      </div>

      {/* Coming Soon Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center py-16">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <HelpCircle className="w-12 h-12 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Centro de Soporte</h2>
          <p className="text-base-content/70 max-w-md mb-8">
            El centro de soporte estará disponible próximamente. Podrás crear tickets, 
            consultar FAQs y acceder a documentación de ayuda.
          </p>

          <div className="badge badge-primary badge-lg gap-2">
            <Clock className="w-4 h-4" />
            Próximamente
          </div>

          {/* Contacto temporal */}
          <div className="mt-8 p-4 bg-base-200 rounded-lg">
            <p className="text-sm text-base-content/70 mb-2">
              Mientras tanto, puedes contactarnos en:
            </p>
            <a 
              href="mailto:soporte@marcaunach.edu.mx" 
              className="btn btn-outline btn-primary btn-sm gap-2"
            >
              <Mail className="w-4 h-4" />
              soporte@marcaunach.edu.mx
            </a>
          </div>
        </div>
      </div>

      {/* Features Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold">Tickets</h3>
            <p className="text-sm text-base-content/60">
              Crea y da seguimiento a tus solicitudes de soporte
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-3">
              <FileQuestion className="w-6 h-6 text-success" />
            </div>
            <h3 className="font-semibold">FAQs</h3>
            <p className="text-sm text-base-content/60">
              Respuestas a las preguntas más frecuentes
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-info/10 rounded-full flex items-center justify-center mb-3">
              <Book className="w-6 h-6 text-info" />
            </div>
            <h3 className="font-semibold">Documentación</h3>
            <p className="text-sm text-base-content/60">
              Guías y tutoriales para usar la plataforma
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
