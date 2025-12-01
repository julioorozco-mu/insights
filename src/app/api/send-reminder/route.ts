import { NextResponse } from "next/server";
import { getReminderEmailTemplate, getReminderEmailSubject } from "@/lib/email/templates";
import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";

interface ReminderRequest {
  lessonId?: string;
  courseId: string;
  lessonTitle: string;
  courseTitle?: string;
  lessonType: string;
  sessionDate: string;
  sessionTime: string;
  bannerUrl?: string;
  lessonUrl: string;
  recipientIds: string[]; // Array de user IDs
  speakers?: Array<{
    name: string;
    photoURL?: string;
    role?: string;
  }>;
  scheduledDate?: string; // Si viene, es un envío programado
  createdBy: string;
}

export async function POST(req: Request) {
  try {
    const requestData = await req.json() as ReminderRequest;
    
    const domain = process.env.MAILGUN_DOMAIN || "microcert.com";
    const apiKey = process.env.MAILGUN_API_KEY!;

    if (!apiKey) {
      return NextResponse.json(
        { error: "MAILGUN_API_KEY no configurada" },
        { status: 500 }
      );
    }

    // Si es un envío programado, guardar en Supabase
    if (requestData.scheduledDate) {
      try {
        const scheduledEmailData = {
          type: requestData.lessonId ? 'lesson' : 'course',
          lesson_id: requestData.lessonId,
          course_id: requestData.courseId,
          lesson_title: requestData.lessonTitle,
          course_title: requestData.courseTitle,
          scheduled_date: requestData.scheduledDate,
          recipients: requestData.recipientIds,
          status: 'pending',
          created_by: requestData.createdBy,
          email_data: {
            lessonType: requestData.lessonType,
            sessionDate: requestData.sessionDate,
            sessionTime: requestData.sessionTime,
            bannerUrl: requestData.bannerUrl,
            lessonUrl: requestData.lessonUrl,
            speakers: requestData.speakers,
          }
        };

        const { data, error } = await supabaseClient
          .from(TABLES.SCHEDULED_EMAILS)
          .insert(scheduledEmailData)
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({
          success: true,
          message: "Correo programado exitosamente",
          scheduledEmailId: data.id,
        });
      } catch (error) {
        console.error("Error al programar correo:", error);
        return NextResponse.json(
          { error: "Error al programar el correo" },
          { status: 500 }
        );
      }
    }

    // Envío inmediato
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Obtener información de los usuarios
    for (const userId of requestData.recipientIds) {
      try {
        const { data: userData, error: userError } = await supabaseClient
          .from(TABLES.USERS)
          .select('*')
          .eq('id', userId)
          .single();
        
        if (userError || !userData) {
          failedCount++;
          errors.push(`Usuario ${userId} no encontrado`);
          continue;
        }

        const studentEmail = userData.email;
        const studentName = userData.name || 'Estudiante';

        // Generar HTML del correo
        const html = getReminderEmailTemplate({
          studentName,
          lessonType: requestData.lessonType,
          lessonTitle: requestData.lessonTitle,
          courseTitle: requestData.courseTitle,
          sessionDate: requestData.sessionDate,
          sessionTime: requestData.sessionTime,
          bannerUrl: requestData.bannerUrl,
          lessonUrl: requestData.lessonUrl,
          speakers: requestData.speakers,
        });

        const subject = getReminderEmailSubject(requestData.lessonTitle);

        // Enviar correo vía Mailgun
        const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
          method: "POST",
          headers: {
            Authorization: "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            from: `MicroCert <noreply@${domain}>`,
            to: studentEmail,
            subject,
            html,
          }),
        });

        if (response.ok) {
          sentCount++;
        } else {
          failedCount++;
          const errorData = await response.json();
          errors.push(`Error enviando a ${studentEmail}: ${JSON.stringify(errorData)}`);
        }
      } catch (error) {
        failedCount++;
        errors.push(`Error procesando usuario ${userId}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      total: requestData.recipientIds.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error("Error en send-reminder:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: String(error) },
      { status: 500 }
    );
  }
}
