"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { resourceService } from "@/lib/services/resourceService";
import { supabaseClient } from "@/lib/supabase";
import { IconX, IconUpload, IconFile } from "@tabler/icons-react";

interface ResourceUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ResourceUploadModal({ onClose, onSuccess }: ResourceUploadModalProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"document" | "video" | "image" | "other">("document");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Auto-detectar categoría
      const fileType = selectedFile.type;
      if (fileType.startsWith("video/")) {
        setCategory("video");
      } else if (fileType.startsWith("image/")) {
        setCategory("image");
      } else if (
        fileType.includes("pdf") ||
        fileType.includes("document") ||
        fileType.includes("text") ||
        fileType.includes("spreadsheet") ||
        fileType.includes("presentation")
      ) {
        setCategory("document");
      } else {
        setCategory("other");
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    try {
      setUploading(true);

      // Subir a Supabase Storage
      const timestamp = Date.now();
      const filePath = `resources/${user.id}/${timestamp}_${file.name}`;
      
      setUploadProgress(50); // Simular progreso
      
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('files')
        .upload(filePath, file);
      
      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        alert("Error al subir el archivo");
        setUploading(false);
        return;
      }
      
      setUploadProgress(80);
      
      // Obtener URL pública
      const { data: urlData } = supabaseClient.storage
        .from('files')
        .getPublicUrl(filePath);
      
      const downloadURL = urlData.publicUrl;

      // Guardar en base de datos
      await resourceService.create({
        ownerId: user.id,
        fileName: file.name,
        fileType: file.type,
        url: downloadURL,
        sizeKB: Math.round(file.size / 1024),
        category,
        description: description || undefined,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      });

      setUploadProgress(100);
      setUploading(false);
      onSuccess();
    } catch (error) {
      console.error("Error uploading resource:", error);
      alert("Error al subir el recurso");
      setUploading(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Subir Recurso</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <IconX size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Selector de archivo */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Archivo *</span>
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              className="file-input file-input-bordered w-full"
              disabled={uploading}
            />
            {file && (
              <label className="label">
                <span className="label-text-alt flex items-center gap-2">
                  <IconFile size={14} />
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </label>
            )}
          </div>

          {/* Categoría */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Categoría</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              disabled={uploading}
            >
              <option value="document">Documento</option>
              <option value="video">Video</option>
              <option value="image">Imagen</option>
              <option value="other">Otro</option>
            </select>
          </div>

          {/* Descripción */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Descripción</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              placeholder="Descripción del recurso..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
            />
          </div>

          {/* Tags */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Etiquetas</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Separadas por comas (ej: política, comunicación, estrategia)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={uploading}
            />
            <label className="label">
              <span className="label-text-alt">Separa las etiquetas con comas</span>
            </label>
          </div>

          {/* Progreso */}
          {uploading && (
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Subiendo...</span>
                <span className="label-text-alt">{uploadProgress}%</span>
              </label>
              <progress
                className="progress progress-primary w-full"
                value={uploadProgress}
                max="100"
              />
            </div>
          )}
        </div>

        <div className="modal-action">
          <button onClick={onClose} className="btn btn-ghost" disabled={uploading}>
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            className="btn btn-error text-white gap-2"
            disabled={!file || uploading}
          >
            <IconUpload size={20} />
            {uploading ? "Subiendo..." : "Subir Recurso"}
          </button>
        </div>
      </div>
    </div>
  );
}
