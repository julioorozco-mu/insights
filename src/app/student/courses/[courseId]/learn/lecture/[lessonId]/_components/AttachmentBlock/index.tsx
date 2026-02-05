'use client';

import React, { useState } from 'react';
import { IconPaperclip } from '@tabler/icons-react';

// =============================================================================
// TYPES
// =============================================================================

export interface ContentBlockData {
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  videoType?: 'youtube' | 'vimeo' | 'url';
  items?: string[];
  rows?: number;
  cols?: number;
  cells?: string[][];
  quizId?: string;
  quizTitle?: string;
  description?: string;
  styles?: Record<string, unknown>;
}

export interface AttachmentBlockProps {
  block: {
    id: string;
    type: string;
    content: string;
    data?: ContentBlockData;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function formatFileSize(kb?: number): string {
  if (!kb) return '';
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function extractStoragePath(url: string): { bucket: string; path: string } | null {
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
  if (match) {
    return { bucket: match[1], path: decodeURIComponent(match[2]) };
  }
  return null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function AttachmentBlock({ block }: AttachmentBlockProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileSize = block.data?.fileSize ? formatFileSize(block.data.fileSize / 1024) : '';

  const handleDownload = async () => {
    // Si ya tenemos URL firmada válida, usarla
    if (signedUrl) {
      window.open(signedUrl, '_blank');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Extraer bucket y path de la URL pública guardada
      const storageInfo = extractStoragePath(block.content);

      if (!storageInfo) {
        // Si no es URL de Supabase Storage, abrir directamente
        window.open(block.content, '_blank');
        return;
      }

      // Obtener URL firmada
      const apiUrl = `/api/student/getSignedUrl?bucket=${storageInfo.bucket}&path=${encodeURIComponent(storageInfo.path)}&expiresIn=3600`;
      const res = await fetch(apiUrl);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al obtener acceso al archivo');
      }

      const data = await res.json();
      setSignedUrl(data.signedUrl);
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Error getting signed URL:', err);
      setError(err instanceof Error ? err.message : 'Error al acceder al archivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-4 flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
        <IconPaperclip className="w-5 h-5 text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{block.data?.fileName || 'Archivo adjunto'}</p>
        {fileSize && <p className="text-xs text-gray-500">{fileSize}</p>}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Cargando...' : 'Ver archivo'}
      </button>
    </div>
  );
}
