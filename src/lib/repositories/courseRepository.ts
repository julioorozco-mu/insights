import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/utils/constants";
import { Course, CreateCourseData, UpdateCourseData } from "@/types/course";

export class CourseRepository {
  private collectionRef = collection(db, COLLECTIONS.COURSES);

  async create(data: CreateCourseData): Promise<Course> {
    const now = new Date();
    const nowString = now.toISOString();
    const courseData = {
      ...data,
      lessonIds: [],
      isActive: true,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    const sanitizedCourseData = Object.fromEntries(
      Object.entries(courseData).filter(([, value]) => value !== undefined)
    );

    const docRef = await addDoc(this.collectionRef, sanitizedCourseData);

    return {
      id: docRef.id,
      ...data,
      lessonIds: [],
      isActive: true,
      createdAt: nowString,
      updatedAt: nowString,
    };
  }

  async findById(id: string): Promise<Course | null> {
    const docSnap = await getDoc(doc(this.collectionRef, id));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    } as Course;
  }

  async findAll(): Promise<Course[]> {
    const q = query(this.collectionRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as Course;
    });
  }

  async findBySpeaker(speakerId: string): Promise<Course[]> {
    // Primero buscar cursos donde el speaker está directamente asignado
    const q = query(
      this.collectionRef,
      where("speakerIds", "array-contains", speakerId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    const directCourses = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as Course;
    });

    // También buscar cursos donde el speaker está asignado en lecciones
    const lessonsQuery = query(
      collection(db, 'lessons'),
      where("speakerIds", "array-contains", speakerId)
    );
    const lessonsSnapshot = await getDocs(lessonsQuery);
    
    // Obtener IDs únicos de cursos de las lecciones
    const courseIdsFromLessons = new Set(
      lessonsSnapshot.docs.map(doc => doc.data().courseId).filter(Boolean)
    );
    
    // Cargar esos cursos
    const coursesFromLessons: Course[] = [];
    for (const courseId of courseIdsFromLessons) {
      const courseDoc = await getDoc(doc(this.collectionRef, courseId));
      if (courseDoc.exists()) {
        const data = courseDoc.data();
        coursesFromLessons.push({
          id: courseDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        } as Course);
      }
    }

    // También buscar cursos donde el speaker está como co-host
    const coHostQuery = query(
      collection(db, 'lessons'),
      where("coHostIds", "array-contains", speakerId)
    );
    const coHostSnapshot = await getDocs(coHostQuery);
    
    // Obtener IDs únicos de cursos donde es co-host
    const courseIdsFromCoHost = new Set(
      coHostSnapshot.docs.map(doc => doc.data().courseId).filter(Boolean)
    );
    
    // Cargar esos cursos
    const coursesFromCoHost: Course[] = [];
    for (const courseId of courseIdsFromCoHost) {
      const courseDoc = await getDoc(doc(this.collectionRef, courseId));
      if (courseDoc.exists()) {
        const data = courseDoc.data();
        coursesFromCoHost.push({
          id: courseDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        } as Course);
      }
    }

    // Combinar todos los cursos y eliminar duplicados
    const allCourses = [...directCourses, ...coursesFromLessons, ...coursesFromCoHost];
    const uniqueCourses = allCourses.reduce((acc: Course[], course) => {
      if (!acc.find(c => c.id === course.id)) {
        acc.push(course);
      }
      return acc;
    }, []);

    // Ordenar por fecha de creación
    return uniqueCourses.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async findBySpeakerEmail(email: string): Promise<Course[]> {
    // Primero buscar el speaker por email para obtener su ID
    const speakerQuery = query(
      collection(db, 'speakers'),
      where("email", "==", email)
    );
    const speakerSnapshot = await getDocs(speakerQuery);
    
    if (speakerSnapshot.empty) {
      return [];
    }
    
    const speakerId = speakerSnapshot.docs[0].id;
    
    // Usar el método existente con el ID del speaker
    return this.findBySpeaker(speakerId);
  }

  async findPublished(): Promise<Course[]> {
    const q = query(
      this.collectionRef,
      where("isActive", "==", true),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as Course;
    });
  }

  async update(id: string, data: UpdateCourseData): Promise<void> {
    const updateData = {
      ...data,
      updatedAt: Timestamp.fromDate(new Date()),
    };
    await updateDoc(doc(this.collectionRef, id), updateData);
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.collectionRef, id));
  }
}

export const courseRepository = new CourseRepository();
