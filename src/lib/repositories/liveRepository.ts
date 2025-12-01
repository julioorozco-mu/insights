import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";

// Stub para liveRepository - implementar gradualmente
export class LiveRepository {
  async createLiveStream(lessonId: string, data: Record<string, unknown>) {
    const { data: result, error } = await supabaseClient
      .from(TABLES.LIVE_STREAMS)
      .insert({ lesson_id: lessonId, ...data })
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  async getLiveStream(lessonId: string) {
    const { data } = await supabaseClient
      .from(TABLES.LIVE_STREAMS)
      .select("*")
      .eq("lesson_id", lessonId)
      .single();
    return data;
  }

  async updateLiveStatus(lessonId: string, status: string) {
    const { error } = await supabaseClient
      .from(TABLES.LESSONS)
      .update({ live_status: status })
      .eq("id", lessonId);
    if (error) throw error;
  }

  async endLiveStream(lessonId: string) {
    await this.updateLiveStatus(lessonId, "ended");
  }
}

export const liveRepository = new LiveRepository();
