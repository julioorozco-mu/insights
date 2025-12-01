/**
 * Script para poblar la base de datos Supabase con datos de prueba
 * Ejecutar: npx ts-node --esm src/scripts/seedData.ts
 * 
 * ORDEN DE EJECUCIÓN (respetando dependencias):
 * 1. users (tabla base - sin dependencias)
 * 2. teachers (depende de users.id)
 * 3. students (depende de users.id)
 * 4. certificate_templates (sin dependencias)
 * 5. courses (depende de teachers.id para speaker_ids)
 * 6. lessons (depende de courses.id)
 * 7. surveys (depende de courses.id)
 * 8. student_enrollments (depende de students.id y courses.id)
 * 9. file_attachments (sin dependencias directas)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config({ path: ".env" });

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Cliente con service role para bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Nombres de tablas
const TABLES = {
  USERS: "users",
  STUDENTS: "students",
  TEACHERS: "teachers",
  COURSES: "courses",
  LESSONS: "lessons",
  SURVEYS: "surveys",
  SURVEY_RESPONSES: "survey_responses",
  CERTIFICATE_TEMPLATES: "certificate_templates",
  CERTIFICATES: "certificates",
  STUDENT_ENROLLMENTS: "student_enrollments",
  FILE_ATTACHMENTS: "file_attachments",
  LIVE_POLLS: "live_polls",
  LIVE_CHATS: "live_chats",
  LESSON_ATTENDANCE: "lesson_attendance",
  CERTIFICATE_DOWNLOADS: "certificate_downloads",
  AUDIENCE_QUESTIONS: "audience_questions",
  LESSON_NOTES: "lesson_notes",
  LIVE_HOSTS: "live_hosts",
  POLL_RESPONSES: "poll_responses",
} as const;

// Usuarios de prueba
const testUsers = [
  {
    email: "admin@test.com",
    password: "Admin123!",
    name: "Carlos Administrador",
    role: "admin" as const,
    bio: "Administrador del sistema",
  },
  {
    email: "teacher@test.com",
    password: "Teacher123!",
    name: "María García",
    role: "teacher" as const,
    bio: "Instructora de programación con 10 años de experiencia",
    expertise: ["React", "TypeScript", "Node.js", "Supabase"],
  },
  {
    email: "teacher2@test.com",
    password: "Teacher123!",
    name: "Juan Pérez",
    role: "teacher" as const,
    bio: "Experto en diseño UX/UI y desarrollo frontend",
    expertise: ["UX/UI", "Figma", "Design Systems"],
  },
  {
    email: "student@test.com",
    password: "Student123!",
    name: "Ana López",
    role: "student" as const,
  },
  {
    email: "student2@test.com",
    password: "Student123!",
    name: "Pedro Martínez",
    role: "student" as const,
  },
];

// Cursos de prueba - Tecnología para la Docencia
const testCourses = [
  {
    title: "Herramientas Digitales para el Aula Virtual",
    description: "Aprende a utilizar las principales herramientas digitales para crear experiencias de aprendizaje interactivas: Canva, Genially, Padlet, Kahoot y más.",
    coverImageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800",
    tags: ["Herramientas Digitales", "Aula Virtual", "Educación"],
    difficulty: "beginner" as const,
    durationMinutes: 600,
    isActive: true,
  },
  {
    title: "Inteligencia Artificial Aplicada a la Educación",
    description: "Descubre cómo integrar ChatGPT, Claude y otras herramientas de IA para optimizar la planificación de clases, crear materiales didácticos y personalizar el aprendizaje.",
    coverImageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800",
    tags: ["Inteligencia Artificial", "IA Educativa", "Innovación"],
    difficulty: "intermediate" as const,
    durationMinutes: 900,
    isActive: true,
  },
  {
    title: "Diseño de Cursos en Línea con Metodología ADDIE",
    description: "Domina el proceso completo de diseño instruccional: análisis, diseño, desarrollo, implementación y evaluación de cursos virtuales efectivos.",
    coverImageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800",
    tags: ["Diseño Instruccional", "E-learning", "ADDIE"],
    difficulty: "advanced" as const,
    durationMinutes: 1200,
    isActive: true,
  },
];

// Lecciones de prueba (courseId se asigna dinámicamente)
const testLessons = [
  {
    title: "Introducción a las Herramientas Digitales",
    description: "Panorama general de las herramientas disponibles para docentes y criterios de selección según objetivos pedagógicos.",
    order: 1,
    isActive: true,
  },
  {
    title: "Creación de Contenido Visual con Canva",
    description: "Diseño de presentaciones, infografías y materiales didácticos atractivos usando Canva for Education.",
    order: 2,
    isActive: true,
  },
  {
    title: "Gamificación del Aprendizaje con Kahoot",
    description: "Cómo crear cuestionarios interactivos y dinámicas de juego para evaluar y motivar a los estudiantes.",
    order: 3,
    isActive: true,
  },
];

// Templates de certificados
const testCertificateTemplates = [
  {
    title: "Certificado Estándar",
    backgroundUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200",
    signatureUrls: [],
    style: {
      fontFamily: "Helvetica",
      colorPrimary: "#1a73e8",
      positionMap: {
        studentName: { x: 400, y: 300 },
        courseName: { x: 400, y: 400 },
        date: { x: 400, y: 500 },
      },
    },
  },
];

// Encuestas de prueba (courseId se asigna dinámicamente)
const testSurveys = [
  {
    title: "Evaluación del Curso",
    description: "Tu opinión nos ayuda a mejorar la calidad de los cursos",
    type: "exit" as const,
    questions: [
      {
        id: "q1",
        type: "multiple_choice" as const,
        questionText: "¿Cómo calificarías el contenido del curso?",
        options: [
          { label: "Excelente", value: "5" },
          { label: "Muy bueno", value: "4" },
          { label: "Bueno", value: "3" },
          { label: "Regular", value: "2" },
          { label: "Necesita mejorar", value: "1" },
        ],
        isRequired: true,
        order: 1,
      },
      {
        id: "q2",
        type: "multiple_choice" as const,
        questionText: "¿Los materiales y recursos fueron útiles para tu aprendizaje?",
        options: [
          { label: "Totalmente de acuerdo", value: "5" },
          { label: "De acuerdo", value: "4" },
          { label: "Neutral", value: "3" },
          { label: "En desacuerdo", value: "2" },
          { label: "Totalmente en desacuerdo", value: "1" },
        ],
        isRequired: true,
        order: 2,
      },
      {
        id: "q3",
        type: "multiple_choice" as const,
        questionText: "¿Podrías aplicar lo aprendido en tu práctica docente?",
        options: [
          { label: "Definitivamente sí", value: "5" },
          { label: "Probablemente sí", value: "4" },
          { label: "No estoy seguro", value: "3" },
          { label: "Probablemente no", value: "2" },
          { label: "Definitivamente no", value: "1" },
        ],
        isRequired: true,
        order: 3,
      },
      {
        id: "q4",
        type: "text" as const,
        questionText: "¿Qué herramienta o tema te gustaría que se agregara en futuros cursos?",
        isRequired: false,
        order: 4,
      },
    ],
  },
];

async function seedDatabase() {
  console.log("🌱 Iniciando población de base de datos Supabase...\n");
  console.log("📋 Orden de inserción respetando dependencias:");
  console.log("   1. users → 2. teachers/students → 3. certificate_templates");
  console.log("   4. courses → 5. lessons → 6. surveys → 7. enrollments\n");

  try {
    // ══════════════════════════════════════════════════════════════════
    // PASO 1: Crear usuarios en Auth y tabla users (SIN DEPENDENCIAS)
    // ══════════════════════════════════════════════════════════════════
    console.log("👥 [1/7] Creando usuarios en Supabase Auth y tabla users...");
    const createdUsers: any[] = [];

    for (const userData of testUsers) {
      try {
        // Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
        });

        if (authError) {
          if (authError.message.includes("already been registered")) {
            console.log(`⚠️  Usuario ya existe en Auth: ${userData.email}`);
            // Buscar el usuario existente
            const { data: existingUser } = await supabase
              .from(TABLES.USERS)
              .select("id")
              .eq("email", userData.email)
              .single();
            if (existingUser) {
              createdUsers.push({ ...userData, id: existingUser.id });
            }
            continue;
          }
          throw authError;
        }

        const userId = authData.user!.id;

        // Insertar en tabla users
        const { error: userError } = await supabase.from(TABLES.USERS).insert({
          id: userId,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          bio: userData.bio || "",
          is_verified: true,
        });

        if (userError && !userError.message.includes("duplicate")) {
          console.error(`❌ Error insertando en users: ${userError.message}`);
        }

        createdUsers.push({ ...userData, id: userId });
        console.log(`   ✅ ${userData.email} (${userData.role})`);
      } catch (error: any) {
        console.error(`   ❌ Error creando ${userData.email}:`, error.message);
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // PASO 2: Crear registros en teachers y students (DEPENDE DE users)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n👨‍🏫 [2/7] Creando registros en teachers y students...");
    
    for (const userData of createdUsers) {
      if (userData.role === "teacher") {
        const { error } = await supabase.from(TABLES.TEACHERS).insert({
          user_id: userData.id,
          expertise: userData.expertise || [],
          about_me: userData.bio || "",
          events: [],
          favorite_books: [],
          published_books: [],
          external_courses: [],
          achievements: [],
          services: [],
        });
        if (error && !error.message.includes("duplicate")) {
          console.error(`   ❌ Error en teachers: ${error.message}`);
        } else {
          console.log(`   ✅ Teacher: ${userData.name}`);
        }
      }

      if (userData.role === "student") {
        const { error } = await supabase.from(TABLES.STUDENTS).insert({
          user_id: userData.id,
        });
        if (error && !error.message.includes("duplicate")) {
          console.error(`   ❌ Error en students: ${error.message}`);
        } else {
          console.log(`   ✅ Student: ${userData.name}`);
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // PASO 3: Crear templates de certificados (SIN DEPENDENCIAS)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n🎓 [3/7] Creando templates de certificados...");
    const createdTemplates: any[] = [];
    const adminUser = createdUsers.find((u) => u.role === "admin");

    for (const templateData of testCertificateTemplates) {
      const { data, error } = await supabase
        .from(TABLES.CERTIFICATE_TEMPLATES)
        .insert({
          title: templateData.title,
          background_url: templateData.backgroundUrl,
          elements: templateData.style,
          page_size: "letter",
          orientation: "landscape",
          created_by: adminUser?.id || createdUsers[0]?.id,
        })
        .select()
        .single();

      if (error && !error.message.includes("duplicate")) {
        console.error(`   ❌ Error: ${error.message}`);
      } else if (data) {
        createdTemplates.push(data);
        console.log(`   ✅ ${templateData.title}`);
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // PASO 4: Crear cursos (DEPENDE DE teachers)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n📚 [4/7] Creando cursos...");
    const teachers = createdUsers.filter((u) => u.role === "teacher");
    const createdCourses: any[] = [];

    for (let i = 0; i < testCourses.length; i++) {
      const courseData = testCourses[i];
      const teacher = teachers[i % teachers.length];

      if (!teacher) {
        console.log("   ⚠️ No hay teachers disponibles");
        continue;
      }

      const { data, error } = await supabase
        .from(TABLES.COURSES)
        .insert({
          title: courseData.title,
          description: courseData.description,
          teacher_ids: [teacher.id],
          cover_image_url: courseData.coverImageUrl,
          tags: courseData.tags,
          difficulty: courseData.difficulty,
          duration_minutes: courseData.durationMinutes,
          lesson_ids: [],
          is_active: courseData.isActive,
          certificate_template_id: createdTemplates[0]?.id || null,
        })
        .select()
        .single();

      if (error && !error.message.includes("duplicate")) {
        console.error(`   ❌ Error: ${error.message}`);
      } else if (data) {
        createdCourses.push(data);
        console.log(`   ✅ ${courseData.title}`);
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // PASO 5: Crear lecciones (DEPENDE DE courses)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n📖 [5/7] Creando lecciones...");
    const createdLessons: any[] = [];
    const firstTeacher = teachers[0];

    if (createdCourses.length > 0) {
      const firstCourse = createdCourses[0];

      for (const lessonData of testLessons) {
        const { data, error } = await supabase
          .from(TABLES.LESSONS)
          .insert({
            course_id: firstCourse.id,
            title: lessonData.title,
            description: lessonData.description,
            order: lessonData.order,
            is_active: lessonData.isActive,
            is_published: false,
            is_live: false,
            live_status: "idle",
            type: "video",
            streaming_type: "agora",
            duration_minutes: 60,
            created_by: firstTeacher?.id || adminUser?.id,
            attachment_ids: [],
            resource_ids: [],
          })
          .select()
          .single();

        if (error && !error.message.includes("duplicate")) {
          console.error(`   ❌ Error: ${error.message}`);
        } else if (data) {
          createdLessons.push(data);
          console.log(`   ✅ ${lessonData.title}`);
        }
      }

      // Actualizar curso con lesson_ids
      if (createdLessons.length > 0) {
        const lessonIds = createdLessons.map((l) => l.id);
        await supabase
          .from(TABLES.COURSES)
          .update({ lesson_ids: lessonIds })
          .eq("id", firstCourse.id);
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // PASO 6: Crear encuestas (DEPENDE DE courses)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n📊 [6/7] Creando encuestas...");

    if (createdCourses.length > 0) {
      const firstCourse = createdCourses[0];

      for (const surveyData of testSurveys) {
        const { error } = await supabase.from(TABLES.SURVEYS).insert({
          course_id: firstCourse.id,
          title: surveyData.title,
          description: surveyData.description,
          type: surveyData.type,
          questions: surveyData.questions,
        });

        if (error && !error.message.includes("duplicate")) {
          console.error(`   ❌ Error: ${error.message}`);
        } else {
          console.log(`   ✅ ${surveyData.title}`);
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // PASO 7: Crear inscripciones (DEPENDE DE students Y courses)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n📝 [7/7] Creando inscripciones de estudiantes...");
    const studentUsers = createdUsers.filter((u) => u.role === "student");

    for (const studentUser of studentUsers) {
      // Buscar el ID del registro en la tabla students por user_id
      const { data: studentRecord } = await supabase
        .from(TABLES.STUDENTS)
        .select("id")
        .eq("user_id", studentUser.id)
        .single();

      if (!studentRecord) {
        console.error(`   ❌ No se encontró registro de estudiante para ${studentUser.name}`);
        continue;
      }

      for (const course of createdCourses) {
        const { error } = await supabase.from(TABLES.STUDENT_ENROLLMENTS).insert({
          student_id: studentRecord.id,
          course_id: course.id,
          enrolled_at: new Date().toISOString(),
          progress: 0,
          completed_lessons: [],
        });

        if (error && !error.message.includes("duplicate")) {
          console.error(`   ❌ Error: ${error.message}`);
        } else {
          console.log(`   ✅ ${studentUser.name} → ${course.title}`);
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // RESUMEN FINAL
    // ══════════════════════════════════════════════════════════════════
    console.log("\n" + "═".repeat(60));
    console.log("✨ ¡Base de datos Supabase poblada exitosamente!");
    console.log("═".repeat(60));
    
    console.log("\n📊 Resumen de datos creados:");
    console.log(`   • Usuarios: ${createdUsers.length}`);
    console.log(`   • Teachers: ${teachers.length}`);
    console.log(`   • Students: ${studentUsers.length}`);
    console.log(`   • Cursos: ${createdCourses.length}`);
    console.log(`   • Lecciones: ${createdLessons.length}`);
    console.log(`   • Templates: ${createdTemplates.length}`);
    
    console.log("\n📝 Credenciales de prueba:");
    console.log("─".repeat(50));
    testUsers.forEach((user) => {
      console.log(`   ${user.role.toUpperCase().padEnd(10)} │ ${user.email.padEnd(25)} │ ${user.password}`);
    });
    console.log("─".repeat(50));
    
  } catch (error) {
    console.error("\n❌ Error poblando la base de datos:", error);
  }

  process.exit(0);
}

// Ejecutar el script
seedDatabase();
