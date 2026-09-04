import {
  deleteSavedKeywordTag,
  getSavedKeywords,
  getSerpAnalysis,
  removeSavedKeywords,
  research,
  saveKeywords,
  exportSavedKeywords,
  updateSavedKeywordTag,
  updateSavedKeywordTags,
  clusterKeywords,
  refreshSavedKeywordMetrics,
} from "@/server/features/keywords/services/research";

export const KeywordResearchService = {
  research,
  getSerpAnalysis,
  saveKeywords,
  getSavedKeywords,
  exportSavedKeywords,
  updateSavedKeywordTags,
  updateSavedKeywordTag,
  deleteSavedKeywordTag,
  removeSavedKeywords,
  clusterKeywords,
  refreshSavedKeywordMetrics,
} as const;
