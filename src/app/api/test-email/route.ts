import { NextResponse } from "next/server";
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

    const domain = process.env.MAILGUN_DOMAIN || "microcert.com";
    const apiKey = process.env.MAILGUN_API_KEY!;

    if (!apiKey) {
      return NextResponse.json(
        { error: "MAILGUN_API_KEY no configurada" },
        { status: 500 }
      );
    }

    const subject = getWelcomeEmailSubject(name);
    const html = getWelcomeEmailTemplate({ name, email: to });

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        from: `MicroCert <noreply@${domain}>`,
        to,
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Mailgun error:", data);
      return NextResponse.json(
        { error: "Error al enviar correo de prueba", details: data },
        { status: response.status }
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
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
