-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPipelinePaused" BOOLEAN NOT NULL DEFAULT false,
    "minJobsAudio" INTEGER NOT NULL DEFAULT 1,
    "minJobsVideo" INTEGER NOT NULL DEFAULT 1,
    "minJobsRender" INTEGER NOT NULL DEFAULT 1,
    "minJobsImage" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantReservation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "metadata" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "personaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RssFeed" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fetchIntervalMinutes" INTEGER NOT NULL DEFAULT 60,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchedAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "defaultPersonaId" TEXT,
    "autoScript" BOOLEAN NOT NULL DEFAULT true,
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "articlesTotal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RssFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "description" TEXT,
    "fullContent" TEXT,
    "author" TEXT,
    "pubDate" TIMESTAMP(3),
    "guid" TEXT NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INGESTED',
    "errorLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "articleImageUrls" TEXT,
    "articleVideoUrls" TEXT,
    "keywords" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'pending_review',

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "rawJson" TEXT NOT NULL,
    "headline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,
    "spokenText" TEXT,
    "imagePrompt" TEXT NOT NULL,
    "backgroundPrompt" TEXT,
    "assetPath" TEXT,
    "assetType" TEXT,
    "mediaSettings" TEXT,
    "transitionType" TEXT DEFAULT 'fade',
    "stickers" TEXT,
    "personaId" TEXT,
    "voiceParams" TEXT,
    "audioPath" TEXT,
    "presenterVideoPath" TEXT,
    "presenterStatus" TEXT,
    "personaAvatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "keyword" TEXT,
    "stockAssetSource" TEXT,
    "stockAssetQuery" TEXT,
    "suggestedPersonaId" TEXT,
    "sceneMode" TEXT NOT NULL DEFAULT 'portrait',
    "presenterType" TEXT,
    "sceneStrategy" TEXT,
    "backgroundType" TEXT,
    "echoImagePairId" TEXT,
    "mediaHistory" TEXT,
    "presetChoice" TEXT,
    "personaImagePrompt" TEXT,
    "presenterVideoPrompt" TEXT,
    "generatedAvatarKey" TEXT,
    "partnerPersonaId" TEXT,
    "partnerAvatarUrl" TEXT,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "aspectRatio" TEXT NOT NULL DEFAULT 'vertical',
    "outputPath" TEXT,
    "thumbnailPath" TEXT,
    "duration" DOUBLE PRECISION,
    "presenterVideoPath" TEXT,
    "presenterAudioPath" TEXT,
    "youtubeTitle" TEXT,
    "youtubeDescription" TEXT,
    "youtubeTags" TEXT,
    "youtubeCategory" TEXT,
    "instagramCaption" TEXT,
    "instagramHashtags" TEXT,
    "instagramAltText" TEXT,
    "globalBgVideoPath" TEXT,
    "bgMusicPath" TEXT,
    "bgMusicVolume" DOUBLE PRECISION DEFAULT 0.2,
    "sloganId" TEXT DEFAULT 'ruby-tech',
    "outroId" TEXT DEFAULT 'subscribe',
    "personaId" TEXT DEFAULT 'ruby',
    "renderProgress" DOUBLE PRECISION DEFAULT 0,
    "captionStyle" TEXT DEFAULT 'beast',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishStatus" TEXT DEFAULT 'PENDING',
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "totalLikes" INTEGER NOT NULL DEFAULT 0,
    "thumbnailStorageKey" TEXT,
    "subtitlePath" TEXT,
    "bgMusicId" TEXT,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "description" TEXT,
    "bio" TEXT,
    "systemPrompt" TEXT,
    "visualPrompt" TEXT,
    "visualPromptNeutral" TEXT,
    "visualBodyPrompt" TEXT,
    "voiceParams" TEXT,
    "avatarType" TEXT NOT NULL DEFAULT 'static_image',
    "defaultAvatarId" TEXT,
    "styleGuidelines" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystemPersona" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaMasterImage" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "attire" TEXT NOT NULL,
    "poseType" TEXT NOT NULL DEFAULT 'seated_desk',
    "frontalObjects" TEXT,
    "promptUsed" TEXT,
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "isTransparent" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonaMasterImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaActionLoop" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "masterImageId" TEXT NOT NULL,
    "actionName" TEXT NOT NULL,
    "actionPrompt" TEXT,
    "durationSec" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "frameCount" INTEGER NOT NULL DEFAULT 75,
    "fps" INTEGER NOT NULL DEFAULT 25,
    "baseVideoKey" TEXT,
    "pingPongVideoKey" TEXT NOT NULL,
    "latentsCacheKey" TEXT,
    "coordsCacheKey" TEXT,
    "maskCacheKey" TEXT,
    "isPreCached" BOOLEAN NOT NULL DEFAULT false,
    "emotion" TEXT,
    "rhetoricAction" TEXT,
    "energyLevel" TEXT,
    "poseState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonaActionLoop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaAvatar" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "personaId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "frameType" TEXT NOT NULL DEFAULT 'portrait',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "presetName" TEXT,
    "promptUsed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaAvatar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaVoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "personaId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "audioPath" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "embeddingPath" TEXT,
    "embeddingStorageKey" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaVoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialChannel" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "profileImageUrl" TEXT,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "titleTemplate" TEXT,
    "descriptionTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "profileImageUrl" TEXT,
    "titleTemplate" TEXT,
    "descriptionTemplate" TEXT,
    "watermarkStorageKey" TEXT,
    "hashtagBank" TEXT,
    "toneOfVoice" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "captionStyle" TEXT,
    "preferredMusicMood" TEXT,
    "introVideoStorageKey" TEXT,
    "outroVideoStorageKey" TEXT,
    "logoStorageKeys" TEXT,
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RssGroup" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#3b82f6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RssGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoPublish" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "platformVideoId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "publishedAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "title" TEXT,
    "description" TEXT,
    "tags" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoPublish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'latest_n',
    "count" INTEGER NOT NULL DEFAULT 1,
    "feedIds" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "targetChannelIds" TEXT,
    "personaId" TEXT NOT NULL,
    "autoScript" BOOLEAN NOT NULL DEFAULT true,
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "selectionCriteria" TEXT,
    "outputMode" TEXT DEFAULT 'roundup',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleRun" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "storyCount" INTEGER NOT NULL DEFAULT 0,
    "errorLog" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAsset" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "previewUrl" TEXT,
    "downloadUrl" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" DOUBLE PRECISION,
    "license" TEXT,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundMusic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bpm" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackgroundMusic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'full',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "currentStep" TEXT,
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "doneSteps" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workerId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorLog" TEXT,
    "config" TEXT,
    "durationMs" INTEGER,
    "creditsUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "studioType" TEXT,
    "studioPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLog" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaImagePair" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "image1Key" TEXT NOT NULL,
    "image2Key" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaImagePair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'full',
    "status" TEXT NOT NULL DEFAULT 'idle',
    "currentJobId" TEXT,
    "currentStep" TEXT,
    "gpuMemoryUsedMB" INTEGER,
    "gpuMemoryTotalMB" INTEGER,
    "ip" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTokenUsage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "estimatedCost" DOUBLE PRECISION NOT NULL,
    "storyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiTokenUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "orgId" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisualPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "imageDesc" TEXT,
    "videoDesc" TEXT,
    "soundEffects" TEXT,
    "category" TEXT NOT NULL,
    "subCategory" TEXT NOT NULL,
    "subSubCategory" TEXT,
    "categoryPath" TEXT,
    "tags" TEXT,
    "previewPath" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "isStudioApproved" BOOLEAN NOT NULL DEFAULT false,
    "isFullAttire" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisualPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Storefront" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'tiendanube',
    "logoUrl" TEXT,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "lastScrapedAt" TIMESTAMP(3),
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Storefront_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCampaign" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "storefrontId" TEXT,
    "brandId" TEXT,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "vendor" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comparePrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "typology" TEXT NOT NULL DEFAULT 'discrete_object',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rawMetadata" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAsset" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "rawUrl" TEXT NOT NULL,
    "storageKey" TEXT,
    "mattedKey" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdVariation" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "archetype" TEXT NOT NULL,
    "targetChannel" TEXT NOT NULL DEFAULT 'shopify_pdp',
    "aspectRatio" TEXT NOT NULL DEFAULT '9:16',
    "audioMode" TEXT NOT NULL DEFAULT 'voiceover_tts',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scriptJson" TEXT NOT NULL,
    "renderedVideoKey" TEXT,
    "renderedWebmKey" TEXT,
    "renderedGifKey" TEXT,
    "thumbnailKey" TEXT,
    "durationSeconds" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "embedCodeSnippet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdVariation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product3DAsset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "sourceAssetId" TEXT,
    "sourceImageKey" TEXT NOT NULL,
    "engine" TEXT NOT NULL DEFAULT 'auto',
    "quality" TEXT NOT NULL DEFAULT 'standard',
    "inferenceMs" INTEGER,
    "bgRemovalMs" INTEGER,
    "vertexCount" INTEGER,
    "faceCount" INTEGER,
    "textureSize" TEXT,
    "vramPeakGb" DOUBLE PRECISION,
    "meshKey" TEXT,
    "previewKey" TEXT,
    "turntableKey" TEXT,
    "turntableMp4Key" TEXT,
    "contactSheetKey" TEXT,
    "frames" INTEGER NOT NULL DEFAULT 120,
    "fps" INTEGER NOT NULL DEFAULT 30,
    "width" INTEGER NOT NULL DEFAULT 1080,
    "height" INTEGER NOT NULL DEFAULT 1080,
    "background" TEXT NOT NULL DEFAULT 'transparent',
    "cameraPreset" TEXT NOT NULL DEFAULT 'product_three_quarter',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorLog" TEXT,
    "generationJobId" TEXT,
    "serverJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product3DAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RssFeedToRssGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RssFeedToRssGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_BrandToRssGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BrandToRssGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_BrandToPersona" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BrandToPersona_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "TenantReservation_companyId_status_idx" ON "TenantReservation"("companyId", "status");

