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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/utils/constants";
import { User, CreateUserData, UpdateUserData } from "@/types/user";
import { studentRepository } from "./studentRepository";

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

export class UserRepository {
  private collectionRef = collection(db, COLLECTIONS.USERS);

  async create(id: string, data: CreateUserData): Promise<User> {
    const now = new Date();
    const nowString = now.toISOString();
    
    const userData: Omit<User, "id"> = {
      name: data.name,
      lastName: data.lastName,
      email: data.email,
      role: data.role || "student",
      phone: data.phone,
      username: data.username,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      state: data.state,
      bio: data.bio,
      isVerified: false,
      createdAt: nowString,
      updatedAt: nowString,
    };

    try {
      // Create user document - remove undefined fields
      const cleanUserData = removeUndefined({
        ...userData,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });
      
      await setDoc(doc(this.collectionRef, id), cleanUserData);

      // If role is student, also create student document
      if (userData.role === "student") {
        await studentRepository.create({
          userId: id,
          name: data.name,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          username: data.username,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          state: data.state,
        });
      }

      return { id, ...userData };
    } catch (error) {
      console.error("Error creating user/student documents:", error);
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const docSnap = await getDoc(doc(this.collectionRef, id));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    } as User;
  }

  async findByEmail(email: string): Promise<User | null> {
    const q = query(this.collectionRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;

    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    } as User;
  }

  async findAll(): Promise<User[]> {
    const querySnapshot = await getDocs(this.collectionRef);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as User;
    });
  }

  async update(id: string, data: UpdateUserData): Promise<void> {
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

export const userRepository = new UserRepository();
