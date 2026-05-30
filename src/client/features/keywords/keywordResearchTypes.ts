export const MAX_KEYWORDS_PER_SUBMIT = 5;

export type ResultLimit = 10 | 50 | 100 | 150 | 300 | 500 | 700 | 1000;
export const RESULT_LIMITS: ResultLimit[] = [10, 50, 100, 150, 300, 500, 700, 1000];

export type KeywordSource = "related" | "suggestions" | "ideas";
export type KeywordMode = "auto" | KeywordSource;
