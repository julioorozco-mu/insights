import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getWelcomeEmailTemplate, getWelcomeEmailSubject } from "@/lib/email/templates";

interface EmailRequest {
  to: string;
  name: string;
  subject?: string;
  html?: string;
}

export async function POST(req: Request) {
  try {
    const { to, name, subject: customSubject, html: customHtml } = await req.json() as EmailRequest;

    // Si no hay API key configurada, retornar éxito silenciosamente (fallback)
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY no configurada - omitiendo envío de correo");
      return NextResponse.json({
        success: true,
        message: "Correo omitido (RESEND_API_KEY no configurada)",
        skipped: true,
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Generar subject y html si no se proporcionan (para correo de bienvenida)
    const subject = customSubject || getWelcomeEmailSubject(name);
    const html = customHtml || getWelcomeEmailTemplate({ name, email: to });

    // Dominio para envío - usar dominio verificado en Resend o el de prueba
    const fromDomain = process.env.RESEND_FROM_DOMAIN || "onboarding@resend.dev";
    const fromName = process.env.RESEND_FROM_NAME || "MicroCert";

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromDomain}>`,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Error al enviar correo", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error en send-email:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
