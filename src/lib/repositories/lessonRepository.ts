import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";

export interface LessonData {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  content?: string;
  order: number;
  type: "video" | "livestream" | "hybrid";
  videoUrl?: string;
  videoPlaybackId?: string;
  videoRecordingId?: string;
  isLive: boolean;
  liveStreamId?: string;
  liveStreamKey?: string;
  livePlaybackId?: string;
  liveStatus: "idle" | "active" | "ended";
  scheduledStartTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  streamingType: "agora" | "external_link";
  liveStreamUrl?: string;
  recordedVideoUrl?: string;
  agoraChannel?: string;
  agoraAppId?: string;
  attachmentIds: string[];
  resourceIds: string[];
  formTemplateId?: string;
  surveyId?: string;
  entrySurveyId?: string;
  exitSurveyId?: string;
  startDate?: string;
  endDate?: string;
  durationMinutes?: number;
  createdBy: string;
  isActive: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonData {
  courseId: string;
  title: string;
  description?: string;
  content?: string;
  order?: number;
  type?: "video" | "livestream" | "hybrid";
  videoUrl?: string;
  scheduledStartTime?: string;
  streamingType?: "agora" | "external_link";
  liveStreamUrl?: string;
  startDate?: string;
  endDate?: string;
  durationMinutes?: number;
  createdBy: string;
}

export interface UpdateLessonData {
  title?: string;
  description?: string;
  content?: string;
  order?: number;
  type?: "video" | "livestream" | "hybrid";
  videoUrl?: string;
  isLive?: boolean;
  liveStatus?: "idle" | "active" | "ended";
  scheduledStartTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  streamingType?: "agora" | "external_link";
  liveStreamUrl?: string;
  recordedVideoUrl?: string;
  agoraChannel?: string;
  attachmentIds?: string[];
  resourceIds?: string[];
  formTemplateId?: string;
  surveyId?: string;
  entrySurveyId?: string;
  exitSurveyId?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  isPublished?: boolean;
}

export class LessonRepository {
  private table = TABLES.LESSONS;

  async create(data: CreateLessonData): Promise<LessonData> {
    const lessonData = {
      course_id: data.courseId,
      title: data.title,
      description: data.description,
      content: data.content,
      order: data.order ?? 0,
      type: data.type || "video",
      video_url: data.videoUrl,
      is_live: false,
      live_status: "idle",
      scheduled_start_time: data.scheduledStartTime,
      streaming_type: data.streamingType || "agora",
      live_stream_url: data.liveStreamUrl,
      start_date: data.startDate,
      end_date: data.endDate,
      duration_minutes: data.durationMinutes,
      created_by: data.createdBy,
      is_active: true,
      is_published: false,
      attachment_ids: [],
      resource_ids: [],
    };

    const { data: insertedLesson, error } = await supabaseClient
      .from(this.table)
      .insert(lessonData)
      .select()
      .single();

    if (error) {
      console.error("Error creating lesson:", error);
      throw error;
    }

    return this.mapToLesson(insertedLesson);
  }

  async findById(id: string): Promise<LessonData | null> {
    const { data, error } = await supabaseClient
      .from(this.table)
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToLesson(data);
  }

  async findByCourseId(courseId: string): Promise<LessonData[]> {
    const { data, error } = await supabaseClient
      .from(this.table)
      .select("*")
      .eq("course_id", courseId)
      .order("order", { ascending: true });

    if (error) {
      console.error("Error fetching lessons:", error);
      return [];
    }

    return (data || []).map(this.mapToLesson);
  }

  async findByIds(ids: string[]): Promise<LessonData[]> {
    if (ids.length === 0) return [];

    const { data, error } = await supabaseClient
      .from(this.table)
      .select("*")
      .in("id", ids)
      .order("order", { ascending: true });

    if (error) {
      console.error("Error fetching lessons by ids:", error);
      return [];
    }

    return (data || []).map(this.mapToLesson);
  }

