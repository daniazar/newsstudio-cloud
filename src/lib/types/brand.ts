// ============================================================
// Brand & Social Channel Types
// ============================================================

export interface SocialChannelPublish {
  id: string;
  videoId?: string;
  channelId?: string;
  platformVideoId?: string | null;
  status: string;
  title?: string | null;
  description?: string | null;
  viewCount?: number | null;
  likeCount?: number | null;
  commentCount?: number | null;
  publishedAt?: string | Date | null;
  scheduledFor?: string | Date | null;
  lastSyncedAt?: string | Date | null;
  createdAt?: string | Date | null;
  video?: {
    id?: string;
    outputPath?: string | null;
    story?: {
      id?: string;
      title?: string | null;
    } | null;
  } | null;
}

export interface BrandSocialChannel {
  id: string;
  companyId?: string;
  brandId: string;
  platform: "youtube" | "instagram" | "tiktok" | string;
  name?: string | null;
  handle?: string | null;
  profileImageUrl?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiry?: string | Date | null;
  subscriberCount?: number | null;
  followerCount?: number | null;
  lastSyncedAt?: string | Date | null;
  isActive?: boolean;
  isConnected?: boolean;
  hasCredentials?: boolean;
  titleTemplate?: string | null;
  descriptionTemplate?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  publishes?: SocialChannelPublish[];
}

export interface BrandPersona {
  id: string;
  name: string;
  avatarUrl?: string | null;
  avatarImageUrl?: string | null;
  role?: string | null;
  bio?: string | null;
}

export interface BrandRssFeed {
  id: string;
  name: string;
  url?: string;
}

export interface BrandRssGroup {
  id: string;
  name: string;
  color?: string | null;
  feeds?: BrandRssFeed[];
}

export interface BrandDetailItem {
  id: string;
  companyId?: string;
  name: string;
  handle: string;
  profileImageUrl: string | null;
  titleTemplate: string | null;
  descriptionTemplate: string | null;
  watermarkStorageKey: string | null;
  hashtagBank: string | null;
  toneOfVoice: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  captionStyle: string | null;
  preferredMusicMood: string | null;
  introVideoStorageKey: string | null;
  outroVideoStorageKey: string | null;
  logoStorageKeys: string | null;
  autoPublish: boolean;
  isActive?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  channels: BrandSocialChannel[];
  personas: BrandPersona[];
  rssGroups: BrandRssGroup[];
}
