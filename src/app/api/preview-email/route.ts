import { NextResponse } from "next/server";
import { getWelcomeEmailTemplate } from "@/lib/email/templates";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") || "Usuario de Prueba";
  const email = searchParams.get("email") || "usuario@ejemplo.com";

  const html = getWelcomeEmailTemplate({ name, email });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
