import { z } from "zod";

export const keywordIntentSchema = z.enum([
  "informational",
  "commercial",
  "transactional",
  "navigational",
  "unknown",
]);

export type KeywordIntent = z.infer<typeof keywordIntentSchema>;

export const clusterKeywordItemSchema = z.object({
  keyword: z.string(),
  searchVolume: z.number().int().nonnegative().nullable(),
  cpc: z.number().nonnegative().nullable(),
  keywordDifficulty: z.number().int().min(0).max(100).nullable(),
  intent: keywordIntentSchema,
});

export type ClusterKeywordItem = z.infer<typeof clusterKeywordItemSchema>;

export const subtopicClusterSchema = z.object({
  name: z.string(),
  primaryKeyword: z.string(),
  keywords: z.array(clusterKeywordItemSchema),
  totalVolume: z.number().int().nonnegative(),
  avgKd: z.number().int().min(0).max(100),
  intentDistribution: z.object({
    informational: z.number().min(0).max(100),
    commercial: z.number().min(0).max(100),
    transactional: z.number().min(0).max(100),
    navigational: z.number().min(0).max(100),
  }),
});

export type SubtopicCluster = z.infer<typeof subtopicClusterSchema>;

export const pillarClusterSchema = z.object({
  name: z.string(),
  primaryKeyword: z.string(),
  subtopics: z.array(subtopicClusterSchema),
  totalVolume: z.number().int().nonnegative(),
  avgKd: z.number().int().min(0).max(100),
  intentDistribution: z.object({
    informational: z.number().min(0).max(100),
    commercial: z.number().min(0).max(100),
    transactional: z.number().min(0).max(100),
    navigational: z.number().min(0).max(100),
  }),
});

export type PillarCluster = z.infer<typeof pillarClusterSchema>;

export const clusterKeywordsInputSchema = z.object({
  projectId: z.string().min(1),
  seedKeyword: z.string().min(1),
  locationCode: z.number().int().positive().optional().default(2840),
  languageCode: z.string().min(2).max(8).optional().default("en"),
  keywords: z.array(clusterKeywordItemSchema).optional(),
});

export type ClusterKeywordsInput = z.infer<typeof clusterKeywordsInputSchema>;

export const clusterKeywordsOutputSchema = z.object({
  pillars: z.array(pillarClusterSchema),
  totalVolume: z.number().int().nonnegative(),
  totalKeywords: z.number().int().nonnegative(),
});

export type ClusterKeywordsOutput = z.infer<typeof clusterKeywordsOutputSchema>;

