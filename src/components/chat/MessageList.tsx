"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/types/chat";
import { formatRelativeTime } from "@/utils/formatDate";

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId?: string;
  instructorId?: string;
}

export function MessageList({ messages, currentUserId, instructorId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Solo hacer scroll si el contenedor existe y hay mensajes
    if (messagesEndRef.current && containerRef.current && messages.length > 0) {
      const container = containerRef.current;
      
      // Verificar si el usuario está cerca del final del chat (dentro de 100px)
      const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
      
      // Solo hacer scroll automático si el usuario está cerca del final
      // Esto evita interrumpir al usuario si está leyendo mensajes anteriores
      if (isNearBottom) {
        // Usar requestAnimationFrame para asegurar que el DOM se haya actualizado
        requestAnimationFrame(() => {
          if (container) {
            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;
            const maxScrollTop = scrollHeight - clientHeight;
            
            // Hacer scroll suave solo dentro del contenedor
            container.scrollTo({
              top: maxScrollTop,
              behavior: 'smooth'
            });
          }
        });
      }
    }
  }, [messages]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-3"
      style={{ 
        scrollBehavior: 'smooth',
        overscrollBehavior: 'contain', // Evita que el scroll se propague al padre
        position: 'relative' // Asegura que el contenedor esté posicionado correctamente
      }}
    >
      {messages.length === 0 ? (
        <div className="text-center text-base-content/50 py-8">
          No hay mensajes aún. ¡Sé el primero en escribir!
        </div>
      ) : (
        messages.map((message) => {
          const isOwn = message.userId === currentUserId;
          const isInstructor = instructorId && message.userId === instructorId;
          
          return (
            <div
              key={message.id}
              className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""} ${
                message.isHighlighted ? "bg-warning/10 p-2 rounded-lg" : ""
              }`}
            >
              <div className="avatar">
                <div className="w-8 h-8 rounded-full">
                  {message.userAvatar ? (
                    <img src={message.userAvatar} alt={message.userName} />
                  ) : (
                    <div className="bg-neutral text-neutral-content flex items-center justify-center w-full h-full text-sm">
                      {message.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div className={`flex flex-col ${isOwn ? "items-end" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-base-content">
                    {message.userName}
                  </span>
                  {isOwn ? (
                    <span className="badge badge-primary badge-sm text-white font-bold">Tú</span>
                  ) : isInstructor ? (
                    <span className="badge badge-error badge-sm text-white font-bold">Ponente</span>
                  ) : (
                    <span className="badge badge-ghost badge-sm">Estudiante</span>
                  )}
                  <span className="text-xs text-base-content/50">
                    {formatRelativeTime(message.createdAt)}
                  </span>
                </div>
                <div
                  className={`mt-1 px-3 py-2 rounded-lg max-w-xs font-bold ${
                    isInstructor
                      ? "bg-red-500 text-white"
                      : isOwn
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-black"
                  }`}
                >
                  {message.message}
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
