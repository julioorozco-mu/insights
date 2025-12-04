import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";
import { Course, CreateCourseData, UpdateCourseData } from "@/types/course";

export class CourseRepository {
  private table = TABLES.COURSES;

  async create(data: CreateCourseData): Promise<Course> {
    // Campos básicos que siempre existen
    const courseData: Record<string, unknown> = {
      title: data.title,
      description: data.description || null,
      cover_image_url: data.coverImageUrl || null,
      thumbnail_url: data.thumbnailUrl || null,
      teacher_ids: data.speakerIds || [],
      co_host_ids: data.coHostIds || [],
      lesson_ids: [],
      tags: data.tags || [],
      difficulty: data.difficulty || null,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
      entry_survey_id: data.entrySurveyId || null,
      exit_survey_id: data.exitSurveyId || null,
      enrollment_rules: data.enrollmentRules || null,
      enrollment_start_date: data.enrollmentStartDate || null,
      enrollment_end_date: data.enrollmentEndDate || null,
      is_active: true,
    };
    
    // Campos nuevos de pricing y organizaciones (después de migración)
    if (data.price !== undefined) {
      courseData.price = data.price ?? 0;
    }
    if (data.salePercentage !== undefined) {
      courseData.sale_percentage = data.salePercentage ?? 0;
    }
    if (data.isPublished !== undefined) {
      courseData.is_published = data.isPublished ?? false;
    }
    if (data.isHidden !== undefined) {
      courseData.is_hidden = data.isHidden ?? false;
    }
    if (data.university !== undefined) {
      courseData.university = data.university || null;
    }
    if (data.specialization !== undefined) {
      courseData.specialization = data.specialization || null;
    }
    
    // Remover campos undefined para evitar problemas con Supabase
    Object.keys(courseData).forEach(key => {
      if (courseData[key] === undefined) {
        delete courseData[key];
      }
    });

    const { data: insertedCourse, error } = await supabaseClient
      .from(this.table)
      .insert(courseData)
      .select()
      .single();

    if (error) {
      console.error("Error creating course:", error);
      console.error("Course data attempted:", JSON.stringify(courseData, null, 2));
      
      // Crear un error más descriptivo
      const errorMessage = error.message || error.details || error.hint || "Error desconocido al crear el curso";
      const detailedError = new Error(errorMessage);
      (detailedError as any).originalError = error;
      (detailedError as any).code = error.code;
      throw detailedError;
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
    // Campos nuevos de pricing y organizaciones
    if (data.price !== undefined) updateData.price = data.price;
    if (data.salePercentage !== undefined) updateData.sale_percentage = data.salePercentage;
    if (data.isPublished !== undefined) updateData.is_published = data.isPublished;
    if (data.isHidden !== undefined) updateData.is_hidden = data.isHidden;
    if (data.university !== undefined) updateData.university = data.university;
    if (data.specialization !== undefined) updateData.specialization = data.specialization;

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
      price: data.price as number | undefined,
      salePercentage: data.sale_percentage as number | undefined,
      isPublished: data.is_published as boolean | undefined,
      isHidden: data.is_hidden as boolean | undefined,
      university: data.university as string | undefined,
      specialization: data.specialization as string | undefined,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

export const courseRepository = new CourseRepository();
