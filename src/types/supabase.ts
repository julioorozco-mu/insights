/**
 * Tipos generados para Supabase Database
 * MicroCert by Marca UNACH
 * 
 * NOTA: Este archivo puede regenerarse automáticamente con:
 * npx supabase gen types typescript --project-id <tu-project-id> > src/types/supabase.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'student' | 'teacher' | 'admin' | 'support' | 'superadmin';
export type GenderType = 'male' | 'female' | 'other';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type LessonType = 'video' | 'livestream' | 'hybrid';
export type LiveStatus = 'idle' | 'active' | 'ended';
export type SurveyType = 'entry' | 'exit' | 'lesson';
export type FileCategory = 'student' | 'teacher' | 'lesson' | 'course' | 'general';
export type ResourceCategory = 'document' | 'video' | 'image' | 'other';
export type VideoQuality = '720p' | '1080p' | '4k';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          last_name: string | null;
          role: UserRole;
          phone: string | null;
          username: string | null;
          date_of_birth: string | null;
          gender: GenderType | null;
          state: string | null;
          avatar_url: string | null;
          bio: string | null;
          social_links: Json | null;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          last_name?: string | null;
          role?: UserRole;
          phone?: string | null;
          username?: string | null;
          date_of_birth?: string | null;
          gender?: GenderType | null;
          state?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          social_links?: Json | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          last_name?: string | null;
          role?: UserRole;
          phone?: string | null;
          username?: string | null;
          date_of_birth?: string | null;
          gender?: GenderType | null;
          state?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          social_links?: Json | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          user_id: string;
          enrollment_date: string;
          completed_courses: string[];
          certificates: string[];
          extra_data: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          enrollment_date?: string;
          completed_courses?: string[];
          certificates?: string[];
          extra_data?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          enrollment_date?: string;
          completed_courses?: string[];
          certificates?: string[];
          extra_data?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      teachers: {
        Row: {
          id: string;
          user_id: string;
          expertise: string[];
          resume_url: string | null;
          signature_url: string | null;
          events: string[];
          extra_data: Json | null;
          cover_image_url: string | null;
          about_me: string | null;
          favorite_books: string[];
          published_books: Json | null;
          external_courses: Json | null;
          achievements: string[];
          services: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          expertise?: string[];
          resume_url?: string | null;
          signature_url?: string | null;
          events?: string[];
          extra_data?: Json | null;
          cover_image_url?: string | null;
          about_me?: string | null;
          favorite_books?: string[];
          published_books?: Json | null;
          external_courses?: Json | null;
          achievements?: string[];
          services?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          expertise?: string[];
          resume_url?: string | null;
          signature_url?: string | null;
          events?: string[];
          extra_data?: Json | null;
          cover_image_url?: string | null;
          about_me?: string | null;
          favorite_books?: string[];
          published_books?: Json | null;
          external_courses?: Json | null;
          achievements?: string[];
          services?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          cover_image_url: string | null;
          thumbnail_url: string | null;
          teacher_ids: string[];
          co_host_ids: string[];
          lesson_ids: string[];
          tags: string[];
          duration_minutes: number | null;
          difficulty: DifficultyLevel | null;
          entry_survey_id: string | null;
          exit_survey_id: string | null;
          certificate_template_id: string | null;
          form_template_id: string | null;
          is_live: boolean;
          live_playback_id: string | null;
          enrollment_start_date: string | null;
          enrollment_end_date: string | null;
          unlimited_enrollment: boolean;
          enrollment_rules: Json | null;
          start_date: string | null;
          end_date: string | null;
          certificate_rules: Json | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          cover_image_url?: string | null;
          thumbnail_url?: string | null;
          teacher_ids?: string[];
          co_host_ids?: string[];
          lesson_ids?: string[];
          tags?: string[];
          duration_minutes?: number | null;
          difficulty?: DifficultyLevel | null;
          entry_survey_id?: string | null;
          exit_survey_id?: string | null;
          certificate_template_id?: string | null;
          form_template_id?: string | null;
          is_live?: boolean;
          live_playback_id?: string | null;
          enrollment_start_date?: string | null;
          enrollment_end_date?: string | null;
          unlimited_enrollment?: boolean;
          enrollment_rules?: Json | null;
          start_date?: string | null;
          end_date?: string | null;
          certificate_rules?: Json | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          cover_image_url?: string | null;
          thumbnail_url?: string | null;
          teacher_ids?: string[];
          co_host_ids?: string[];
          lesson_ids?: string[];
          tags?: string[];
          duration_minutes?: number | null;
          difficulty?: DifficultyLevel | null;
          entry_survey_id?: string | null;
          exit_survey_id?: string | null;
          certificate_template_id?: string | null;
          form_template_id?: string | null;
          is_live?: boolean;
          live_playback_id?: string | null;
          enrollment_start_date?: string | null;
          enrollment_end_date?: string | null;
          unlimited_enrollment?: boolean;
          enrollment_rules?: Json | null;
          start_date?: string | null;
          end_date?: string | null;
          certificate_rules?: Json | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      lessons: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          content: string | null;
          order: number;
          type: LessonType;
          video_url: string | null;
          video_playback_id: string | null;
          video_recording_id: string | null;
          is_live: boolean;
          live_stream_id: string | null;
          live_stream_key: string | null;
          live_playback_id: string | null;
          live_status: LiveStatus;
          scheduled_start_time: string | null;
          actual_start_time: string | null;
          actual_end_time: string | null;
          streaming_type: string | null;
          live_stream_url: string | null;
          recorded_video_url: string | null;
          agora_channel: string | null;
          agora_app_id: string | null;
          attachment_ids: string[];
          resource_ids: string[];
          form_template_id: string | null;
          survey_id: string | null;
          entry_survey_id: string | null;
          exit_survey_id: string | null;
          start_date: string | null;
          end_date: string | null;
          duration_minutes: number | null;
          created_by: string;
          is_active: boolean;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          content?: string | null;
          order?: number;
          type?: LessonType;
          video_url?: string | null;
          video_playback_id?: string | null;
          video_recording_id?: string | null;
          is_live?: boolean;
          live_stream_id?: string | null;
          live_stream_key?: string | null;
          live_playback_id?: string | null;
          live_status?: LiveStatus;
          scheduled_start_time?: string | null;
          actual_start_time?: string | null;
          actual_end_time?: string | null;
          streaming_type?: string | null;
          live_stream_url?: string | null;
          recorded_video_url?: string | null;
          agora_channel?: string | null;
          agora_app_id?: string | null;
          attachment_ids?: string[];
          resource_ids?: string[];
          form_template_id?: string | null;
          survey_id?: string | null;
          entry_survey_id?: string | null;
          exit_survey_id?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          duration_minutes?: number | null;
          created_by: string;
          is_active?: boolean;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string | null;
          content?: string | null;
          order?: number;
          type?: LessonType;
          video_url?: string | null;
          video_playback_id?: string | null;
          video_recording_id?: string | null;
          is_live?: boolean;
          live_stream_id?: string | null;
          live_stream_key?: string | null;
          live_playback_id?: string | null;
          live_status?: LiveStatus;
          scheduled_start_time?: string | null;
          actual_start_time?: string | null;
          actual_end_time?: string | null;
          streaming_type?: string | null;
          live_stream_url?: string | null;
          recorded_video_url?: string | null;
          agora_channel?: string | null;
          agora_app_id?: string | null;
          attachment_ids?: string[];
          resource_ids?: string[];
          form_template_id?: string | null;
          survey_id?: string | null;
          entry_survey_id?: string | null;
          exit_survey_id?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          duration_minutes?: number | null;
          created_by?: string;
          is_active?: boolean;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      certificates: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          certificate_template_id: string;
          student_name: string;
          course_title: string;
          teacher_names: string[];
          issue_date: string;
          certificate_url: string | null;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          course_id: string;
          certificate_template_id: string;
          student_name: string;
          course_title: string;
          teacher_names?: string[];
          issue_date?: string;
          certificate_url?: string | null;
          verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          course_id?: string;
          certificate_template_id?: string;
          student_name?: string;
          course_title?: string;
          teacher_names?: string[];
          issue_date?: string;
          certificate_url?: string | null;
          verified?: boolean;
          created_at?: string;
        };
      };
      site_config: {
        Row: {
          id: string;
          key: string;
          value: Json;
          description: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          description?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: Json;
          description?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      gender_type: GenderType;
      difficulty_level: DifficultyLevel;
      lesson_type: LessonType;
      live_status: LiveStatus;
      survey_type: SurveyType;
      file_category: FileCategory;
      resource_category: ResourceCategory;
      video_quality: VideoQuality;
    };
  };
}
