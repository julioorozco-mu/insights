import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";

export class ResourceService {
  async create(data: {
    ownerId: string;
    fileName: string;
    fileType: string;
    url: string;
    sizeKB?: number;
    category?: string;
    description?: string;
    tags?: string[];
  }) {
    const { data: result, error } = await supabaseClient
      .from(TABLES.TEACHER_RESOURCES)
      .insert({
        owner_id: data.ownerId,
        file_name: data.fileName,
        file_type: data.fileType,
        url: data.url,
        size_kb: data.sizeKB,
        category: data.category || "document",
        description: data.description,
        tags: data.tags || [],
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async getByOwner(ownerId: string) {
    const { data } = await supabaseClient
      .from(TABLES.TEACHER_RESOURCES)
      .select("*")
      .eq("owner_id", ownerId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    return data || [];
  }

  async assignToCourses(resourceId: string, courseIds: string[]) {
    const { error } = await supabaseClient
      .from(TABLES.TEACHER_RESOURCES)
      .update({ assigned_courses: courseIds })
      .eq("id", resourceId);

    if (error) throw error;
  }

  async delete(resourceId: string) {
    const { error } = await supabaseClient
      .from(TABLES.TEACHER_RESOURCES)
      .update({ is_deleted: true })
      .eq("id", resourceId);

    if (error) throw error;
  }

  async getById(resourceId: string) {
    const { data } = await supabaseClient
      .from(TABLES.TEACHER_RESOURCES)
      .select("*")
      .eq("id", resourceId)
      .single();

    return data;
  }
}

export const resourceService = new ResourceService();
