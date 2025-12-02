"use client";

import { CreditCard, Clock, FileText, TrendingUp } from "lucide-react";

export default function PaymentsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Pagos</h1>
        <p className="text-base-content/70">Gestiona tus pagos y transacciones</p>
      </div>

      {/* Coming Soon Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center py-16">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <CreditCard className="w-12 h-12 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Módulo de Pagos</h2>
          <p className="text-base-content/70 max-w-md mb-8">
            El sistema de pagos estará disponible próximamente. Podrás gestionar 
            inscripciones, ver historial de transacciones y descargar facturas.
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
              <CreditCard className="w-6 h-6 text-success" />
            </div>
            <h3 className="font-semibold">Pagos Seguros</h3>
            <p className="text-sm text-base-content/60">
              Procesa pagos con tarjeta de crédito y débito de forma segura
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-info/10 rounded-full flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-info" />
            </div>
            <h3 className="font-semibold">Historial</h3>
            <p className="text-sm text-base-content/60">
              Consulta el historial completo de tus transacciones
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6 text-warning" />
            </div>
            <h3 className="font-semibold">Reportes</h3>
            <p className="text-sm text-base-content/60">
              Genera reportes y descarga facturas en PDF
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
