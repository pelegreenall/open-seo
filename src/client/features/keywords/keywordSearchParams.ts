import type { SortDir, SortField } from "@/client/features/keywords/components";
import type {
  KeywordMode,
  ResultLimit,
} from "@/client/features/keywords/keywordResearchTypes";

type KeywordSearchParams = {
  q?: string;
  loc?: number;
  kLimit?: number;
  mode?: KeywordMode;
  sort?: SortField;
  order?: SortDir;
  minVol?: string;
  maxVol?: string;
  minCpc?: string;
  maxCpc?: string;
  minKd?: string;
  maxKd?: string;
  include?: string;
  exclude?: string;
};

export function normalizeLegacyKeywordSearch(search: KeywordSearchParams): {
  normalized: KeywordSearchParams;
  changed: boolean;
} {
  const s = search as any;
  const normalized: KeywordSearchParams = {
    ...search,
    q: search.q === "" ? undefined : search.q,
    loc: search.loc,
    kLimit: s.kLimit === 150 ? undefined : s.kLimit,
    mode: search.mode === "auto" ? undefined : search.mode,
    sort: search.sort === "searchVolume" ? undefined : search.sort,
    order: search.order === "desc" ? undefined : search.order,
    minVol: undefined,
    maxVol: undefined,
    minCpc: undefined,
    maxCpc: undefined,
    minKd: undefined,
    maxKd: undefined,
    include: undefined,
    exclude: undefined,
  };

  const keys: Array<keyof KeywordSearchParams> = [
    "q",
    "loc",
    "kLimit",
    "mode",
    "sort",
    "order",
    "minVol",
    "maxVol",
    "minCpc",
    "maxCpc",
    "minKd",
    "maxKd",
    "include",
    "exclude",
  ];

  return {
    normalized,
    changed: keys.some((key) => search[key] !== normalized[key]),
  };
}

export function isResultLimit(value: number): value is ResultLimit {
  return [10, 50, 100, 150, 300, 500, 700, 1000].includes(value);
}

export function normalizeKeywordMode(value: string): KeywordMode {
  if (value === "auto") return "auto";
  if (value === "related") return "related";
  if (value === "suggestions") return "suggestions";
  if (value === "ideas") return "ideas";
  return "auto";
}

export function normalizeSortField(value: string): SortField {
  if (value === "keyword") return "keyword";
  if (value === "searchVolume") return "searchVolume";
  if (value === "cpc") return "cpc";
  if (value === "competition") return "competition";
  if (value === "keywordDifficulty") return "keywordDifficulty";
  return "searchVolume";
}

export function normalizeSortDir(value: string): SortDir {
  return value === "asc" ? "asc" : "desc";
}
