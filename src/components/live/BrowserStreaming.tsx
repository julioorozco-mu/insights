"use client";

import { useState, useRef, useEffect } from 'react';
import { IconCamera, IconMicrophone, IconPlayerStop, IconPlayerPlay } from '@tabler/icons-react';

interface Props {
  streamKey: string;
  rtmpUrl: string;
  onStreamEnd?: () => void;
}

export default function BrowserStreaming({ streamKey, rtmpUrl, onStreamEnd }: Props) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<{ video: MediaDeviceInfo[], audio: MediaDeviceInfo[] }>({
    video: [],
    audio: []
  });
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [selectedAudio, setSelectedAudio] = useState<string>('');

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      const audioDevices = devices.filter(d => d.kind === 'audioinput');
      
      setDevices({ video: videoDevices, audio: audioDevices });
      
      if (videoDevices.length > 0) setSelectedVideo(videoDevices[0].deviceId);
      if (audioDevices.length > 0) setSelectedAudio(audioDevices[0].deviceId);
    } catch (err) {
      console.error('Error loading devices:', err);
    }
  };

  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedVideo ? { exact: selectedVideo } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          deviceId: selectedAudio ? { exact: selectedAudio } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      streamRef.current = stream;
      setHasPermission(true);
      setError(null);
    } catch (err: any) {
      console.error('Error accessing media devices:', err);
      setError(`Error al acceder a la cámara/micrófono: ${err.message}`);
    }
  };

  const stopPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setHasPermission(false);
  };

  const startStreaming = async () => {
    if (!streamRef.current) {
      setError('Primero inicia la vista previa');
      return;
    }

    setError('⚠️ Streaming directo desde navegador requiere WebRTC. Mux no soporta RTMP desde el navegador directamente. Necesitas usar OBS, Streamlabs, o software similar para transmitir a Mux.');
    
    // Nota: El navegador no puede hacer streaming RTMP directamente
    // Se necesitaría un servidor WebRTC intermediario o usar MediaRecorder para grabar
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    stopPreview();
    if (onStreamEnd) onStreamEnd();
  };

  return (
    <div className="space-y-4">
      {/* Vista previa de video */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {!hasPermission && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-300">
            <div className="text-center">
              <IconCamera size={64} className="mx-auto mb-4 text-base-content/40" />
              <p className="text-base-content/60">Vista previa de cámara</p>
            </div>
          </div>
        )}
      </div>

      {/* Selección de dispositivos */}
      {!isStreaming && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Cámara</span>
            </label>
            <select
              value={selectedVideo}
              onChange={(e) => setSelectedVideo(e.target.value)}
              className="select select-bordered select-sm"
              disabled={hasPermission}
            >
              {devices.video.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Cámara ${device.deviceId.substring(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Micrófono</span>
            </label>
            <select
              value={selectedAudio}
              onChange={(e) => setSelectedAudio(e.target.value)}
              className="select select-bordered select-sm"
              disabled={hasPermission}
            >
              {devices.audio.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Micrófono ${device.deviceId.substring(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-warning">
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Controles */}
      <div className="flex gap-2">
        {!hasPermission ? (
          <button
            onClick={startPreview}
            className="btn btn-primary text-white gap-2 flex-1"
          >
            <IconCamera size={20} />
            Iniciar Vista Previa
          </button>
        ) : !isStreaming ? (
          <>
            <button
              onClick={stopPreview}
              className="btn btn-ghost flex-1"
            >
              Detener Vista Previa
            </button>
            <button
              onClick={startStreaming}
              className="btn btn-success text-white gap-2 flex-1"
            >
              <IconPlayerPlay size={20} />
              Iniciar Transmisión
            </button>
          </>
        ) : (
          <button
            onClick={stopStreaming}
            className="btn btn-error text-white gap-2 flex-1"
          >
            <IconPlayerStop size={20} />
            Detener Transmisión
          </button>
        )}
      </div>

      {/* Alternativa: Usar OBS */}
      <div className="alert alert-info">
        <div>
          <h3 className="font-bold">💡 Recomendación</h3>
          <p className="text-sm mt-2">
            Para transmitir a Mux, necesitas usar software de streaming como:
          </p>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li><strong>OBS Studio</strong> (gratis, recomendado)</li>
            <li><strong>Streamlabs</strong> (gratis)</li>
            <li><strong>vMix</strong> (de pago, profesional)</li>
          </ul>
          <p className="text-sm mt-2">
            El navegador no puede transmitir RTMP directamente por limitaciones de seguridad.
          </p>
        </div>
      </div>
    </div>
  );
}
