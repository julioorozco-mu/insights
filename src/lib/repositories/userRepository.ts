import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";
import { User, CreateUserData, UpdateUserData } from "@/types/user";
import { studentRepository } from "./studentRepository";

export class UserRepository {
  private table = TABLES.USERS;

  async create(id: string, data: CreateUserData): Promise<User> {
    const userData: Record<string, unknown> = {
      id,
      name: data.name,
      last_name: data.lastName,
      email: data.email,
      role: data.role || "student",
      phone: data.phone || null,
      username: data.username || null,
      date_of_birth: data.dateOfBirth || null,
      gender: data.gender || null,
      state: data.state || null,
      bio: data.bio || null,
      is_verified: false,
    };

    // Agregar municipality si existe
    if (data.municipality) {
      userData.municipality = data.municipality;
    }

    // Usar upsert para manejar el caso donde el usuario ya existe (creado por trigger)
    // o donde necesitamos crear uno nuevo
    const { data: upsertedUser, error } = await supabaseClient
      .from(this.table)
      .upsert(userData, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating/updating user:", error);
      throw error;
    }

    // Si el rol es estudiante, también crear documento de estudiante
    if (userData.role === "student") {
      try {
        await studentRepository.create({
          userId: id,
          name: data.name,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          username: data.username,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          state: data.state,
        });
      } catch (studentError: unknown) {
        // Si el estudiante ya existe, ignorar el error
        const error = studentError as { code?: string };
        if (error?.code !== '23505') { // 23505 = unique_violation
          console.error("Error creating student:", studentError);
        }
      }
    }

    return this.mapToUser(upsertedUser);
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabaseClient
      .from(this.table)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[UserRepository] Error fetching user by id:", error.message, error.code);
      return null;
    }
    
    if (!data) {
      console.warn("[UserRepository] No user found with id:", id);
      return null;
    }
    
    return this.mapToUser(data);
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabaseClient
      .from(this.table)
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapToUser(data);
  }

  async findAll(): Promise<User[]> {
    const { data, error } = await supabaseClient
      .from(this.table)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      return [];
    }

    return (data || []).map(this.mapToUser);
  }

  async findByRole(role: string): Promise<User[]> {
    const { data, error } = await supabaseClient
      .from(this.table)
      .select("*")
      .eq("role", role)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users by role:", error);
      return [];
    }

    return (data || []).map(this.mapToUser);
  }

  /**
   * Busca múltiples usuarios por sus IDs en una sola consulta
   * Optimización para evitar N+1 queries
   */
  async findByIds(ids: string[]): Promise<User[]> {
    if (!ids || ids.length === 0) return [];

    const { data, error } = await supabaseClient
      .from(this.table)
      .select("*")
      .in("id", ids);

    if (error) {
      console.error("Error fetching users by ids:", error);
      return [];
    }

    return (data || []).map(this.mapToUser);
  }

  async update(id: string, data: UpdateUserData): Promise<void> {
    const updateData: Record<string, unknown> = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.socialLinks !== undefined) updateData.social_links = data.socialLinks;
    if (data.expertise !== undefined) updateData.expertise = data.expertise;
    if (data.resumeUrl !== undefined) updateData.resume_url = data.resumeUrl;
    if (data.signatureUrl !== undefined) updateData.signature_url = data.signatureUrl;
    // Campos adicionales para perfil público
    if (data.coverImageUrl !== undefined) updateData.cover_image_url = data.coverImageUrl;
    if (data.aboutMe !== undefined) updateData.about_me = data.aboutMe;
    if (data.favoriteBooks !== undefined) updateData.favorite_books = data.favoriteBooks;
    if (data.publishedBooks !== undefined) updateData.published_books = data.publishedBooks;
    if (data.externalCourses !== undefined) updateData.external_courses = data.externalCourses;
    if (data.achievements !== undefined) updateData.achievements = data.achievements;
    if (data.services !== undefined) updateData.services = data.services;

    const { error } = await supabaseClient
      .from(this.table)
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabaseClient
      .from(this.table)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  // Mapear datos de Supabase (snake_case) a formato de la app (camelCase)
  private mapToUser(data: Record<string, unknown>): User & Record<string, unknown> {
    return {
      id: data.id as string,
      name: data.name as string,
      lastName: data.last_name as string | undefined,
      email: data.email as string,
      role: data.role as "student" | "teacher" | "admin",
      phone: data.phone as string | undefined,
      username: data.username as string | undefined,
      dateOfBirth: data.date_of_birth as string | undefined,
      gender: data.gender as "male" | "female" | "other" | undefined,
      state: data.state as string | undefined,
      municipality: data.municipality as string | undefined,
      avatarUrl: data.avatar_url as string | undefined,
      bio: data.bio as string | undefined,
      socialLinks: data.social_links as User["socialLinks"],
      isVerified: data.is_verified as boolean | undefined,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      // Campos adicionales para perfil público
      coverImageUrl: data.cover_image_url as string | undefined,
      aboutMe: data.about_me as string | undefined,
      favoriteBooks: data.favorite_books as string[] | undefined,
      publishedBooks: data.published_books as { title: string; url?: string; year?: string }[] | undefined,
      externalCourses: data.external_courses as { title: string; url: string; platform?: string }[] | undefined,
      achievements: data.achievements as string[] | undefined,
      services: data.services as string[] | undefined,
    };
  }
}

export const userRepository = new UserRepository();
