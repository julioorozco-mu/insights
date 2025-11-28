export type HomepageBannerItemType = "course" | "lesson";

export interface HomepageBannerItem {
  id: string;
  type: HomepageBannerItemType;
}

export interface HomepageConfig {
  bannerItems: HomepageBannerItem[];
  updatedAt?: string;
}
