import { agoraService } from "@/lib/services/agoraService";
import { liveRepository } from "@/lib/repositories/liveRepository";
import { CreateLiveStreamData, AgoraStreamResponse, LiveStream } from "@/types/live";
import { AppError } from "@/utils/handleError";

export class LiveService {
  async createLiveStream(data: CreateLiveStreamData): Promise<LiveStream> {
    try {
      // Create live stream channel in Agora
      const agoraStream = await agoraService.createLiveStream({
        channelName: `course-${data.instructorId}-${Date.now()}`,
      });

      if (!agoraStream.channelName || !agoraStream.appId) {
        throw new AppError("Error al crear el canal en Agora");
      }

      // Save to Firestore
      const liveStream = await liveRepository.create({
        ...data,
        agoraChannel: agoraStream.channelName,
        agoraAppId: agoraStream.appId,
      });

      return liveStream;
    } catch (error) {
      console.error("Error creating live stream:", error);
      throw new AppError("Error al crear la transmisión en vivo");
    }
  }

  async getLiveStream(id: string): Promise<LiveStream | null> {
    return liveRepository.findById(id);
  }

  async getAllLiveStreams(): Promise<LiveStream[]> {
    return liveRepository.findAll();
  }

  async getActiveLiveStreams(): Promise<LiveStream[]> {
    return liveRepository.findActive();
  }

  async getInstructorLiveStreams(instructorId: string): Promise<LiveStream[]> {
    return liveRepository.findByInstructor(instructorId);
  }

  async startLiveStream(id: string): Promise<void> {
    await liveRepository.updateStatus(id, true);
  }

  async stopLiveStream(id: string): Promise<void> {
    await liveRepository.updateStatus(id, false);
  }

  async deleteLiveStream(id: string): Promise<void> {
    const stream = await liveRepository.findById(id);
    if (!stream) {
      throw new AppError("Transmisión no encontrada", "NOT_FOUND", 404);
    }

    // Delete from Agora (cleanup)
    try {
      await agoraService.deleteLiveStream(stream.agoraChannel);
    } catch (error) {
      console.error("Error deleting Agora channel:", error);
    }

    // Delete from Firestore
    await liveRepository.delete(id);
  }

  async getStreamStatus(channelName: string): Promise<{
    status: string;
    isActive: boolean;
  }> {
    try {
      const streamInfo = await agoraService.getStreamStats(channelName);
      return {
        status: streamInfo.status || "idle",
        isActive: streamInfo.isActive,
      };
    } catch (error) {
      console.error("Error getting stream status:", error);
      throw new AppError("Error al obtener el estado del stream");
    }
  }
}

export const liveService = new LiveService();
