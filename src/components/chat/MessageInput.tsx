"use client";

import { useState } from "react";

interface MessageInputProps {
  onSend: (message: string) => void;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message.trim());
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-base-300">
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="input input-bordered flex-1"
          maxLength={500}
        />
        <button type="submit" className="btn btn-primary text-white" disabled={!message.trim()}>
          Enviar
        </button>
      </div>
    </form>
  );
}
