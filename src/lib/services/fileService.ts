import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";

export class FileService {
  async uploadFile(file: File, path: string, bucket: string = "attachments") {
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(path, file);

    if (error) throw error;

    const { data: publicUrl } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl.publicUrl;
  }

  async deleteFile(path: string, bucket: string = "attachments") {
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
