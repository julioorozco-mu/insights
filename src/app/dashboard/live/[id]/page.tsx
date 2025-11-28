"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { liveRepository } from "@/lib/repositories/liveRepository";
import { LiveStream } from "@/types/live";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/common/Loader";
import AgoraStream from "@/components/live/AgoraStream";
import { ChatBox } from "@/components/chat/ChatBox";

export default function LiveStreamPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const loadStream = async () => {
      try {
        const data = await liveRepository.findById(params.id as string);
        setStream(data);
        
        // Obtener token de Agora
        if (data && user) {
          const role = data.instructorId === user.id ? 'host' : 'audience';
          const tokenRes = await fetch(
            `/api/agora-token?channel=${data.agoraChannel}&uid=${user.id}&role=${role}`
          );
          const tokenData = await tokenRes.json();
          setToken(tokenData.token);
        }
      } catch (error) {
        console.error("Error loading stream:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadStream();
    }
  }, [params.id, user]);

  if (loading) {
    return <Loader />;
  }

  if (!stream) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Transmisión no encontrada</h2>
        <button onClick={() => router.back()} className="btn btn-primary text-white">
          Volver
        </button>
      </div>
    );
  }

  const isInstructor = stream.instructorId === user?.id;

  return (
    <div>
      <button onClick={() => router.back()} className="btn btn-ghost mb-6">
        ← Volver
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-0">
              <div className="aspect-video bg-base-300 rounded-t-2xl overflow-hidden">
                {stream.active && token && user ? (
                  <AgoraStream
                    channel={stream.agoraChannel}
                    role={isInstructor ? 'host' : 'audience'}
                    token={token}
                    uid={user.id}
                    appId={stream.agoraAppId}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📹</div>
                      <p className="text-xl font-semibold mb-2">Transmisión no activa</p>
                      <p className="text-base-content/70">
                        {isInstructor ? 'Inicia la transmisión desde el navegador' : 'La transmisión comenzará pronto'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">{stream.title}</h1>
                    {stream.description && (
                      <p className="text-base-content/70">{stream.description}</p>
                    )}
                  </div>
                  {stream.active && (
                    <div className="badge badge-error gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                      EN VIVO
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-base-content/60">
                  <span>{stream.instructorName || "Instructor"}</span>
                </div>
              </div>
            </div>
          </div>

          {isInstructor && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title mb-4">Información de la Transmisión</h3>
                
                <div className="alert alert-success mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span>Transmite directamente desde tu navegador, sin necesidad de OBS</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Canal de Agora</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={stream.agoraChannel}
                        readOnly
                        className="input input-bordered flex-1 font-mono text-sm"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(stream.agoraChannel)}
                        className="btn btn-square"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  <div className="alert alert-info">
                    <div>
                      <p className="font-semibold">Cómo transmitir:</p>
                      <ol className="list-decimal list-inside text-sm mt-2 space-y-1">
                        <li>Haz clic en el botón de arriba para activar tu cámara</li>
                        <li>Permite el acceso a cámara y micrófono</li>
                        <li>¡Listo! Ya estás transmitiendo en vivo</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-xl h-[600px]">
            <ChatBox streamId={stream.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
