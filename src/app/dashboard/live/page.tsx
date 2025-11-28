"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { liveRepository } from "@/lib/repositories/liveRepository";
import { LiveStream } from "@/types/live";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/common/Loader";
import { GoLiveButton } from "@/components/live/GoLiveButton";
import { formatDateTime } from "@/utils/formatDate";

export default function LivePage() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadStreams = async () => {
      try {
        const data = await liveRepository.findAll();
        setStreams(data);
      } catch (error) {
        console.error("Error loading streams:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStreams();
  }, []);

  if (loading) {
    return <Loader />;
  }

  const canCreateStream = user?.role === "instructor" || user?.role === "admin";
  const activeStreams = streams.filter((s) => s.active);
  const upcomingStreams = streams.filter((s) => !s.active);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Transmisiones en Vivo</h1>
          <p className="text-base-content/70">
            {canCreateStream ? "Gestiona tus transmisiones" : "Únete a las transmisiones en vivo"}
          </p>
        </div>
        {canCreateStream && <GoLiveButton />}
      </div>

      {activeStreams.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-error"></span>
            </span>
            En Vivo Ahora
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeStreams.map((stream) => (
              <Link
                key={stream.id}
                href={`/dashboard/live/${stream.id}`}
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow border-2 border-error"
              >
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <h3 className="card-title">{stream.title}</h3>
                    <div className="badge badge-error gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                      EN VIVO
                    </div>
                  </div>
                  {stream.description && (
                    <p className="text-sm text-base-content/70">{stream.description}</p>
                  )}
                  <div className="card-actions justify-between items-center mt-4">
                    <span className="text-sm text-base-content/60">
                      {stream.instructorName || "Instructor"}
                    </span>
                    <button className="btn btn-primary btn-sm text-white">Unirse</button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-4">
          {activeStreams.length > 0 ? "Próximas Transmisiones" : "Todas las Transmisiones"}
        </h2>
        {upcomingStreams.length === 0 && activeStreams.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center py-12">
              <div className="text-6xl mb-4">📹</div>
              <h2 className="text-2xl font-bold mb-2">No hay transmisiones disponibles</h2>
              <p className="text-base-content/70 mb-4">
                {canCreateStream
                  ? "Comienza tu primera transmisión en vivo"
                  : "Vuelve pronto para ver nuevas transmisiones"}
              </p>
              {canCreateStream && <GoLiveButton />}
            </div>
          </div>
        ) : upcomingStreams.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center py-8">
              <p className="text-base-content/70">No hay transmisiones programadas</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingStreams.map((stream) => (
              <Link
                key={stream.id}
                href={`/dashboard/live/${stream.id}`}
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
              >
                <div className="card-body">
                  <h3 className="card-title">{stream.title}</h3>
                  {stream.description && (
                    <p className="text-sm text-base-content/70 line-clamp-2">
                      {stream.description}
                    </p>
                  )}
                  <div className="card-actions justify-between items-center mt-4">
                    <span className="text-sm text-base-content/60">
                      {stream.instructorName || "Instructor"}
                    </span>
                    <div className="badge badge-outline">Programada</div>
                  </div>
                  {stream.startAt && (
                    <div className="text-xs text-base-content/50 mt-2">
                      {formatDateTime(stream.startAt)}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
