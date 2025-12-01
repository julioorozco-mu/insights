import fs from "fs";
import path from "path";

interface WelcomeEmailParams {
  name: string;
  email: string;
}

interface ReminderEmailParams {
  studentName: string;
  lessonType: string; // 'Lección' o 'Curso'
  lessonTitle: string;
  courseTitle?: string;
  sessionDate: string;
  sessionTime: string;
  bannerUrl?: string;
  lessonUrl: string;
  speakers?: Array<{
    name: string;
    photoURL?: string;
    role?: string;
  }>;
}

// Función para leer el template HTML desde el archivo
export function getWelcomeEmailTemplate({ name, email }: WelcomeEmailParams): string {
  try {
    // Leer el archivo HTML desde public/mails/welcome.html
    const templatePath = path.join(process.cwd(), "public", "mails", "welcome.html");
    let template = fs.readFileSync(templatePath, "utf-8");
    
    // Reemplazar variables
    template = template.replace(/\$\{name\}/g, name);
    template = template.replace(/\$\{email\}/g, email);
    
    return template;
  } catch (error) {
    console.error("Error al leer el template de correo:", error);
    // Fallback en caso de error
    return `
      <html>
        <body>
          <h1>¡Hola ${name}!</h1>
          <p>Bienvenido a la plataforma. Tu correo es: ${email}</p>
        </body>
      </html>
    `;
  }
}

export function getReminderEmailTemplate(params: ReminderEmailParams): string {
  try {
    const templatePath = path.join(process.cwd(), "public", "mails", "reminder.html");
    let template = fs.readFileSync(templatePath, "utf-8");
    
    // Reemplazar variables simples
    template = template.replace(/\$\{studentName\}/g, params.studentName);
    template = template.replace(/\$\{lessonType\}/g, params.lessonType);
    template = template.replace(/\$\{lessonTitle\}/g, params.lessonTitle);
    template = template.replace(/\$\{sessionDate\}/g, params.sessionDate);
    template = template.replace(/\$\{sessionTime\}/g, params.sessionTime);
    template = template.replace(/\$\{lessonUrl\}/g, params.lessonUrl);
    
    // Manejar banner (ocultar si no existe)
    if (params.bannerUrl) {
      template = template.replace(/\$\{bannerUrl\}/g, params.bannerUrl);
    } else {
      // Ocultar sección de banner
      template = template.replace(/<div class="banner-container"[^>]*>[\s\S]*?<\/div>/g, '');
    }
    
    // Manejar courseTitle (ocultar si no existe)
    if (params.courseTitle) {
      template = template.replace(/\$\{courseTitle\}/g, params.courseTitle);
    } else {
      // Ocultar fila de curso
      template = template.replace(/<div class="info-row" id="course-title-row">[\s\S]*?<\/div>/g, '');
    }
    
    // Renderizar speakers si existen
    let speakersHTML = '';
    if (params.speakers && params.speakers.length > 0) {
      speakersHTML = params.speakers.map(speaker => {
        const avatarHTML = speaker.photoURL
          ? `<img src="${speaker.photoURL}" alt="${speaker.name}" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 15px; object-fit: cover;">`
          : `<div style="width: 50px; height: 50px; border-radius: 50%; margin-right: 15px; background-color: #FD002A; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold;">${speaker.name.charAt(0).toUpperCase()}</div>`;
        
        const roleHTML = speaker.role ? `<p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">${speaker.role}</p>` : '';
        
        return `
          <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 10px; background-color: #ffffff; border-radius: 6px;">
            ${avatarHTML}
            <div style="flex: 1;">
              <p style="font-weight: 600; color: #1f2937; margin: 0; font-size: 16px;">${speaker.name}</p>
              ${roleHTML}
            </div>
          </div>
        `;
      }).join('');
      
      template = template.replace(/\$\{speakersHtml\}/g, speakersHTML);
    } else {
      // Ocultar sección de speakers
      template = template.replace(/<div class="speakers-section"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g, '');
    }
    
    return template;
  } catch (error) {
    console.error("Error al leer el template de recordatorio:", error);
    return `
      <html>
        <body>
          <h1>¡Hola ${params.studentName}!</h1>
          <h2>Recordatorio: ${params.lessonTitle}</h2>
          <p>Fecha: ${params.sessionDate} - ${params.sessionTime}</p>
          <a href="${params.lessonUrl}">Ir a la lección</a>
        </body>
      </html>
    `;
  }
}

export function getWelcomeEmailSubject(name: string): string {
  return `¡Bienvenido ${name}! - MicroCert`;
}

export function getReminderEmailSubject(lessonTitle: string): string {
  return `Recordatorio: ${lessonTitle} - MicroCert`;
}
