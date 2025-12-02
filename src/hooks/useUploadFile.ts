"use client";

import { useState } from "react";
import { fileService } from "@/lib/services/fileService";
import { StorageBucket } from "@/utils/getFileUrl";
import { getErrorMessage } from "@/utils/handleError";

export function useUploadFile() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sube un archivo a Supabase Storage
   * @param file - Archivo a subir
   * @param bucket - Nombre del bucket (avatars, covers, certificates, resources, etc.)
   * @param customPath - Ruta personalizada dentro del bucket (opcional)
   * @returns URL del archivo subido o null si falla
   */
  const uploadFile = async (
    file: File,
    bucket: StorageBucket = 'covers',
    customPath?: string
  ): Promise<string | null> => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      // Generar path único si no se proporciona
      const timestamp = Date.now();
      const path = customPath || `${timestamp}_${file.name}`;

      setProgress(30);
      
      // Timeout de 30 segundos para la subida
      const uploadPromise = fileService.uploadFile(file, path, bucket);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: La subida tardó más de 30 segundos. Verifica tu conexión o contacta al administrador.')), 30000);
      });
      
      const url = await Promise.race([uploadPromise, timeoutPromise]);
      
      setProgress(100);
      return url;
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Error en useUploadFile:", err);
      setError(message);
      throw err; // Re-lanzar para que el componente pueda manejarlo
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (path: string, bucket: StorageBucket = 'covers'): Promise<boolean> => {
    try {
      setError(null);
      await fileService.deleteFile(path, bucket);
      return true;
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Error eliminando archivo:", err);
      setError(message);
      return false;
    }
  };

  return {
    uploadFile,
    deleteFile,
    uploading,
    progress,
    error,
  };
}
