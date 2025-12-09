"use client";

import { Award, Download, Share2, Shield, Clock, CheckCircle } from "lucide-react";

export default function CredentialsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Mis Credenciales</h1>
        <p className="text-base-content/70">Gestiona tus certificados y microcredenciales obtenidas</p>
      </div>

      {/* Coming Soon Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center py-16">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Award className="w-12 h-12 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Wallet de Credenciales</h2>
          <p className="text-base-content/70 max-w-md mb-8">
            Tu wallet de credenciales estará disponible próximamente. Podrás ver, 
            descargar y compartir todas tus microcredenciales verificables.
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
              <Shield className="w-6 h-6 text-success" />
            </div>
            <h3 className="font-semibold">Verificables</h3>
            <p className="text-sm text-base-content/60">
              Credenciales con verificación blockchain
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-info/10 rounded-full flex items-center justify-center mb-3">
              <Download className="w-6 h-6 text-info" />
            </div>
            <h3 className="font-semibold">Descargables</h3>
            <p className="text-sm text-base-content/60">
              Descarga tus certificados en formato PDF
            </p>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body items-center text-center">
            <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mb-3">
              <Share2 className="w-6 h-6 text-warning" />
            </div>
            <h3 className="font-semibold">Compartibles</h3>
            <p className="text-sm text-base-content/60">
              Comparte en LinkedIn y redes profesionales
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
