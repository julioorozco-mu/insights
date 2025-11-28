"use client";

import { useEffect, useRef, useState } from "react";

interface ScreenShareViewProps {
  screenStream: MediaStream;
  cameraStream?: MediaStream;
}

export default function ScreenShareView({ screenStream, cameraStream }: ScreenShareViewProps) {
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraContainerRef = useRef<HTMLDivElement>(null);
  const [cameraSize, setCameraSize] = useState<"small" | "medium" | "large">("medium");
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const getSizeClass = () => {
    switch (cameraSize) {
      case "small":
        return "w-32 h-24";
      case "medium":
        return "w-48 h-36";
      case "large":
        return "w-64 h-48";
      default:
        return "w-48 h-36";
    }
  };

  return (
    <div className="relative w-full h-full bg-black">
      {/* Pantalla compartida (fondo) */}
      <video
        ref={screenVideoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />

      {/* Video del ponente (flotante y arrastrable) */}
      {cameraStream && (
        <div
          ref={cameraContainerRef}
          className={`absolute ${getSizeClass()} cursor-move group`}
          style={{ 
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 10 
          }}
          onMouseDown={handleMouseDown}
        >
            <video
              ref={cameraVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-lg border-2 border-white shadow-2xl"
            />
            
            {/* Controles de tamaño */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={() => setCameraSize("small")}
                className={`btn btn-xs ${cameraSize === "small" ? "btn-primary" : "btn-ghost"} text-white`}
                title="Pequeño"
              >
                S
              </button>
              <button
                onClick={() => setCameraSize("medium")}
                className={`btn btn-xs ${cameraSize === "medium" ? "btn-primary" : "btn-ghost"} text-white`}
                title="Mediano"
              >
                M
              </button>
              <button
                onClick={() => setCameraSize("large")}
                className={`btn btn-xs ${cameraSize === "large" ? "btn-primary" : "btn-ghost"} text-white`}
                title="Grande"
              >
                L
              </button>
            </div>

            {/* Indicador de arrastre */}
            <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="badge badge-sm bg-black/50 text-white border-none">
                Arrastra para mover
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
