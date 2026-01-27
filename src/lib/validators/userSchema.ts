import { z } from "zod";
import { validateCURPAgainstData } from "@/lib/utils/curpValidator";

// Expresión regular para sanitizar email (prevenir inyecciones)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Caracteres peligrosos que no deberían estar en inputs de auth
const DANGEROUS_CHARS = /[<>"'`;\\]/;

// Expresión regular para validar formato de CURP mexicano
// Formato: 4 letras (apellidos y nombre) + 6 dígitos (fecha) + 1 letra (género) + 2 letras (estado) + 3 caracteres alfanuméricos (homonimia) + 2 dígitos/letras (verificador)
// El verificador puede ser 1 o 2 caracteres, pero el CURP siempre tiene 18 caracteres total
const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{2}[0-9A-Z]{3}[0-9A-Z]{2}$/;

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
  curp: z.string()
    .min(1, "El CURP es requerido")
    .max(18, "El CURP debe tener exactamente 18 caracteres")
    .refine((val) => {
      const normalized = val.trim().toUpperCase();
      return normalized.length === 18;
    }, {
      message: "El CURP debe tener exactamente 18 caracteres",
    })
    .refine((val) => {
      const normalized = val.trim().toUpperCase();
      return CURP_REGEX.test(normalized);
    }, {
      message: "El formato del CURP no es válido",
    })
    .transform((val) => val.trim().toUpperCase()),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  role: userRoleSchema.optional().default("student"),
  bio: z.string().optional(),
  expertise: z.array(z.string()).optional(),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})
.refine(
  (data) => {
    // Solo validar si todos los campos requeridos están presentes
    if (!data.curp || !data.name || !data.lastName || !data.dateOfBirth || !data.gender || !data.state) {
      // Si falta algún campo, no validar aún (dejar que otras validaciones manejen campos faltantes)
      return true;
    }
    
    // Validar CURP contra los datos
    const validation = validateCURPAgainstData(data.curp, {
      name: data.name,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      state: data.state,
    });
    
    // Si la validación falla, retornar false para que Zod muestre el error
    return validation.isValid;
  },
  (data) => {
    // Solo generar mensaje de error si todos los campos están presentes
    if (!data.curp || !data.name || !data.lastName || !data.dateOfBirth || !data.gender || !data.state) {
      return { 
        message: "Completa todos los campos antes de validar el CURP", 
        path: ["curp"] 
      };
    }
    
    // Obtener el mensaje de error específico de la validación
    const validation = validateCURPAgainstData(data.curp, {
      name: data.name,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      state: data.state,
    });
    
    return {
      message: validation.error || "El CURP no coincide con los datos proporcionados",
      path: ["curp"],
    };
  }
);

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
