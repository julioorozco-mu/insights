import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";
import { StorageBucket } from "@/utils/getFileUrl";

// Buckets públicos (usan getPublicUrl)
const PUBLIC_BUCKETS: StorageBucket[] = ['avatars', 'covers', 'certificates', 'files'];

// URL base de Supabase Storage
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export class FileService {
  /**
   * Sube un archivo a Supabase Storage
   * @param file - Archivo a subir
   * @param path - Ruta dentro del bucket (sin el nombre del bucket)
   * @param bucket - Nombre del bucket (default: attachments)
   * @returns URL del archivo (pública o firmada según el bucket)
   */
  async uploadFile(file: File, path: string, bucket: StorageBucket = "attachments") {
    console.log(`[FileService] Subiendo archivo a bucket '${bucket}', path: '${path}'`);
    console.log(`[FileService] Archivo: ${file.name}, tamaño: ${(file.size / 1024).toFixed(2)} KB, tipo: ${file.type}`);
    console.log(`[FileService] Iniciando subida directa...`);
    
    // Subir directamente sin verificar sesión (la política RLS lo manejará)
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });

    console.log(`[FileService] Respuesta recibida:`, { data, error });

    if (error) {
      console.error(`[FileService] Error al subir:`, error);
      if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
        throw new Error(`Error de permisos: No tienes permiso para subir a '${bucket}'.`);
      }
      if (error.message?.includes('Bucket not found')) {
        throw new Error(`El bucket '${bucket}' no existe.`);
      }
      throw error;
    }
    
    console.log(`[FileService] Archivo subido exitosamente:`, data);
    
    if (!data) {
      throw new Error('No se recibió respuesta del servidor de storage');
    }

    // Buckets públicos: usar URL pública
    if (PUBLIC_BUCKETS.includes(bucket)) {
      const { data: publicUrl } = supabaseClient.storage
        .from(bucket)
        .getPublicUrl(data.path);
      return publicUrl.publicUrl;
    }

    // Buckets privados: usar URL firmada (1 año)
    const { data: signedUrl, error: signedError } = await supabaseClient.storage
      .from(bucket)
      .createSignedUrl(data.path, 60 * 60 * 24 * 365);

    if (signedError) throw signedError;
    return signedUrl.signedUrl;
  }

  async deleteFile(path: string, bucket: StorageBucket = "attachments") {
    const { error } = await supabaseClient.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  }

  async saveFileRecord(data: {
    ownerId: string;
    fileName: string;
    fileType: string;
    url: string;
    sizeKB?: number;
    category?: string;
    relatedId?: string;
  }) {
    const { data: result, error } = await supabaseClient
      .from(TABLES.FILE_ATTACHMENTS)
      .insert({
        owner_id: data.ownerId,
        file_name: data.fileName,
        file_type: data.fileType,
        url: data.url,
        size_kb: data.sizeKB,
        category: data.category || "general",
        related_id: data.relatedId,
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async getFilesByOwner(ownerId: string) {
    const { data } = await supabaseClient
      .from(TABLES.FILE_ATTACHMENTS)
      .select("*")
      .eq("owner_id", ownerId)
      .eq("is_deleted", false);

    return data || [];
  }
}

export const fileService = new FileService();
