export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function handleError(error: unknown): AppError {
  console.error("Error:", error);

  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message);
  }

  return new AppError("Ha ocurrido un error inesperado");
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ha ocurrido un error inesperado";
}

// Supabase Auth error messages
export function getSupabaseAuthErrorMessage(message: string): string {
  const messages: Record<string, string> = {
    "Invalid login credentials": "Credenciales inválidas",
    "Email not confirmed": "Correo no confirmado. Revisa tu bandeja de entrada.",
    "User already registered": "Este correo ya está registrado",
    "Password should be at least 6 characters": "La contraseña debe tener al menos 6 caracteres",
    "Unable to validate email address: invalid format": "Correo electrónico inválido",
    "Email rate limit exceeded": "Demasiados intentos, intenta más tarde",
    "For security purposes, you can only request this once every 60 seconds": "Espera 60 segundos antes de intentar de nuevo",
    "New password should be different from the old password": "La nueva contraseña debe ser diferente",
  };

  // Buscar coincidencia parcial
  for (const [key, value] of Object.entries(messages)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  return message || "Error de autenticación";
}
