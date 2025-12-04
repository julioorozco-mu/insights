import { z } from "zod";

// Expresión regular para sanitizar email (prevenir inyecciones)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Caracteres peligrosos que no deberían estar en inputs de auth
const DANGEROUS_CHARS = /[<>"'`;\\]/;

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
  email: z
    .string()
    .min(1, "El correo es requerido")
    .max(254, "El correo no puede exceder 254 caracteres") // RFC 5321
    .refine((val) => !DANGEROUS_CHARS.test(val), {
      message: "El correo contiene caracteres no permitidos",
    })
    .refine((val) => EMAIL_REGEX.test(val.trim().toLowerCase()), {
      message: "Correo electrónico inválido",
    })
    .transform((email) => email.toLowerCase().trim()),
  password: z
    .string()
    .min(1, "La contraseña es requerida")
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(72, "La contraseña no puede exceder 72 caracteres") // Límite de bcrypt
    .refine((val) => !val.includes('\0'), {
      message: "La contraseña contiene caracteres no válidos",
    }),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
