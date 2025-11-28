"use client";

import { useState } from "react";
import { useLiveStream } from "@/hooks/useLiveStream";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export function GoLiveButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { createStream, loading } = useLiveStream();
  const { user } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const stream = await createStream({
      title,
      description,
      instructorId: user.id,
    });

    if (stream) {
      setIsOpen(false);
      router.push(`/dashboard/live/${stream.id}`);
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-primary text-white">
        🔴 Iniciar Transmisión
      </button>

      {isOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Nueva Transmisión en Vivo</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Título</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input input-bordered"
                  required
                  placeholder="Ej: Clase de React Avanzado"
                />
              </div>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Descripción (opcional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="textarea textarea-bordered"
                  placeholder="Describe tu transmisión..."
                />
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary text-white" disabled={loading}>
                  {loading ? "Creando..." : "Crear Transmisión"}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setIsOpen(false)}>close</button>
          </form>
        </dialog>
      )}
    </>
  );
}
