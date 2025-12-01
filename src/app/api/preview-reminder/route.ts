import { NextResponse } from "next/server";
import { getReminderEmailTemplate } from "@/lib/email/templates";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  
  const studentName = searchParams.get("studentName") || "Juan Pérez";
  const lessonType = searchParams.get("lessonType") || "Lección";
  const lessonTitle = searchParams.get("lessonTitle") || "Título de la lección";
  const courseTitle = searchParams.get("courseTitle") || undefined;
  const sessionDate = searchParams.get("sessionDate") || "Lunes 4 de noviembre de 2024";
  const sessionTime = searchParams.get("sessionTime") || "10:00 AM";
  const bannerUrl = searchParams.get("bannerUrl") || undefined;
  const lessonUrl = searchParams.get("lessonUrl") || "https://microcert.marcaunach.com/dashboard/lessons/123";
  
  // Parse speakers from query params (formato JSON)
  let speakers: Array<{ name: string; photoURL?: string; role?: string }> | undefined;
  const speakersParam = searchParams.get("speakers");
  if (speakersParam) {
    try {
      speakers = JSON.parse(speakersParam);
    } catch (e) {
      speakers = undefined;
    }
  }

  const html = getReminderEmailTemplate({
    studentName,
    lessonType,
    lessonTitle,
    courseTitle,
    sessionDate,
    sessionTime,
    bannerUrl,
    lessonUrl,
    speakers,
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
