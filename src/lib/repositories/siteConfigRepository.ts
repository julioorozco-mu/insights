import { doc, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/utils/constants";
import { HomepageConfig } from "@/types/siteConfig";

const HOMEPAGE_CONFIG_DOC_ID = "homepage";

export class SiteConfigRepository {
  private docRef = doc(db, COLLECTIONS.SITE_CONFIG, HOMEPAGE_CONFIG_DOC_ID);

  async getHomepageConfig(): Promise<HomepageConfig | null> {
    const snapshot = await getDoc(this.docRef);
    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return {
      bannerItems: Array.isArray(data.bannerItems)
        ? data.bannerItems.map((item: any) => ({
            id: item.id,
            type: item.type === "lesson" ? "lesson" : "course",
          }))
        : [],
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    };
  }

  async saveHomepageConfig(config: HomepageConfig): Promise<void> {
    const data = {
      bannerItems: config.bannerItems.slice(0, 5).map((item) => ({
        id: item.id,
        type: item.type,
      })),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    await setDoc(this.docRef, data, { merge: true });
  }

  async updateHomepageConfig(config: Partial<HomepageConfig>): Promise<void> {
    const data: Record<string, unknown> = {};

    if (config.bannerItems) {
      data.bannerItems = config.bannerItems.slice(0, 5).map((item) => ({
        id: item.id,
        type: item.type,
      }));
    }

    data.updatedAt = Timestamp.fromDate(new Date());

    await updateDoc(this.docRef, data);
  }
}

export const siteConfigRepository = new SiteConfigRepository();
