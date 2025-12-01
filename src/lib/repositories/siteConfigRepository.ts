import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";
import { HomepageConfig, HomepageBannerItem } from "@/types/siteConfig";

export class SiteConfigRepository {
  private table = TABLES.SITE_CONFIG;

  async get(key: string): Promise<unknown> {
    const { data } = await supabaseClient
      .from(this.table)
      .select("value")
      .eq("key", key)
      .single();
    return data?.value;
  }

  async set(key: string, value: unknown): Promise<void> {
    const { error } = await supabaseClient
      .from(this.table)
      .upsert({ key, value }, { onConflict: "key" });
    if (error) throw error;
  }

  async getAll(): Promise<Record<string, unknown>> {
    const { data } = await supabaseClient
      .from(this.table)
      .select("key, value");
    
    return (data || []).reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, unknown>);
  }

  async getHomepageConfig(): Promise<HomepageConfig | null> {
    const config = await this.get("homepage");
    if (!config) return null;
    
    // Compatibilidad con formato antiguo (bannerCourseIds)
    const rawConfig = config as { bannerCourseIds?: string[]; bannerItems?: HomepageBannerItem[] };
    if (rawConfig.bannerItems) {
      return rawConfig as HomepageConfig;
    }
    
    // Convertir formato antiguo a nuevo
    if (rawConfig.bannerCourseIds) {
      return {
        bannerItems: rawConfig.bannerCourseIds.map((id) => ({ id, type: "course" as const })),
      };
    }
    
    return { bannerItems: [] };
  }

  async saveHomepageConfig(config: HomepageConfig): Promise<void> {
    await this.set("homepage", config);
  }

  // Alias para compatibilidad
  async setHomepageConfig(config: HomepageConfig): Promise<void> {
    await this.saveHomepageConfig(config);
  }
}

export const siteConfigRepository = new SiteConfigRepository();
