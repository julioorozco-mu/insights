/**
 * Script para poblar la base de datos con datos de prueba
 * Ejecutar: npm run seed
 */

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, Timestamp } from "firebase/firestore";
import * as dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config({ path: ".env" });

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Usuarios de prueba
const testUsers = [
  {
    email: "admin@test.com",
    password: "admin123",
    name: "Carlos Administrador",
    role: "admin" as const,
    bio: "Administrador del sistema",
  },
  {
    email: "speaker@test.com",
    password: "speaker123",
    name: "María García",
    role: "speaker" as const,
    bio: "Instructora de programación con 10 años de experiencia",
    expertise: ["React", "TypeScript", "Node.js", "Firebase"],
  },
  {
    email: "speaker2@test.com",
    password: "speaker123",
    name: "Juan Pérez",
    role: "speaker" as const,
    bio: "Experto en diseño UX/UI y desarrollo frontend",
    expertise: ["UX/UI", "Figma", "Design Systems"],
  },
  {
    email: "student@test.com",
    password: "student123",
    name: "Ana López",
    role: "student" as const,
  },
  {
    email: "student2@test.com",
    password: "student123",
    name: "Pedro Martínez",
    role: "student" as const,
  },
];

// Cursos de prueba
const testCourses = [
  {
    title: "Comunicación Estratégica en Redes Sociales",
    description: "Estrategias efectivas para comunicación política digital y manejo de crisis en redes sociales",
    speakerIds: [], // Se llenará con el ID del speaker
    coverImageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800",
    tags: ["Comunicación", "Redes Sociales", "Estrategia Digital"],
    difficulty: "intermediate" as const,
    durationMinutes: 900,
    lessonIds: [],
    isActive: true,
  },
  {
    title: "Liderazgo Político y Gestión Pública",
    description: "Desarrollo de habilidades de liderazgo para servidores públicos y gestión efectiva de equipos",
    speakerIds: [], // Se llenará con el ID del segundo speaker
    coverImageUrl: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800",
    tags: ["Liderazgo", "Gestión Pública", "Administración"],
    difficulty: "advanced" as const,
    durationMinutes: 1200,
    lessonIds: [],
    isActive: true,
  },
  {
    title: "Análisis Político y Toma de Decisiones",
    description: "Herramientas para el análisis político estratégico y toma de decisiones basada en datos",
    speakerIds: [],
    coverImageUrl: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800",
    tags: ["Análisis", "Estrategia", "Decisiones", "Datos"],
    difficulty: "intermediate" as const,
    durationMinutes: 1000,
    lessonIds: [],
    isActive: true,
  },
];

// Lecciones de prueba
const testLessons = [
  {
    courseId: "",
    title: "Fundamentos de la Comunicación Digital",
    description: "Principios básicos de la comunicación política en medios digitales",
    order: 1,
    isActive: true,
  },
  {
    courseId: "",
    title: "Estrategias de Contenido en Redes",
    description: "Creación y distribución de contenido político efectivo",
    order: 2,
    isActive: true,
  },
  {
    courseId: "",
    title: "Manejo de Crisis y Respuesta Rápida",
    description: "Protocolos de actuación ante crisis en redes sociales",
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

// Encuestas de prueba
const testSurveys = [
  {
    title: "Evaluación del Curso",
    description: "Ayúdanos a mejorar con tus comentarios",
    type: "exit" as const,
    courseId: "",
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
          { label: "Malo", value: "1" },
        ],
        isRequired: true,
        order: 1,
      },
      {
        id: "q2",
        type: "multiple_choice" as const,
        questionText: "¿El instructor explicó claramente los conceptos?",
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
        type: "text" as const,
        questionText: "¿Qué te gustó más del curso?",
        isRequired: false,
        order: 3,
      },
    ],
  },
];

