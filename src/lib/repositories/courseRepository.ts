import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";
import { Course, CreateCourseData, UpdateCourseData } from "@/types/course";

export class CourseRepository {
  private table = TABLES.COURSES;

  async create(data: CreateCourseData): Promise<Course> {
    const courseData = {
      title: data.title,
      description: data.description,
      cover_image_url: data.coverImageUrl,
      thumbnail_url: data.thumbnailUrl,
      teacher_ids: data.speakerIds || [],
      co_host_ids: data.coHostIds || [],
      lesson_ids: [],
      tags: data.tags || [],
      difficulty: data.difficulty,
      start_date: data.startDate,
      end_date: data.endDate,
      entry_survey_id: data.entrySurveyId,
      exit_survey_id: data.exitSurveyId,
      enrollment_rules: data.enrollmentRules,
      enrollment_start_date: data.enrollmentStartDate,
      enrollment_end_date: data.enrollmentEndDate,
      is_active: true,
    };

    const { data: insertedCourse, error } = await supabaseClient
      .from(this.table)
      .insert(courseData)
      .select()
      .single();

    if (error) {
      console.error("Error creating course:", error);
      throw error;
    }

    return this.mapToCourse(insertedCourse);
  }

  async findById(id: string): Promise<Course | null> {
    const { data, error } = await supabaseClient
      .from(this.table)
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToCourse(data);
  }

  async findAll(): Promise<Course[]> {
    const { data, error } = await supabaseClient
      .from(this.table)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching courses:", error);
      return [];
    }

    return (data || []).map(this.mapToCourse);
  }

  async findByTeacher(teacherId: string): Promise<Course[]> {
    const { data, error } = await supabaseClient
      .from(this.table)
      .select("*")
      .contains("teacher_ids", [teacherId])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching courses by teacher:", error);
      return [];
    }

    return (data || []).map(this.mapToCourse);
  }

  // Alias para compatibilidad
  async findBySpeaker(speakerId: string): Promise<Course[]> {
    return this.findByTeacher(speakerId);
  }

  async findBySpeakerEmail(email: string): Promise<Course[]> {
    // Primero buscar el teacher por email
    const { data: userData } = await supabaseClient
      .from(TABLES.USERS)
      .select("id")
      .eq("email", email)
      .single();

    if (!userData) return [];

    return this.findByTeacher(userData.id);
  }

  async findPublished(): Promise<Course[]> {
    const { data, error } = await supabaseClient
      .from(this.table)
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching published courses:", error);
      return [];
    }

    return (data || []).map(this.mapToCourse);
  }

  async update(id: string, data: UpdateCourseData): Promise<void> {
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.coverImageUrl !== undefined) updateData.cover_image_url = data.coverImageUrl;
    if (data.thumbnailUrl !== undefined) updateData.thumbnail_url = data.thumbnailUrl;
    if (data.speakerIds !== undefined) updateData.teacher_ids = data.speakerIds;
    if (data.coHostIds !== undefined) updateData.co_host_ids = data.coHostIds;
    if (data.lessonIds !== undefined) updateData.lesson_ids = data.lessonIds;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.endDate !== undefined) updateData.end_date = data.endDate;
    if (data.entrySurveyId !== undefined) updateData.entry_survey_id = data.entrySurveyId;
    if (data.exitSurveyId !== undefined) updateData.exit_survey_id = data.exitSurveyId;
    if (data.certificateTemplateId !== undefined) updateData.certificate_template_id = data.certificateTemplateId;
    if (data.certificateRules !== undefined) updateData.certificate_rules = data.certificateRules;

    const { error } = await supabaseClient
      .from(this.table)
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Error updating course:", error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabaseClient
      .from(this.table)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting course:", error);
      throw error;
    }
  }

  private mapToCourse(data: Record<string, unknown>): Course {
    return {
      id: data.id as string,
      title: data.title as string,
      description: data.description as string,
      coverImageUrl: data.cover_image_url as string | undefined,
      thumbnailUrl: data.thumbnail_url as string | undefined,
      speakerIds: (data.teacher_ids as string[]) || [],
      coHostIds: (data.co_host_ids as string[]) || [],
      lessonIds: (data.lesson_ids as string[]) || [],
      tags: (data.tags as string[]) || [],
      durationMinutes: data.duration_minutes as number | undefined,
      difficulty: data.difficulty as "beginner" | "intermediate" | "advanced" | undefined,
      entrySurveyId: data.entry_survey_id as string | undefined,
      exitSurveyId: data.exit_survey_id as string | undefined,
      certificateTemplateId: data.certificate_template_id as string | undefined,
      formTemplateId: data.form_template_id as string | undefined,
      isLive: data.is_live as boolean | undefined,
      livePlaybackId: data.live_playback_id as string | undefined,
      enrollmentStartDate: data.enrollment_start_date as string | undefined,
      enrollmentEndDate: data.enrollment_end_date as string | undefined,
      unlimitedEnrollment: data.unlimited_enrollment as boolean | undefined,
      enrollmentRules: data.enrollment_rules as Course["enrollmentRules"],
      startDate: data.start_date as string | undefined,
      endDate: data.end_date as string | undefined,
      certificateRules: data.certificate_rules as Course["certificateRules"],
      isActive: data.is_active as boolean | undefined,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

export const courseRepository = new CourseRepository();
