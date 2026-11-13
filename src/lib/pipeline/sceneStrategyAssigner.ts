
export type SceneStrategy = "full" | "bubble" | "article_image" | "stock";

export interface StrategyAssignment {
  strategy: SceneStrategy;
  echoImagePairId?: string;
}

export interface PipelineSegmentCandidate {
  id: string;
  sceneMode?: string;
  [key: string]: unknown;
}

export interface PipelineConfigCandidate {
  sceneStrategy?: {
    fullScenes?: number[];
    articleImageScenes?: number[];
    bubbleScenes?: number[] | string;
  };
  [key: string]: unknown;
}

export interface PipelineStoryCandidate {
  articleImageUrls?: unknown[] | string | null;
  [key: string]: unknown;
}

export function assignSceneStrategies(
  segments: PipelineSegmentCandidate[],
  config?: PipelineConfigCandidate | null,
  story?: PipelineStoryCandidate | null
): Record<string, StrategyAssignment> {
  const assignments: Record<string, StrategyAssignment> = {};

  // Check global override mode
  const isBrollOnly = segments.length > 0 && segments[0].sceneMode === "broll_only";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (isBrollOnly) {
      assignments[segment.id] = { strategy: "stock" };
      continue;
    }

    // Index-based assignments based on PIPELINE.md rules
    // Scene 0: EchoMimic (full)
    // Scene 1: Article Image (if exists), else SadTalker (bubble)
    // Scene 2+: SadTalker (bubble)

    if (i === 0) {
      assignments[segment.id] = { strategy: "full" };
    } else if (i === 1) {
      // Check if story has article images (we assume story.articleImageUrls exists if it's parsed from RSS)
      const hasArticleImage = story?.articleImageUrls && Array.isArray(story.articleImageUrls) && story.articleImageUrls.length > 0;
      if (hasArticleImage) {
        assignments[segment.id] = { strategy: "article_image" };
      } else {
        assignments[segment.id] = { strategy: "bubble" };
      }
    } else {
      assignments[segment.id] = { strategy: "bubble" };
    }
  }

  // Handle overrides from config if present
  if (config?.sceneStrategy) {
    const { fullScenes, articleImageScenes, bubbleScenes } = config.sceneStrategy;
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (fullScenes?.includes(i)) {
        assignments[segment.id] = { strategy: "full" };
      } else if (articleImageScenes?.includes(i)) {
        assignments[segment.id] = { strategy: "article_image" };
      } else if (bubbleScenes === "rest" && !fullScenes?.includes(i) && !articleImageScenes?.includes(i)) {
         assignments[segment.id] = { strategy: "bubble" };
      }
    }
  }

  return assignments;
}
