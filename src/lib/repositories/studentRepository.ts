import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/utils/constants";

// Helper function to remove undefined values from an object
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  });
  return result;
}

export interface StudentData {
  userId: string;
  name: string;
  lastName?: string;
  email: string;
  phone?: string;
  username?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  state?: string;
  enrolledCourses: {
    courseId: string;
    enrolledAt: string;
    progress?: number;
    completedLessons?: string[];
  }[];
  completedCourses?: string[];
  certificates?: string[];
  enrollmentDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentData {
  userId: string;
  name: string;
  lastName?: string;
  email: string;
  phone?: string;
  username?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  state?: string;
}

export class StudentRepository {
  private collectionRef = collection(db, COLLECTIONS.STUDENTS);

  async create(data: CreateStudentData): Promise<StudentData> {
    const now = new Date();
    const nowString = now.toISOString();
    
    const studentData: StudentData = {
      userId: data.userId,
      name: data.name,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      username: data.username,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      state: data.state,
      enrolledCourses: [],
      completedCourses: [],
      certificates: [],
      enrollmentDate: nowString,
      createdAt: nowString,
      updatedAt: nowString,
    };

    // Remove undefined fields before saving
    const cleanStudentData = removeUndefined({
      ...studentData,
      enrollmentDate: Timestamp.fromDate(now),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });

    await setDoc(doc(this.collectionRef, data.userId), cleanStudentData);

    return studentData;
  }

  async findById(userId: string): Promise<StudentData | null> {
    const docSnap = await getDoc(doc(this.collectionRef, userId));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      userId: docSnap.id,
      ...data,
      enrollmentDate: data.enrollmentDate?.toDate?.()?.toISOString() || data.enrollmentDate,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    } as StudentData;
  }

  async findByEmail(email: string): Promise<StudentData | null> {
    const q = query(this.collectionRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;

    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      userId: doc.id,
      ...data,
      enrollmentDate: data.enrollmentDate?.toDate?.()?.toISOString() || data.enrollmentDate,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    } as StudentData;
  }

  async findAll(): Promise<StudentData[]> {
    const querySnapshot = await getDocs(this.collectionRef);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        userId: doc.id,
        ...data,
        enrollmentDate: data.enrollmentDate?.toDate?.()?.toISOString() || data.enrollmentDate,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as StudentData;
    });
  }

  async enrollInCourse(
    userId: string,
    courseId: string
  ): Promise<void> {
    const now = new Date();
    const enrollment = {
      courseId,
      enrolledAt: Timestamp.fromDate(now),
      progress: 0,
      completedLessons: [],
    };

    await updateDoc(doc(this.collectionRef, userId), {
      enrolledCourses: arrayUnion(enrollment),
      updatedAt: Timestamp.fromDate(now),
    });
  }

  async unenrollFromCourse(
    userId: string,
    courseId: string
  ): Promise<void> {
    const student = await this.findById(userId);
    if (!student) return;

    const updatedCourses = student.enrolledCourses.filter(
      (course) => course.courseId !== courseId
    );

    await updateDoc(doc(this.collectionRef, userId), {
      enrolledCourses: updatedCourses,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }

  async updateProgress(
    userId: string,
    courseId: string,
    progress: number,
    completedLessons: string[]
  ): Promise<void> {
    const student = await this.findById(userId);
    if (!student) return;

    const updatedCourses = student.enrolledCourses.map((course) => {
      if (course.courseId === courseId) {
        return {
          ...course,
          progress,
          completedLessons,
        };
      }
      return course;
    });

    await updateDoc(doc(this.collectionRef, userId), {
      enrolledCourses: updatedCourses,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }

  async addCompletedCourse(userId: string, courseId: string): Promise<void> {
    await updateDoc(doc(this.collectionRef, userId), {
      completedCourses: arrayUnion(courseId),
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }

  async addCertificate(userId: string, certificateId: string): Promise<void> {
    await updateDoc(doc(this.collectionRef, userId), {
      certificates: arrayUnion(certificateId),
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }

  async delete(userId: string): Promise<void> {
    await deleteDoc(doc(this.collectionRef, userId));
  }
}

export const studentRepository = new StudentRepository();