  async update(id: string, data: UpdateLessonData): Promise<void> {
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.videoUrl !== undefined) updateData.video_url = data.videoUrl;
    if (data.isLive !== undefined) updateData.is_live = data.isLive;
    if (data.liveStatus !== undefined) updateData.live_status = data.liveStatus;
    if (data.scheduledStartTime !== undefined) updateData.scheduled_start_time = data.scheduledStartTime;
    if (data.actualStartTime !== undefined) updateData.actual_start_time = data.actualStartTime;
    if (data.actualEndTime !== undefined) updateData.actual_end_time = data.actualEndTime;
    if (data.streamingType !== undefined) updateData.streaming_type = data.streamingType;
    if (data.liveStreamUrl !== undefined) updateData.live_stream_url = data.liveStreamUrl;
    if (data.recordedVideoUrl !== undefined) updateData.recorded_video_url = data.recordedVideoUrl;
    if (data.agoraChannel !== undefined) updateData.agora_channel = data.agoraChannel;
    if (data.attachmentIds !== undefined) updateData.attachment_ids = data.attachmentIds;
    if (data.resourceIds !== undefined) updateData.resource_ids = data.resourceIds;
    if (data.formTemplateId !== undefined) updateData.form_template_id = data.formTemplateId;
    if (data.surveyId !== undefined) updateData.survey_id = data.surveyId;
    if (data.entrySurveyId !== undefined) updateData.entry_survey_id = data.entrySurveyId;
    if (data.exitSurveyId !== undefined) updateData.exit_survey_id = data.exitSurveyId;
    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.endDate !== undefined) updateData.end_date = data.endDate;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.isPublished !== undefined) updateData.is_published = data.isPublished;

    const { error } = await supabaseClient
      .from(this.table)
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Error updating lesson:", error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabaseClient
      .from(this.table)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting lesson:", error);
      throw error;
    }
  }

  async startLive(id: string): Promise<void> {
    await this.update(id, {
      isLive: true,
      liveStatus: "active",
      actualStartTime: new Date().toISOString(),
    });
  }

  async endLive(id: string): Promise<void> {
    await this.update(id, {
      isLive: false,
      liveStatus: "ended",
      actualEndTime: new Date().toISOString(),
    });
  }

  private mapToLesson(data: Record<string, unknown>): LessonData {
    return {
      id: data.id as string,
      courseId: data.course_id as string,
      title: data.title as string,
      description: data.description as string | undefined,
      content: data.content as string | undefined,
      order: data.order as number,
      type: (data.type as LessonData["type"]) || "video",
      videoUrl: data.video_url as string | undefined,
      videoPlaybackId: data.video_playback_id as string | undefined,
      videoRecordingId: data.video_recording_id as string | undefined,
      isLive: data.is_live as boolean,
      liveStreamId: data.live_stream_id as string | undefined,
      liveStreamKey: data.live_stream_key as string | undefined,
      livePlaybackId: data.live_playback_id as string | undefined,
      liveStatus: (data.live_status as LessonData["liveStatus"]) || "idle",
      scheduledStartTime: data.scheduled_start_time as string | undefined,
      actualStartTime: data.actual_start_time as string | undefined,
      actualEndTime: data.actual_end_time as string | undefined,
      streamingType: (data.streaming_type as LessonData["streamingType"]) || "agora",
      liveStreamUrl: data.live_stream_url as string | undefined,
      recordedVideoUrl: data.recorded_video_url as string | undefined,
      agoraChannel: data.agora_channel as string | undefined,
      agoraAppId: data.agora_app_id as string | undefined,
      attachmentIds: (data.attachment_ids as string[]) || [],
      resourceIds: (data.resource_ids as string[]) || [],
      formTemplateId: data.form_template_id as string | undefined,
      surveyId: data.survey_id as string | undefined,
      entrySurveyId: data.entry_survey_id as string | undefined,
      exitSurveyId: data.exit_survey_id as string | undefined,
      startDate: data.start_date as string | undefined,
      endDate: data.end_date as string | undefined,
      durationMinutes: data.duration_minutes as number | undefined,
      createdBy: data.created_by as string,
      isActive: data.is_active as boolean,
      isPublished: data.is_published as boolean,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

export const lessonRepository = new LessonRepository();
