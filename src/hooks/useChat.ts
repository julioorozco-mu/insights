"use client";

import { useEffect, useState } from "react";
import { chatService } from "@/lib/services/chatService";
import { ChatMessage, CreateMessageData } from "@/types/chat";
import { getErrorMessage } from "@/utils/handleError";

export function useChat(streamId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!streamId) {
      setLoading(false);
      return;
    }

    const unsubscribe = chatService.subscribeToMessages(streamId, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [streamId]);

  const sendMessage = async (data: Omit<CreateMessageData, "createdAt">): Promise<boolean> => {
    try {
      setError(null);
      await chatService.sendMessage(streamId, data as CreateMessageData);
      return true;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return false;
    }
  };

  const deleteMessage = async (messageId: string): Promise<boolean> => {
    try {
      setError(null);
      await chatService.deleteMessage(streamId, messageId);
      return true;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return false;
    }
  };

  const highlightMessage = async (messageId: string, highlighted: boolean): Promise<boolean> => {
    try {
      setError(null);
      await chatService.highlightMessage(streamId, messageId, highlighted);
      return true;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return false;
    }
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    deleteMessage,
    highlightMessage,
  };
}
