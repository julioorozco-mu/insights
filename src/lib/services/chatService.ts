import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";

export class ChatService {
  async sendMessage(lessonId: string, userId: string, userName: string, message: string, userRole: string = "student") {
    // Primero obtener o crear el chat
    let { data: chat } = await supabaseClient
      .from(TABLES.LIVE_CHATS)
      .select("id")
      .eq("lesson_id", lessonId)
      .single();

    if (!chat) {
      const { data: newChat } = await supabaseClient
        .from(TABLES.LIVE_CHATS)
        .insert({ lesson_id: lessonId, is_active: true })
        .select()
        .single();
      chat = newChat;
    }

    if (!chat) throw new Error("No se pudo crear el chat");

    const { error } = await supabaseClient
      .from(TABLES.LIVE_CHAT_MESSAGES)
      .insert({
        live_chat_id: chat.id,
        user_id: userId,
        user_name: userName,
        user_role: userRole,
        message,
      });

    if (error) throw error;
  }

  async getMessages(lessonId: string) {
    const { data: chat } = await supabaseClient
      .from(TABLES.LIVE_CHATS)
      .select("id")
      .eq("lesson_id", lessonId)
      .single();

    if (!chat) return [];

    const { data } = await supabaseClient
      .from(TABLES.LIVE_CHAT_MESSAGES)
      .select("*")
      .eq("live_chat_id", chat.id)
      .order("created_at", { ascending: true });

    return data || [];
  }

  subscribeToMessages(lessonId: string, callback: (message: unknown) => void) {
    // Supabase realtime subscription
    const channel = supabaseClient
      .channel(`chat:${lessonId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: TABLES.LIVE_CHAT_MESSAGES,
      }, (payload) => {
        callback(payload.new);
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }
}

export const chatService = new ChatService();
