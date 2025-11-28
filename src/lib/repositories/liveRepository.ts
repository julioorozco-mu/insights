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
import { LiveStream, CreateLiveStreamData } from "@/types/live";

export class LiveRepository {
  private collectionRef = collection(db, COLLECTIONS.LIVE_STREAMS);

  async create(data: CreateLiveStreamData & {
    agoraChannel: string;
    agoraAppId: string;
  }): Promise<LiveStream> {
    const now = new Date();
    const streamData = {
      title: data.title,
      description: data.description,
      instructorId: data.instructorId,
      agoraChannel: data.agoraChannel,
      agoraAppId: data.agoraAppId,
      active: false,
      startAt: data.startAt ? Timestamp.fromDate(data.startAt) : null,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    const docRef = await addDoc(this.collectionRef, streamData);

    return {
      id: docRef.id,
      title: data.title,
      description: data.description,
      instructorId: data.instructorId,
      agoraChannel: data.agoraChannel,
      agoraAppId: data.agoraAppId,
      active: false,
      startAt: data.startAt,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findById(id: string): Promise<LiveStream | null> {
    const docSnap = await getDoc(doc(this.collectionRef, id));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      startAt: data.startAt?.toDate(),
      endAt: data.endAt?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as LiveStream;
  }

  async findAll(): Promise<LiveStream[]> {
    const q = query(this.collectionRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startAt: data.startAt?.toDate(),
        endAt: data.endAt?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as LiveStream;
    });
  }

  async findActive(): Promise<LiveStream[]> {
    const q = query(
      this.collectionRef,
      where("active", "==", true),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startAt: data.startAt?.toDate(),
        endAt: data.endAt?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as LiveStream;
    });
  }

  async findByInstructor(instructorId: string): Promise<LiveStream[]> {
    const q = query(
      this.collectionRef,
      where("instructorId", "==", instructorId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startAt: data.startAt?.toDate(),
        endAt: data.endAt?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as LiveStream;
    });
  }

  async updateStatus(id: string, active: boolean): Promise<void> {
    const updateData: Record<string, unknown> = {
      active,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    if (active) {
      updateData.startAt = Timestamp.fromDate(new Date());
    } else {
      updateData.endAt = Timestamp.fromDate(new Date());
    }

    await updateDoc(doc(this.collectionRef, id), updateData);
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.collectionRef, id));
  }
}

export const liveRepository = new LiveRepository();
