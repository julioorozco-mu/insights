import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getWelcomeEmailTemplate, getWelcomeEmailSubject } from "@/lib/email/templates";

interface TestEmailRequest {
  to: string;
  name: string;
}

export async function POST(req: Request) {
  try {
    const { to, name } = await req.json() as TestEmailRequest;

    if (!to || !name) {
      return NextResponse.json(
        { error: "Email y nombre son requeridos" },
        { status: 400 }
      );
    }

    // Si no hay API key configurada, retornar mensaje informativo (fallback)
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        success: true,
        message: "RESEND_API_KEY no configurada - correo no enviado",
        skipped: true,
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Dominio para envío
    const fromDomain = process.env.RESEND_FROM_DOMAIN || "onboarding@resend.dev";
    const fromName = process.env.RESEND_FROM_NAME || "MicroCert";

    const subject = getWelcomeEmailSubject(name);
    const html = getWelcomeEmailTemplate({ name, email: to });

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromDomain}>`,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Error al enviar correo de prueba", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: "Correo de prueba enviado exitosamente",
      data 
    });
  } catch (error) {
    console.error("Error en test-email:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
