"use client";

import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Loader } from "../common/Loader";

interface ChatBoxProps {
  streamId: string;
  instructorId?: string;
  pollComponent?: React.ReactNode;
}

export function ChatBox({ streamId, instructorId, pollComponent }: ChatBoxProps) {
  const { messages, loading, sendMessage } = useChat(streamId);
  const { user } = useAuth();

  if (!streamId) {
    return (
      <div className="flex flex-col h-full bg-base-200 rounded-lg items-center justify-center p-4">
        <p className="text-base-content/70">Chat no disponible</p>
      </div>
    );
  }

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="flex flex-col h-full bg-base-200 rounded-lg">
      {/* Encuesta activa (si existe) */}
      {pollComponent && (
        <div className="p-4 border-b border-base-300">
          {pollComponent}
        </div>
      )}
      
      <MessageList 
        messages={messages} 
        currentUserId={user?.id}
        instructorId={instructorId}
      />
      <MessageInput
        onSend={(message) => {
          if (!user) return;
          sendMessage({
            userId: user.id,
            userName: user.name || 'Usuario',
            userAvatar: user.avatarUrl || '',
            message,
          });
        }}
      />
    </div>
  );
}
