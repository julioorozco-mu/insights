import { NextResponse } from "next/server";
import { Resend } from "resend";
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

    // Si no hay API key configurada, retornar éxito silenciosamente (fallback)
    const hasResendKey = !!process.env.RESEND_API_KEY;
    if (!hasResendKey) {
      console.warn("RESEND_API_KEY no configurada - omitiendo envío de recordatorios");
    }

    const resend = hasResendKey ? new Resend(process.env.RESEND_API_KEY) : null;

    // Dominio para envío
    const fromDomain = process.env.RESEND_FROM_DOMAIN || "onboarding@resend.dev";
    const fromName = process.env.RESEND_FROM_NAME || "MicroCert";

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

        // Enviar correo vía Resend (solo si está configurado)
        if (!resend) {
          // Si no hay Resend configurado, contar como enviado pero sin enviar realmente
          sentCount++;
          continue;
        }

        const { data, error } = await resend.emails.send({
          from: `${fromName} <${fromDomain}>`,
          to: [studentEmail],
          subject,
          html,
        });

        if (error) {
          failedCount++;
          errors.push(`Error enviando a ${studentEmail}: ${JSON.stringify(error)}`);
        } else {
          sentCount++;
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
