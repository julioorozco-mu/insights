import { supabaseClient } from "@/lib/supabase";
import { TABLES } from "@/utils/constants";

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

  async getHomepageConfig(): Promise<{ bannerCourseIds?: string[] } | null> {
    const config = await this.get("homepage");
    return config as { bannerCourseIds?: string[] } | null;
  }

  async setHomepageConfig(config: { bannerCourseIds?: string[] }): Promise<void> {
    await this.set("homepage", config);
  }
}

export const siteConfigRepository = new SiteConfigRepository();
