import { research } from "./research";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import type {
  ClusterKeywordsInput,
  ClusterKeywordsOutput,
  PillarCluster,
  SubtopicCluster,
  ClusterKeywordItem,
} from "@/types/schemas/keywordClustering";
import { fetchLlmResponse } from "@/server/lib/dataforseo/ai";

function getWords(kw: string): string[] {
  const STOP_WORDS = new Set([
    "and", "or", "in", "for", "with", "the", "a", "of", "to", "best", "free", 
    "how", "what", "why", "on", "is", "at", "by", "an", "i", "you", "we", "they", "it"
  ]);
  return kw.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function getSimilarity(words1: string[], words2: string[]): number {
  if (words1.length === 0 || words2.length === 0) return 0;
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  let intersection = 0;
  for (const w of set1) {
    if (set2.has(w)) intersection++;
  }
  const union = new Set([...words1, ...words2]).size;
  return intersection / union;
}

function capitalizePhrase(phrase: string): string {
  return phrase
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Calculates aggregate stats for a list of keyword items.
 */
function calculateStats(keywords: ClusterKeywordItem[]) {
  const totalVolume = keywords.reduce((sum, k) => sum + (k.searchVolume ?? 0), 0);
  const validKdKeywords = keywords.filter((k) => k.keywordDifficulty !== null);
  const avgKd = validKdKeywords.length > 0
    ? Math.round(validKdKeywords.reduce((sum, k) => sum + (k.keywordDifficulty ?? 0), 0) / validKdKeywords.length)
    : 0;

  let infoCount = 0;
  let commCount = 0;
  let transCount = 0;
  let navCount = 0;
  for (const k of keywords) {
    if (k.intent === "informational") infoCount++;
    else if (k.intent === "commercial") commCount++;
    else if (k.intent === "transactional") transCount++;
    else if (k.intent === "navigational") navCount++;
  }
  const totalKws = keywords.length || 1;
  const intentDistribution = {
    informational: Math.round((infoCount / totalKws) * 100),
    commercial: Math.round((commCount / totalKws) * 100),
    transactional: Math.round((transCount / totalKws) * 100),
    navigational: Math.round((navCount / totalKws) * 100),
  };

  return { totalVolume, avgKd, intentDistribution };
}

export async function clusterKeywords(
  input: ClusterKeywordsInput,
  billingCustomer: BillingCustomerContext
): Promise<ClusterKeywordsOutput> {
  let sourceKeywords: ClusterKeywordItem[] = [];

  if (input.keywords && input.keywords.length > 0) {
    sourceKeywords = input.keywords;
  } else {
    // Fetch up to 150 keywords to give a highly detailed strategy map!
    const researchResult = await research(
      {
        projectId: input.projectId,
        keywords: [input.seedKeyword],
        locationCode: input.locationCode,
        languageCode: input.languageCode,
        resultLimit: 150,
        mode: "auto",
        clickstream: false,
      },
      billingCustomer
    );

    sourceKeywords = researchResult.rows.map((row) => ({
      keyword: row.keyword,
      searchVolume: row.searchVolume,
      cpc: row.cpc,
      keywordDifficulty: row.keywordDifficulty,
      intent: row.intent,
    }));
  }

  if (sourceKeywords.length === 0) {
    return {
      pillars: [],
      totalVolume: 0,
      totalKeywords: 0,
    };
  }

  // PRE-PASS 1: Group keywords into tight page-level clusters (Subtopics)
  // High similarity threshold = 0.35
  const SUBTOPIC_THRESHOLD = 0.35;
  const keywordWords = sourceKeywords.map((k) => ({
    item: k,
    words: getWords(k.keyword),
  }));

  let subtopicGroups: Array<{
    keywords: typeof keywordWords;
  }> = keywordWords.map((kw) => ({
    keywords: [kw],
  }));

  let merged = true;
  while (merged && subtopicGroups.length > 1) {
    merged = false;
    let maxSim = -1;
    let mergeIdxA = -1;
    let mergeIdxB = -1;

    for (let i = 0; i < subtopicGroups.length; i++) {
      for (let j = i + 1; j < subtopicGroups.length; j++) {
        let bestSim = 0;
        for (const kwA of subtopicGroups[i].keywords) {
          for (const kwB of subtopicGroups[j].keywords) {
            const sim = getSimilarity(kwA.words, kwB.words);
            if (sim > bestSim) {
              bestSim = sim;
            }
          }
        }

        if (bestSim > maxSim && bestSim >= SUBTOPIC_THRESHOLD) {
          maxSim = bestSim;
          mergeIdxA = i;
          mergeIdxB = j;
        }
      }
    }

    if (mergeIdxA !== -1 && mergeIdxB !== -1) {
      subtopicGroups[mergeIdxA].keywords.push(...subtopicGroups[mergeIdxB].keywords);
      subtopicGroups.splice(mergeIdxB, 1);
      merged = true;
    }
  }

  // Create Subtopic objects
  const subtopics: SubtopicCluster[] = subtopicGroups.map((group) => {
    const rawKeywords = group.keywords.map((k) => k.item);
    rawKeywords.sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0));
    const primary = rawKeywords[0];
    const stats = calculateStats(rawKeywords);

    return {
      name: capitalizePhrase(primary.keyword),
      primaryKeyword: primary.keyword,
      keywords: rawKeywords,
      ...stats,
    };
  });

  // PRE-PASS 2: Group Subtopics into broader parent categories (Pillars)
  // Low similarity threshold = 0.12 based on their primary keywords
  const PILLAR_THRESHOLD = 0.12;
  const subtopicPrimaryWords = subtopics.map((sub, idx) => ({
    subtopic: sub,
    words: getWords(sub.primaryKeyword),
    index: idx,
  }));

  let pillarGroups: Array<{
    subs: typeof subtopicPrimaryWords;
  }> = subtopicPrimaryWords.map((item) => ({
    subs: [item],
  }));

  merged = true;
  while (merged && pillarGroups.length > 1) {
    merged = false;
    let maxSim = -1;
    let mergeIdxA = -1;
    let mergeIdxB = -1;

    for (let i = 0; i < pillarGroups.length; i++) {
      for (let j = i + 1; j < pillarGroups.length; j++) {
        let bestSim = 0;
        for (const subA of pillarGroups[i].subs) {
          for (const subB of pillarGroups[j].subs) {
            const sim = getSimilarity(subA.words, subB.words);
            if (sim > bestSim) {
              bestSim = sim;
            }
          }
        }

        if (bestSim > maxSim && bestSim >= PILLAR_THRESHOLD) {
          maxSim = bestSim;
          mergeIdxA = i;
          mergeIdxB = j;
        }
      }
    }

    if (mergeIdxA !== -1 && mergeIdxB !== -1) {
      pillarGroups[mergeIdxA].subs.push(...pillarGroups[mergeIdxB].subs);
      pillarGroups.splice(mergeIdxB, 1);
      merged = true;
    }
  }

  // Assemble initial Pillar structures
  const pillars: PillarCluster[] = pillarGroups.map((group) => {
    const groupSubs = group.subs.map((s) => s.subtopic);
    // Sort subtopics by volume descending
    groupSubs.sort((a, b) => b.totalVolume - a.totalVolume);
    const primarySub = groupSubs[0];

    const allPillarKeywords = groupSubs.flatMap((sub) => sub.keywords);
    const stats = calculateStats(allPillarKeywords);

    return {
      name: capitalizePhrase(primarySub.primaryKeyword),
      primaryKeyword: primarySub.primaryKeyword,
      subtopics: groupSubs,
      ...stats,
    };
  });

  // Sort pillars: highest total volume first
  pillars.sort((a, b) => b.totalVolume - a.totalVolume);

  // LLM Naming step: Send the list of primary keywords of pillars and their subtopics
  // Keep the user prompt under 500 characters strictly!
  try {
    const listForPrompt = pillars.slice(0, 10).map((p, idx) => {
      const subList = p.subtopics.slice(0, 3).map((s) => s.primaryKeyword).join(", ");
      return `${idx + 1}:${p.primaryKeyword}(${subList})`;
    }).join(";");

    // "Given this list of keyword groups: 1:email marketing(best email tool);... Output a JSON array of named categories in order, e.g. ["Email Strategy"]. No markdown, no text."
    // Let's compute length and optimize:
    const basePrompt = `Group names JSON list ONLY for: ${listForPrompt}`;
    const finalPrompt = basePrompt.slice(0, 480); // Strict safety cut-off

    const response = await fetchLlmResponse({
      userPrompt: finalPrompt,
      modelSlug: "gemini",
      modelName: "gemini-2.5-pro",
      webSearch: false,
      maxOutputTokens: 256,
    });

    // response.data contains the parsed LlmResponseResult which has .items array
    const items = response.data.items || [];
    const firstSection = items[0]?.sections?.[0];
    const text = firstSection?.text || "";
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const names = JSON.parse(cleanText);

    if (Array.isArray(names)) {
      for (let i = 0; i < Math.min(names.length, pillars.length); i++) {
        if (typeof names[i] === "string" && names[i].length > 2 && names[i].length < 40) {
          pillars[i].name = capitalizePhrase(names[i]);
        }
      }
    }
  } catch (err) {
    console.warn("Gemini LLM Naming failed, falling back to capitalized primary keyword:", err);
  }

  const totalVolume = pillars.reduce((sum, p) => sum + p.totalVolume, 0);
  const totalKeywords = sourceKeywords.length;

  return {
    pillars,
    totalVolume,
    totalKeywords,
  };
}

