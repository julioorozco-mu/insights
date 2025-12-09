"use client";

import { FileText, Clock, Shield, AlertTriangle, Search, Download } from "lucide-react";

export default function SystemLogsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Logs del Sistema</h1>
        <p className="text-base-content/70">Monitorea la actividad y eventos del sistema</p>
      </div>

      {/* Coming Soon Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center py-16">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <FileText className="w-12 h-12 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Centro de Logs</h2>
          <p className="text-base-content/70 max-w-md mb-8">
            El visor de logs estará disponible próximamente. Podrás monitorear 
            actividad de usuarios, errores del sistema y eventos de seguridad.
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
                <Search className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold">Búsqueda Avanzada</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Filtra logs por fecha, usuario, tipo de evento y más
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-success" />
              </div>
              <h3 className="font-semibold">Seguridad</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Monitorea intentos de acceso y actividad sospechosa
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <h3 className="font-semibold">Alertas</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Configura alertas para eventos críticos del sistema
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-info/10 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-info" />
              </div>
              <h3 className="font-semibold">Auditoría</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Rastrea cambios en configuraciones y datos sensibles
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-error/10 rounded-full flex items-center justify-center">
                <Download className="w-5 h-5 text-error" />
              </div>
              <h3 className="font-semibold">Exportar</h3>
            </div>
            <p className="text-sm text-base-content/60">
              Descarga logs en formato CSV, JSON o PDF
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
              Visualiza eventos del sistema en tiempo real
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
