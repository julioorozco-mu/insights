import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";

export interface TeacherData {
  id: string;
  userId: string;
  name?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  expertise: string[];
  resumeUrl?: string;
  signatureUrl?: string;
  events: string[];
  coverImageUrl?: string;
  aboutMe?: string;
  favoriteBooks: string[];
  publishedBooks: Array<{ title: string; url?: string; year?: string }>;
  externalCourses: Array<{ title: string; url?: string; platform?: string }>;
  achievements: string[];
  services: string[];
  avatarUrl?: string;
  bio?: string;
  organization?: string;
  website?: string;
  linkedin?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeacherData {
  userId?: string;
  name: string;
  lastName?: string;
  email?: string;
  phone?: string;
  expertise?: string[];
  bio?: string;
  avatarUrl?: string;
  organization?: string;
  website?: string;
  linkedin?: string;
}

export interface UpdateTeacherData {
  name?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  expertise?: string[];
  bio?: string;
  avatarUrl?: string;
  organization?: string;
  website?: string;
  linkedin?: string;
  signatureUrl?: string;
  resumeUrl?: string;
  isActive?: boolean;
}

export class TeacherRepository {
  private table = TABLES.TEACHERS;
  private usersTable = TABLES.USERS;

  async create(data: CreateTeacherData): Promise<TeacherData> {
    // Si tenemos userId, usar ese; si no, primero crear el usuario
    let userId = data.userId;

    if (!userId && data.email) {
      // Buscar si el usuario ya existe
      const { data: existingUser } = await supabaseClient
        .from(this.usersTable)
        .select("id")
        .eq("email", data.email)
        .single();

      if (existingUser) {
        userId = existingUser.id;
      }
    }

    const teacherData = {
      user_id: userId || null,
      expertise: data.expertise || [],
      resume_url: null,
      signature_url: null,
      events: [],
      cover_image_url: null,
      about_me: data.bio,
      favorite_books: [],
      published_books: [],
      external_courses: [],
      achievements: [],
      services: [],
    };

    const { data: insertedTeacher, error } = await supabaseClient
      .from(this.table)
      .insert(teacherData)
      .select()
      .single();

    if (error) {
      console.error("Error creating teacher:", error);
      throw error;
    }

    // Retornar datos combinados (teacher con info de user si existe)
    return this.mapToTeacher(insertedTeacher, {
      name: data.name,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      avatar_url: data.avatarUrl,
      bio: data.bio,
    });
  }

  async findById(id: string): Promise<TeacherData | null> {
    const { data, error } = await supabaseClient
      .from(this.table)
      .select(`
        *,
        users:user_id (
          id, name, last_name, email, phone, avatar_url, bio
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapToTeacher(data, data.users);
  }

  async findByUserId(userId: string): Promise<TeacherData | null> {
    const { data, error } = await supabaseClient
      .from(this.table)
      .select(`
        *,
        users:user_id (
          id, name, last_name, email, phone, avatar_url, bio
        )
      `)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapToTeacher(data, data.users);
  }

  async findAll(): Promise<TeacherData[]> {
    const { data, error } = await supabaseClient
      .from(this.table)
      .select(`
        *,
        users:user_id (
          id, name, last_name, email, phone, avatar_url, bio
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching teachers:", error);
      return [];
    }

    return (data || []).map((row) => this.mapToTeacher(row, row.users));
  }

  async findActive(): Promise<TeacherData[]> {
    const { data, error } = await supabaseClient
      .from(this.table)
      .select(`
        *,
        users:user_id (
          id, name, last_name, email, phone, avatar_url, bio
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching active teachers:", error);
      return [];
    }

    // Filtrar solo activos (por defecto todos son activos a menos que se desactiven)
    return (data || []).map((row) => this.mapToTeacher(row, row.users));
  }

  async update(id: string, data: UpdateTeacherData): Promise<void> {
    const updateData: Record<string, unknown> = {};

    if (data.expertise !== undefined) updateData.expertise = data.expertise;
    if (data.signatureUrl !== undefined) updateData.signature_url = data.signatureUrl;
    if (data.resumeUrl !== undefined) updateData.resume_url = data.resumeUrl;
    if (data.bio !== undefined) updateData.about_me = data.bio;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabaseClient
        .from(this.table)
        .update(updateData)
        .eq("id", id);

      if (error) {
        console.error("Error updating teacher:", error);
        throw error;
      }
    }

    // Si hay datos de usuario para actualizar
    const teacher = await this.findById(id);
    if (teacher?.userId) {
      const userUpdateData: Record<string, unknown> = {};
      if (data.name !== undefined) userUpdateData.name = data.name;
      if (data.lastName !== undefined) userUpdateData.last_name = data.lastName;
      if (data.phone !== undefined) userUpdateData.phone = data.phone;
      if (data.avatarUrl !== undefined) userUpdateData.avatar_url = data.avatarUrl;
      if (data.bio !== undefined) userUpdateData.bio = data.bio;

      if (Object.keys(userUpdateData).length > 0) {
        await supabaseClient
          .from(this.usersTable)
          .update(userUpdateData)
          .eq("id", teacher.userId);
      }
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabaseClient
      .from(this.table)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting teacher:", error);
      throw error;
    }
  }

  async getAssignedCoursesCount(teacherId: string): Promise<number> {
    const { data, error } = await supabaseClient
      .from(TABLES.COURSES)
      .select("id")
      .contains("teacher_ids", [teacherId]);

    if (error) {
      console.error("Error counting assigned courses:", error);
      return 0;
    }

    return data?.length || 0;
  }

  private mapToTeacher(
    data: Record<string, unknown>,
    userData?: Record<string, unknown> | null
  ): TeacherData {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      name: (userData?.name as string) || "",
      lastName: userData?.last_name as string | undefined,
      email: userData?.email as string | undefined,
      phone: userData?.phone as string | undefined,
      expertise: (data.expertise as string[]) || [],
      resumeUrl: data.resume_url as string | undefined,
      signatureUrl: data.signature_url as string | undefined,
      events: (data.events as string[]) || [],
      coverImageUrl: data.cover_image_url as string | undefined,
      aboutMe: data.about_me as string | undefined,
      favoriteBooks: (data.favorite_books as string[]) || [],
      publishedBooks: (data.published_books as TeacherData["publishedBooks"]) || [],
      externalCourses: (data.external_courses as TeacherData["externalCourses"]) || [],
      achievements: (data.achievements as string[]) || [],
      services: (data.services as string[]) || [],
      avatarUrl: userData?.avatar_url as string | undefined,
      bio: (data.about_me as string) || (userData?.bio as string | undefined),
      organization: undefined, // Se puede agregar a extra_data si es necesario
      website: undefined,
      linkedin: undefined,
      isActive: true, // Por defecto activo
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

export const teacherRepository = new TeacherRepository();
