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

// Supabase Auth error messages - Mapeo completo para UX
export function getSupabaseAuthErrorMessage(message: string): string {
  const messages: Record<string, string> = {
    // Errores de credenciales
    "Invalid login credentials": "Correo o contraseña incorrectos",
    "invalid_credentials": "Correo o contraseña incorrectos",
    "invalid_grant": "Credenciales inválidas",
    
    // Errores de email
    "Email not confirmed": "Correo no confirmado. Revisa tu bandeja de entrada.",
    "User already registered": "Este correo ya está registrado",
    "Unable to validate email address: invalid format": "Correo electrónico inválido",
    "Signup requires a valid password": "Debes proporcionar una contraseña válida",
    
    // Errores de password
    "Password should be at least 6 characters": "La contraseña debe tener al menos 6 caracteres",
    "New password should be different from the old password": "La nueva contraseña debe ser diferente",
    
    // Rate limiting
    "Email rate limit exceeded": "Demasiados intentos. Espera unos minutos.",
    "Request rate limit reached": "Demasiadas solicitudes. Espera unos minutos.",
    "For security purposes, you can only request this once every 60 seconds": "Espera 60 segundos antes de intentar de nuevo",
    "Too many requests": "Demasiados intentos. Espera unos minutos.",
    
    // Errores de sesión
    "Session not found": "Sesión no encontrada. Inicia sesión de nuevo.",
    "Session expired": "Tu sesión ha expirado. Inicia sesión de nuevo.",
    "Invalid Refresh Token": "Tu sesión ha expirado. Inicia sesión de nuevo.",
    "Refresh Token Not Found": "Tu sesión ha expirado. Inicia sesión de nuevo.",
    "Token has expired or is invalid": "Tu sesión ha expirado. Inicia sesión de nuevo.",
    
    // Errores de usuario
    "User not found": "Usuario no encontrado",
    "User banned": "Tu cuenta ha sido suspendida",
    "User not allowed": "No tienes permiso para acceder",
    
    // Errores de red/servidor
    "Failed to fetch": "Error de conexión. Verifica tu internet.",
    "Network request failed": "Error de conexión. Verifica tu internet.",
    "fetch failed": "Error de conexión. Verifica tu internet.",
    "ECONNREFUSED": "No se pudo conectar con el servidor",
    "502": "Servidor no disponible. Intenta más tarde.",
    "503": "Servicio no disponible. Intenta más tarde.",
    
    // OAuth
    "OAuth error": "Error con el proveedor de autenticación",
    "Provider not enabled": "Este método de inicio de sesión no está habilitado",
  };

  // Buscar coincidencia parcial (case insensitive)
  const lowerMessage = message.toLowerCase();
  for (const [key, value] of Object.entries(messages)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return value;
    }
  }

  // Si no hay coincidencia, devolver mensaje genérico seguro
  // No exponer mensajes de error internos al usuario
  console.warn("Error de auth no mapeado:", message);
  return "Error de autenticación. Intenta de nuevo.";
}
