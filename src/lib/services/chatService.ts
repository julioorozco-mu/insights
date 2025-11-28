import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/utils/constants";
import { ChatMessage, CreateMessageData } from "@/types/chat";
import { AppError } from "@/utils/handleError";

export class ChatService {
  private getMessagesCollection(streamId: string) {
    return collection(
      db,
      COLLECTIONS.LIVE_CHATS,
      streamId,
      COLLECTIONS.MESSAGES
    );
  }

  async sendMessage(streamId: string, data: CreateMessageData): Promise<string> {
    try {
      const messagesRef = this.getMessagesCollection(streamId);
      const messageData = {
        ...data,
        createdAt: Timestamp.fromDate(new Date()),
      };

      const docRef = await addDoc(messagesRef, messageData);
      return docRef.id;
    } catch (error) {
      console.error("Error sending message:", error);
      throw new AppError("Error al enviar el mensaje");
    }
  }

  subscribeToMessages(
    streamId: string,
    callback: (messages: ChatMessage[]) => void
  ): () => void {
    const messagesRef = this.getMessagesCollection(streamId);
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messages: ChatMessage[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
          } as ChatMessage;
        });
        callback(messages);
      },
      (error) => {
        console.error("Error subscribing to messages:", error);
      }
    );

    return unsubscribe;
  }

  async deleteMessage(streamId: string, messageId: string): Promise<void> {
    try {
      const messagesRef = this.getMessagesCollection(streamId);
      await deleteDoc(doc(messagesRef, messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
      throw new AppError("Error al eliminar el mensaje");
    }
  }

  async highlightMessage(
    streamId: string,
    messageId: string,
    highlighted: boolean
  ): Promise<void> {
    try {
      const messagesRef = this.getMessagesCollection(streamId);
      await updateDoc(doc(messagesRef, messageId), {
        isHighlighted: highlighted,
      });
    } catch (error) {
      console.error("Error highlighting message:", error);
      throw new AppError("Error al destacar el mensaje");
    }
  }
}

export const chatService = new ChatService();
