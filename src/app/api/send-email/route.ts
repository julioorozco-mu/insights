import { NextResponse } from "next/server";
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

    const domain = process.env.MAILGUN_DOMAIN || "microcert.com";
    const apiKey = process.env.MAILGUN_API_KEY!;

    if (!apiKey) {
      return NextResponse.json(
        { error: "MAILGUN_API_KEY no configurada" },
        { status: 500 }
      );
    }

    // Generar subject y html si no se proporcionan (para correo de bienvenida)
    const subject = customSubject || getWelcomeEmailSubject(name);
    const html = customHtml || getWelcomeEmailTemplate({ name, email: to });

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
        { error: "Error al enviar correo", details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error en send-email:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
