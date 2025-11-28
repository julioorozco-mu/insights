import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  Timestamp,
  getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SpeakerResource, CreateSpeakerResourceData, UpdateSpeakerResourceData } from "@/types/resource";

const COLLECTION_NAME = "speakerResources";

export const resourceService = {
  // Crear un nuevo recurso
  async create(data: CreateSpeakerResourceData): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      assignedCourses: [],
      isDeleted: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  // Obtener todos los recursos de un speaker
  async getByOwnerId(ownerId: string): Promise<SpeakerResource[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("ownerId", "==", ownerId),
      where("isDeleted", "==", false)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })) as SpeakerResource[];
  },

  // Obtener un recurso por ID
  async getById(id: string): Promise<SpeakerResource | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: docSnap.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    } as SpeakerResource;
  },

  // Actualizar un recurso
  async update(id: string, data: UpdateSpeakerResourceData): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  // Eliminar un recurso (soft delete)
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      isDeleted: true,
      updatedAt: Timestamp.now(),
    });
  },

  // Asignar recurso a un curso
  async assignToCourse(resourceId: string, courseId: string): Promise<void> {
    const resource = await this.getById(resourceId);
    if (!resource) throw new Error("Resource not found");

    const assignedCourses = resource.assignedCourses || [];
    if (!assignedCourses.includes(courseId)) {
      assignedCourses.push(courseId);
      await this.update(resourceId, { assignedCourses });
    }
  },

  // Desasignar recurso de un curso
  async unassignFromCourse(resourceId: string, courseId: string): Promise<void> {
    const resource = await this.getById(resourceId);
    if (!resource) throw new Error("Resource not found");

    const assignedCourses = (resource.assignedCourses || []).filter(id => id !== courseId);
    await this.update(resourceId, { assignedCourses });
  },

  // Obtener recursos asignados a un curso
  async getByCourseId(courseId: string): Promise<SpeakerResource[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("assignedCourses", "array-contains", courseId),
      where("isDeleted", "==", false)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })) as SpeakerResource[];
  },
};