async function seedDatabase() {
  console.log("🌱 Iniciando población de base de datos...\n");

  try {
    // 1. Crear usuarios
    console.log("👥 Creando usuarios de prueba...");
    const createdUsers: any[] = [];

    for (const userData of testUsers) {
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          userData.email,
          userData.password
        );

        const userId = userCredential.user.uid;
        const now = new Date().toISOString();

        // Datos base del usuario
        const baseUserData = {
          name: userData.name,
          email: userData.email,
          role: userData.role,
          bio: userData.bio || "",
          isVerified: false,
          createdAt: now,
          updatedAt: now,
        };

        // Guardar en colección users
        await setDoc(doc(db, "users", userId), baseUserData);

        // Si es speaker, guardar también en colección speakers
        if (userData.role === "speaker") {
          await setDoc(doc(db, "speakers", userId), {
            ...baseUserData,
            expertise: userData.expertise || [],
            events: [],
          });
        }

        // Si es student, guardar también en colección students
        if (userData.role === "student") {
          await setDoc(doc(db, "students", userId), {
            ...baseUserData,
            enrollmentDate: now,
            completedCourses: [],
            certificates: [],
          });
        }

        createdUsers.push({ ...userData, id: userId });
        console.log(`✅ Usuario creado: ${userData.email} (${userData.role})`);
      } catch (error: any) {
        if (error.code === "auth/email-already-in-use") {
          console.log(`⚠️  Usuario ya existe: ${userData.email}`);
        } else {
          console.error(`❌ Error creando usuario ${userData.email}:`, error.message);
        }
      }
    }

    // 2. Crear cursos
    console.log("\n📚 Creando cursos de prueba...");
    const speakers = createdUsers.filter((u) => u.role === "speaker");
    const createdCourses: any[] = [];

    for (let i = 0; i < testCourses.length; i++) {
      const courseData = testCourses[i];
      const speaker = speakers[i % speakers.length];

      if (!speaker) {
        console.log("⚠️  No hay speakers disponibles");
        continue;
      }

      const courseRef = doc(collection(db, "courses"));
      const now = new Date().toISOString();

      await setDoc(courseRef, {
        ...courseData,
        speakerIds: [speaker.id],
        createdAt: now,
        updatedAt: now,
      });

      createdCourses.push({ ...courseData, id: courseRef.id, speakerIds: [speaker.id] });
      console.log(`✅ Curso creado: ${courseData.title}`);
    }

    // 3. Crear lecciones
    console.log("\n📖 Creando lecciones de prueba...");
    if (createdCourses.length > 0) {
      const firstCourse = createdCourses[0];

      for (const lessonData of testLessons) {
        const lessonRef = doc(collection(db, "lessons"));
        const now = new Date().toISOString();

        await setDoc(lessonRef, {
          ...lessonData,
          courseId: firstCourse.id,
          createdAt: now,
          updatedAt: now,
        });

        console.log(`✅ Lección creada: ${lessonData.title}`);
      }
    }

    // 4. Crear templates de certificados
    console.log("\n🎓 Creando templates de certificados...");
    for (const templateData of testCertificateTemplates) {
      const templateRef = doc(collection(db, "certificateTemplates"));
      const now = new Date().toISOString();

      await setDoc(templateRef, {
        ...templateData,
        createdAt: now,
        updatedAt: now,
      });

      console.log(`✅ Template creado: ${templateData.title}`);
    }

    // 5. Crear encuestas
    console.log("\n📊 Creando encuestas de prueba...");
    if (createdCourses.length > 0) {
      const firstCourse = createdCourses[0];

      for (const surveyData of testSurveys) {
        const surveyRef = doc(collection(db, "surveys"));
        const now = new Date().toISOString();

        await setDoc(surveyRef, {
          ...surveyData,
          courseId: firstCourse.id,
          createdAt: now,
          updatedAt: now,
        });

        console.log(`✅ Encuesta creada: ${surveyData.title}`);
      }
    }

    console.log("\n✨ ¡Base de datos poblada exitosamente!\n");
    console.log("📝 Credenciales de prueba:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    testUsers.forEach((user) => {
      console.log(`${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
    });
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("❌ Error poblando la base de datos:", error);
  }

  process.exit(0);
}

// Ejecutar el script
seedDatabase();