-- CreateIndex
CREATE INDEX "TenantReservation_expiresAt_idx" ON "TenantReservation"("expiresAt");

-- CreateIndex
CREATE INDEX "TenantReservation_companyId_type_status_expiresAt_idx" ON "TenantReservation"("companyId", "type", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "UsageLog_companyId_createdAt_idx" ON "UsageLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageLog_companyId_personaId_idx" ON "UsageLog"("companyId", "personaId");

-- CreateIndex
CREATE INDEX "UsageLog_companyId_type_createdAt_idx" ON "UsageLog"("companyId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "RssFeed_companyId_createdAt_idx" ON "RssFeed"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "RssFeed_companyId_isEnabled_idx" ON "RssFeed"("companyId", "isEnabled");

-- CreateIndex
CREATE INDEX "RssFeed_companyId_isEnabled_createdAt_idx" ON "RssFeed"("companyId", "isEnabled", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RssFeed_companyId_url_key" ON "RssFeed"("companyId", "url");

-- CreateIndex
CREATE INDEX "Story_companyId_pubDate_idx" ON "Story"("companyId", "pubDate");

-- CreateIndex
CREATE INDEX "Story_companyId_status_idx" ON "Story"("companyId", "status");

-- CreateIndex
CREATE INDEX "Story_companyId_status_pubDate_idx" ON "Story"("companyId", "status", "pubDate");

-- CreateIndex
CREATE INDEX "Story_companyId_feedId_idx" ON "Story"("companyId", "feedId");

-- CreateIndex
CREATE INDEX "Story_companyId_feedId_pubDate_idx" ON "Story"("companyId", "feedId", "pubDate");

-- CreateIndex
CREATE INDEX "Story_companyId_createdAt_idx" ON "Story"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Story_companyId_approvalStatus_pubDate_idx" ON "Story"("companyId", "approvalStatus", "pubDate");

-- CreateIndex
CREATE INDEX "Story_companyId_approvalStatus_createdAt_idx" ON "Story"("companyId", "approvalStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Story_companyId_category_pubDate_idx" ON "Story"("companyId", "category", "pubDate");

-- CreateIndex
CREATE INDEX "Story_feedId_idx" ON "Story"("feedId");

-- CreateIndex
CREATE UNIQUE INDEX "Story_companyId_link_key" ON "Story"("companyId", "link");

-- CreateIndex
CREATE UNIQUE INDEX "Story_companyId_guid_key" ON "Story"("companyId", "guid");

-- CreateIndex
CREATE UNIQUE INDEX "Script_storyId_key" ON "Script"("storyId");

-- CreateIndex
CREATE INDEX "Segment_partnerPersonaId_idx" ON "Segment"("partnerPersonaId");

-- CreateIndex
CREATE INDEX "Segment_personaId_idx" ON "Segment"("personaId");

-- CreateIndex
CREATE INDEX "Segment_assetPath_idx" ON "Segment"("assetPath");

-- CreateIndex
CREATE INDEX "Segment_presenterVideoPath_idx" ON "Segment"("presenterVideoPath");

-- CreateIndex
CREATE INDEX "Segment_audioPath_idx" ON "Segment"("audioPath");

-- CreateIndex
CREATE UNIQUE INDEX "Segment_scriptId_index_key" ON "Segment"("scriptId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "Video_storyId_key" ON "Video"("storyId");

-- CreateIndex
CREATE INDEX "Video_companyId_status_idx" ON "Video"("companyId", "status");

-- CreateIndex
CREATE INDEX "Video_companyId_createdAt_idx" ON "Video"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Video_companyId_status_createdAt_idx" ON "Video"("companyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Video_companyId_personaId_idx" ON "Video"("companyId", "personaId");

-- CreateIndex
CREATE INDEX "Video_companyId_publishStatus_idx" ON "Video"("companyId", "publishStatus");

-- CreateIndex
CREATE INDEX "Video_companyId_aspectRatio_createdAt_idx" ON "Video"("companyId", "aspectRatio", "createdAt");

-- CreateIndex
CREATE INDEX "Video_companyId_totalViews_idx" ON "Video"("companyId", "totalViews");

-- CreateIndex
CREATE INDEX "Video_bgMusicId_idx" ON "Video"("bgMusicId");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_slug_key" ON "Persona"("slug");

-- CreateIndex
CREATE INDEX "Persona_companyId_isSystemPersona_idx" ON "Persona"("companyId", "isSystemPersona");

-- CreateIndex
CREATE INDEX "Persona_isSystemPersona_isActive_idx" ON "Persona"("isSystemPersona", "isActive");

-- CreateIndex
CREATE INDEX "Persona_companyId_isActive_idx" ON "Persona"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "PersonaMasterImage_personaId_idx" ON "PersonaMasterImage"("personaId");

-- CreateIndex
CREATE INDEX "PersonaActionLoop_personaId_idx" ON "PersonaActionLoop"("personaId");

-- CreateIndex
CREATE INDEX "PersonaActionLoop_masterImageId_idx" ON "PersonaActionLoop"("masterImageId");

-- CreateIndex
CREATE INDEX "PersonaActionLoop_personaId_actionName_idx" ON "PersonaActionLoop"("personaId", "actionName");

-- CreateIndex
CREATE INDEX "PersonaActionLoop_personaId_emotion_idx" ON "PersonaActionLoop"("personaId", "emotion");

-- CreateIndex
CREATE INDEX "PersonaActionLoop_personaId_rhetoricAction_idx" ON "PersonaActionLoop"("personaId", "rhetoricAction");

-- CreateIndex
CREATE INDEX "PersonaAvatar_personaId_frameType_idx" ON "PersonaAvatar"("personaId", "frameType");

-- CreateIndex
CREATE INDEX "PersonaAvatar_personaId_presetName_idx" ON "PersonaAvatar"("personaId", "presetName");

-- CreateIndex
CREATE INDEX "PersonaAvatar_companyId_idx" ON "PersonaAvatar"("companyId");

-- CreateIndex
CREATE INDEX "PersonaVoice_personaId_isDefault_idx" ON "PersonaVoice"("personaId", "isDefault");

-- CreateIndex
CREATE INDEX "PersonaVoice_isDefault_idx" ON "PersonaVoice"("isDefault");

-- CreateIndex
CREATE INDEX "PersonaVoice_companyId_idx" ON "PersonaVoice"("companyId");

-- CreateIndex
CREATE INDEX "SocialChannel_brandId_idx" ON "SocialChannel"("brandId");

-- CreateIndex
CREATE INDEX "SocialChannel_companyId_brandId_idx" ON "SocialChannel"("companyId", "brandId");

-- CreateIndex
CREATE INDEX "SocialChannel_companyId_platform_idx" ON "SocialChannel"("companyId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "SocialChannel_companyId_platform_handle_key" ON "SocialChannel"("companyId", "platform", "handle");

-- CreateIndex
CREATE INDEX "Brand_companyId_createdAt_idx" ON "Brand"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Brand_companyId_isActive_idx" ON "Brand"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_companyId_handle_key" ON "Brand"("companyId", "handle");

-- CreateIndex
CREATE INDEX "RssGroup_companyId_idx" ON "RssGroup"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "RssGroup_companyId_name_key" ON "RssGroup"("companyId", "name");

-- CreateIndex
CREATE INDEX "VideoPublish_channelId_status_idx" ON "VideoPublish"("channelId", "status");

-- CreateIndex
CREATE INDEX "VideoPublish_videoId_idx" ON "VideoPublish"("videoId");

-- CreateIndex
CREATE INDEX "VideoPublish_status_publishedAt_idx" ON "VideoPublish"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "VideoPublish_status_createdAt_idx" ON "VideoPublish"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Schedule_companyId_isActive_idx" ON "Schedule"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "Schedule_brandId_idx" ON "Schedule"("brandId");

-- CreateIndex
CREATE INDEX "ScheduleRun_scheduleId_createdAt_idx" ON "ScheduleRun"("scheduleId", "createdAt");

-- CreateIndex
CREATE INDEX "ScheduleRun_scheduleId_startedAt_idx" ON "ScheduleRun"("scheduleId", "startedAt");

-- CreateIndex
CREATE INDEX "StockAsset_query_type_createdAt_idx" ON "StockAsset"("query", "type", "createdAt");

-- CreateIndex
CREATE INDEX "StockAsset_type_createdAt_idx" ON "StockAsset"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockAsset_provider_externalId_key" ON "StockAsset"("provider", "externalId");

-- CreateIndex
CREATE INDEX "BackgroundMusic_mood_idx" ON "BackgroundMusic"("mood");

-- CreateIndex
CREATE INDEX "Notification_companyId_isRead_createdAt_idx" ON "Notification"("companyId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_companyId_createdAt_idx" ON "Notification"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_companyId_type_createdAt_idx" ON "Notification"("companyId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_companyId_status_idx" ON "GenerationJob"("companyId", "status");

-- CreateIndex
CREATE INDEX "GenerationJob_status_createdAt_idx" ON "GenerationJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_status_type_createdAt_idx" ON "GenerationJob"("status", "type", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_studioType_status_idx" ON "GenerationJob"("studioType", "status");

-- CreateIndex
CREATE INDEX "GenerationJob_storyId_idx" ON "GenerationJob"("storyId");

-- CreateIndex
CREATE INDEX "GenerationJob_storyId_status_idx" ON "GenerationJob"("storyId", "status");

-- CreateIndex
CREATE INDEX "GenerationJob_companyId_createdAt_idx" ON "GenerationJob"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_companyId_status_createdAt_idx" ON "GenerationJob"("companyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_companyId_status_completedAt_idx" ON "GenerationJob"("companyId", "status", "completedAt");

-- CreateIndex
CREATE INDEX "GenerationJob_companyId_type_status_idx" ON "GenerationJob"("companyId", "type", "status");

-- CreateIndex
CREATE INDEX "JobLog_jobId_createdAt_idx" ON "JobLog"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "PersonaImagePair_personaId_idx" ON "PersonaImagePair"("personaId");

-- CreateIndex
CREATE INDEX "Worker_status_lastSeenAt_idx" ON "Worker"("status", "lastSeenAt");

-- CreateIndex
CREATE INDEX "Worker_lastSeenAt_idx" ON "Worker"("lastSeenAt");

-- CreateIndex
CREATE INDEX "AiTokenUsage_companyId_createdAt_idx" ON "AiTokenUsage"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AiTokenUsage_provider_createdAt_idx" ON "AiTokenUsage"("provider", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccessRequest_userId_key" ON "AccessRequest"("userId");

-- CreateIndex
CREATE INDEX "VisualPreset_category_subCategory_name_idx" ON "VisualPreset"("category", "subCategory", "name");

-- CreateIndex
CREATE INDEX "VisualPreset_category_subCategory_idx" ON "VisualPreset"("category", "subCategory");

-- CreateIndex
CREATE INDEX "VisualPreset_category_subCategory_subSubCategory_idx" ON "VisualPreset"("category", "subCategory", "subSubCategory");

-- CreateIndex
CREATE INDEX "VisualPreset_isStudioApproved_idx" ON "VisualPreset"("isStudioApproved");

-- CreateIndex
CREATE INDEX "VisualPreset_isFullAttire_idx" ON "VisualPreset"("isFullAttire");

-- CreateIndex
CREATE INDEX "VisualPreset_categoryPath_idx" ON "VisualPreset"("categoryPath");

-- CreateIndex
CREATE INDEX "Storefront_companyId_idx" ON "Storefront"("companyId");

-- CreateIndex
CREATE INDEX "Storefront_companyId_createdAt_idx" ON "Storefront"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Storefront_companyId_url_key" ON "Storefront"("companyId", "url");

-- CreateIndex
CREATE INDEX "ProductCampaign_companyId_status_idx" ON "ProductCampaign"("companyId", "status");

-- CreateIndex
CREATE INDEX "ProductCampaign_companyId_typology_idx" ON "ProductCampaign"("companyId", "typology");

-- CreateIndex
CREATE INDEX "ProductCampaign_companyId_typology_createdAt_idx" ON "ProductCampaign"("companyId", "typology", "createdAt");

-- CreateIndex
CREATE INDEX "ProductCampaign_storefrontId_idx" ON "ProductCampaign"("storefrontId");

-- CreateIndex
CREATE INDEX "ProductCampaign_brandId_idx" ON "ProductCampaign"("brandId");

-- CreateIndex
CREATE INDEX "ProductCampaign_companyId_brandId_idx" ON "ProductCampaign"("companyId", "brandId");

-- CreateIndex
CREATE INDEX "ProductCampaign_companyId_createdAt_idx" ON "ProductCampaign"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductCampaign_companyId_price_idx" ON "ProductCampaign"("companyId", "price");

-- CreateIndex
CREATE INDEX "ProductCampaign_companyId_storefrontId_createdAt_idx" ON "ProductCampaign"("companyId", "storefrontId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCampaign_companyId_sourceUrl_key" ON "ProductCampaign"("companyId", "sourceUrl");

-- CreateIndex
CREATE INDEX "ProductAsset_campaignId_assetType_idx" ON "ProductAsset"("campaignId", "assetType");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAsset_campaignId_rawUrl_key" ON "ProductAsset"("campaignId", "rawUrl");

-- CreateIndex
CREATE INDEX "AdVariation_campaignId_status_idx" ON "AdVariation"("campaignId", "status");

-- CreateIndex
CREATE INDEX "AdVariation_campaignId_archetype_idx" ON "AdVariation"("campaignId", "archetype");

-- CreateIndex
CREATE INDEX "AdVariation_campaignId_createdAt_idx" ON "AdVariation"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "Product3DAsset_companyId_status_idx" ON "Product3DAsset"("companyId", "status");

-- CreateIndex
CREATE INDEX "Product3DAsset_campaignId_idx" ON "Product3DAsset"("campaignId");

-- CreateIndex
CREATE INDEX "Product3DAsset_generationJobId_idx" ON "Product3DAsset"("generationJobId");

-- CreateIndex
CREATE INDEX "SystemSetting_key_idx" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSetting_companyId_idx" ON "SystemSetting"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_companyId_key_key" ON "SystemSetting"("companyId", "key");

-- CreateIndex
CREATE INDEX "_RssFeedToRssGroup_B_index" ON "_RssFeedToRssGroup"("B");

-- CreateIndex
CREATE INDEX "_BrandToRssGroup_B_index" ON "_BrandToRssGroup"("B");

-- CreateIndex
CREATE INDEX "_BrandToPersona_B_index" ON "_BrandToPersona"("B");

-- AddForeignKey
ALTER TABLE "TenantReservation" ADD CONSTRAINT "TenantReservation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RssFeed" ADD CONSTRAINT "RssFeed_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "RssFeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_bgMusicId_fkey" FOREIGN KEY ("bgMusicId") REFERENCES "BackgroundMusic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaMasterImage" ADD CONSTRAINT "PersonaMasterImage_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaActionLoop" ADD CONSTRAINT "PersonaActionLoop_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaActionLoop" ADD CONSTRAINT "PersonaActionLoop_masterImageId_fkey" FOREIGN KEY ("masterImageId") REFERENCES "PersonaMasterImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaAvatar" ADD CONSTRAINT "PersonaAvatar_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaAvatar" ADD CONSTRAINT "PersonaAvatar_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaVoice" ADD CONSTRAINT "PersonaVoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaVoice" ADD CONSTRAINT "PersonaVoice_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialChannel" ADD CONSTRAINT "SocialChannel_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialChannel" ADD CONSTRAINT "SocialChannel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RssGroup" ADD CONSTRAINT "RssGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoPublish" ADD CONSTRAINT "VideoPublish_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoPublish" ADD CONSTRAINT "VideoPublish_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "SocialChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRun" ADD CONSTRAINT "ScheduleRun_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobLog" ADD CONSTRAINT "JobLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaImagePair" ADD CONSTRAINT "PersonaImagePair_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTokenUsage" ADD CONSTRAINT "AiTokenUsage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Storefront" ADD CONSTRAINT "Storefront_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCampaign" ADD CONSTRAINT "ProductCampaign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCampaign" ADD CONSTRAINT "ProductCampaign_storefrontId_fkey" FOREIGN KEY ("storefrontId") REFERENCES "Storefront"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCampaign" ADD CONSTRAINT "ProductCampaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAsset" ADD CONSTRAINT "ProductAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ProductCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdVariation" ADD CONSTRAINT "AdVariation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ProductCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product3DAsset" ADD CONSTRAINT "Product3DAsset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product3DAsset" ADD CONSTRAINT "Product3DAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ProductCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RssFeedToRssGroup" ADD CONSTRAINT "_RssFeedToRssGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "RssFeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RssFeedToRssGroup" ADD CONSTRAINT "_RssFeedToRssGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "RssGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BrandToRssGroup" ADD CONSTRAINT "_BrandToRssGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BrandToRssGroup" ADD CONSTRAINT "_BrandToRssGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "RssGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BrandToPersona" ADD CONSTRAINT "_BrandToPersona_A_fkey" FOREIGN KEY ("A") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BrandToPersona" ADD CONSTRAINT "_BrandToPersona_B_fkey" FOREIGN KEY ("B") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;
