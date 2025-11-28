import { NextResponse } from "next/server";
import { getReminderEmailTemplate, getReminderEmailSubject } from "@/lib/email/templates";
import { collection, getDocs, doc, getDoc, addDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
    
    const domain = "epolitica.com.mx";
    const apiKey = process.env.MAILGUN_API_KEY!;

    if (!apiKey) {
      return NextResponse.json(
        { error: "MAILGUN_API_KEY no configurada" },
        { status: 500 }
      );
    }

    // Si es un envío programado, guardar en Firestore
    if (requestData.scheduledDate) {
      try {
        const scheduledEmailData = {
          type: requestData.lessonId ? 'lesson' : 'course',
          lessonId: requestData.lessonId,
          courseId: requestData.courseId,
          lessonTitle: requestData.lessonTitle,
          courseTitle: requestData.courseTitle,
          scheduledDate: requestData.scheduledDate,
          recipients: requestData.recipientIds,
          status: 'pending',
          createdAt: new Date().toISOString(),
          createdBy: requestData.createdBy,
          emailData: {
            lessonType: requestData.lessonType,
            sessionDate: requestData.sessionDate,
            sessionTime: requestData.sessionTime,
            bannerUrl: requestData.bannerUrl,
            lessonUrl: requestData.lessonUrl,
            speakers: requestData.speakers,
          }
        };

        const docRef = await addDoc(collection(db, 'scheduledEmails'), scheduledEmailData);

        return NextResponse.json({
          success: true,
          message: "Correo programado exitosamente",
          scheduledEmailId: docRef.id,
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
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (!userDoc.exists()) {
          failedCount++;
          errors.push(`Usuario ${userId} no encontrado`);
          continue;
        }

        const userData = userDoc.data();
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
            from: `Instituto Reyes Heroles <InstitutoReyesHeroles@${domain}>`,
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
