import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  LessonAttendance,
  CreateAttendanceData,
  UpdateAttendanceData,
  LiveStreamSession,
  StudentAttendanceStats,
} from "@/types/attendance";

const ATTENDANCE_COLLECTION = "lessonAttendance";
const SESSIONS_COLLECTION = "liveStreamSessions";

export const attendanceService = {
  // Crear o obtener registro de asistencia
  async getOrCreate(
    lessonId: string,
    studentId: string,
    courseId: string
  ): Promise<LessonAttendance> {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where("lessonId", "==", lessonId),
      where("studentId", "==", studentId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as LessonAttendance;
    }

    // Crear nuevo registro
    const docRef = await addDoc(collection(db, ATTENDANCE_COLLECTION), {
      lessonId,
      studentId,
      courseId,
      totalLiveMinutes: 0,
      attendedLive: false,
      completedEntrySurvey: false,
      completedExitSurvey: false,
      livePollsAnswered: 0,
      totalLivePolls: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    const newDoc = await getDoc(docRef);
    return {
      id: newDoc.id,
      ...newDoc.data(),
      createdAt: newDoc.data()?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: newDoc.data()?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    } as LessonAttendance;
  },

  // Actualizar asistencia
  async update(id: string, data: UpdateAttendanceData): Promise<void> {
    const docRef = doc(db, ATTENDANCE_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  // Registrar entrada al stream en vivo
  async joinLiveStream(lessonId: string, studentId: string): Promise<string> {
    const sessionRef = await addDoc(collection(db, SESSIONS_COLLECTION), {
      lessonId,
      studentId,
      joinedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    });
    return sessionRef.id;
  },

  // Registrar salida del stream en vivo
  async leaveLiveStream(sessionId: string): Promise<void> {
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (sessionDoc.exists()) {
      const joinedAt = sessionDoc.data().joinedAt?.toDate();
      const leftAt = new Date();
      const durationMinutes = joinedAt
        ? Math.floor((leftAt.getTime() - joinedAt.getTime()) / 1000 / 60)
        : 0;

      await updateDoc(sessionRef, {
        leftAt: Timestamp.now(),
        durationMinutes,
      });

      // Actualizar asistencia total
      const lessonId = sessionDoc.data().lessonId;
      const studentId = sessionDoc.data().studentId;
      await this.updateTotalLiveMinutes(lessonId, studentId);
    }
  },

  // Calcular tiempo total en stream
  async updateTotalLiveMinutes(lessonId: string, studentId: string): Promise<void> {
    const q = query(
      collection(db, SESSIONS_COLLECTION),
      where("lessonId", "==", lessonId),
      where("studentId", "==", studentId)
    );
    const snapshot = await getDocs(q);

    let totalMinutes = 0;
    snapshot.docs.forEach((doc) => {
      const duration = doc.data().durationMinutes || 0;
      totalMinutes += duration;
    });

    // Obtener registro de asistencia
    const attendanceQuery = query(
      collection(db, ATTENDANCE_COLLECTION),
      where("lessonId", "==", lessonId),
      where("studentId", "==", studentId)
    );
    const attendanceSnapshot = await getDocs(attendanceQuery);

    if (!attendanceSnapshot.empty) {
      const attendanceDoc = attendanceSnapshot.docs[0];
      await updateDoc(doc(db, ATTENDANCE_COLLECTION, attendanceDoc.id), {
        totalLiveMinutes: totalMinutes,
        attendedLive: totalMinutes >= 5, // Asistió si estuvo al menos 5 minutos
        updatedAt: Timestamp.now(),
      });
    }
  },

  // Marcar encuesta de entrada como completada
  async markEntrySurveyCompleted(lessonId: string, studentId: string): Promise<void> {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where("lessonId", "==", lessonId),
      where("studentId", "==", studentId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const attendanceDoc = snapshot.docs[0];
      await updateDoc(doc(db, ATTENDANCE_COLLECTION, attendanceDoc.id), {
        completedEntrySurvey: true,
        updatedAt: Timestamp.now(),
      });
    }
  },

  // Marcar encuesta de salida como completada
  async markExitSurveyCompleted(lessonId: string, studentId: string): Promise<void> {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where("lessonId", "==", lessonId),
      where("studentId", "==", studentId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const attendanceDoc = snapshot.docs[0];
      await updateDoc(doc(db, ATTENDANCE_COLLECTION, attendanceDoc.id), {
        completedExitSurvey: true,
        updatedAt: Timestamp.now(),
      });
    }
  },

  // Incrementar contador de encuestas en vivo respondidas
  async incrementLivePollAnswer(lessonId: string, studentId: string): Promise<void> {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where("lessonId", "==", lessonId),
      where("studentId", "==", studentId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const attendanceDoc = snapshot.docs[0];
      const currentAnswered = attendanceDoc.data().livePollsAnswered || 0;
      await updateDoc(doc(db, ATTENDANCE_COLLECTION, attendanceDoc.id), {
        livePollsAnswered: currentAnswered + 1,
        updatedAt: Timestamp.now(),
      });
    }
  },

  // Actualizar total de encuestas en vivo de la lección
  async updateTotalLivePolls(lessonId: string, total: number): Promise<void> {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where("lessonId", "==", lessonId)
    );
    const snapshot = await getDocs(q);

    const updatePromises = snapshot.docs.map((doc) =>
      updateDoc(doc.ref, {
        totalLivePolls: total,
        updatedAt: Timestamp.now(),
      })
    );

    await Promise.all(updatePromises);
  },

  // Obtener asistencia de un estudiante en un curso
  async getStudentCourseAttendance(
    courseId: string,
    studentId: string
  ): Promise<LessonAttendance[]> {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where("courseId", "==", courseId),
      where("studentId", "==", studentId)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })) as LessonAttendance[];
  },

  // Obtener asistencia de todos los estudiantes en un curso
  async getCourseAttendance(courseId: string): Promise<LessonAttendance[]> {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where("courseId", "==", courseId)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })) as LessonAttendance[];
  },
};
