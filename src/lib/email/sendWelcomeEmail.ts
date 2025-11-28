interface SendWelcomeEmailParams {
  to: string;
  name: string;
}

export async function sendWelcomeEmail({ to, name }: SendWelcomeEmailParams): Promise<void> {
  try {
    // El endpoint /api/send-email ahora maneja la generación del HTML internamente
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        name, // Enviamos el nombre para que el servidor genere el HTML
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error al enviar correo de bienvenida:", errorData);
      // No lanzamos error para no interrumpir el flujo de registro
      // El usuario se registra exitosamente aunque falle el correo
    }
  } catch (error) {
    console.error("Error al enviar correo de bienvenida:", error);
    // No lanzamos error para no interrumpir el flujo de registro
  }
}
