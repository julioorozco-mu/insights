import { z } from "zod";

export const userRoleSchema = z.enum(["student", "speaker", "admin"]);

export const createUserSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos"),
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  dateOfBirth: z.string().min(1, "La fecha de nacimiento es requerida"),
  gender: z.enum(["male", "female", "other"], {
    errorMap: () => ({ message: "Selecciona un género" }),
  }),
  state: z.string().min(1, "Selecciona un estado"),
  municipality: z.string().optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  role: userRoleSchema.optional().default("student"),
  bio: z.string().optional(),
  expertise: z.array(z.string()).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export const updateUserSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
  avatarUrl: z.string().url("URL inválida").optional(),
  bio: z.string().optional(),
  socialLinks: z.object({
    linkedin: z.string().url().optional(),
    twitter: z.string().url().optional(),
    website: z.string().url().optional(),
  }).optional(),
  expertise: z.array(z.string()).optional(), // para speakers
  resumeUrl: z.string().url().optional(), // para speakers
  signatureUrl: z.string().url().optional(), // para speakers
});

export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
