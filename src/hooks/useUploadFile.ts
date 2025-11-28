"use client";

import { useState } from "react";
import { fileService } from "@/lib/services/fileService";
import { FileUploadResult } from "@/types/file";
import { getErrorMessage } from "@/utils/handleError";

export function useUploadFile() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (
    file: File,
    path: string,
    metadata?: Record<string, string>
  ): Promise<FileUploadResult | null> => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      const result = await fileService.uploadFile({
        file,
        path,
        metadata,
      });

      setProgress(100);
      return result;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (path: string): Promise<boolean> => {
    try {
      setError(null);
      await fileService.deleteFile({ path });
      return true;
    } catch (err) {
      const message = getErrorMessage(err);
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
