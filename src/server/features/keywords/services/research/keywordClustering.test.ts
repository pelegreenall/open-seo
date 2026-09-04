import { describe, expect, it, vi, beforeEach } from "vitest";
import { clusterKeywords } from "./keywordClustering";

const mockResearch = vi.fn();
const mockFetchLlmResponseRaw = vi.fn();

vi.mock("./research", () => ({
  research: (...args: any[]) => mockResearch(...args),
}));

vi.mock("@/server/lib/dataforseoLlm", () => ({
  fetchLlmResponseRaw: (...args: any[]) => mockFetchLlmResponseRaw(...args),
}));

const mockBillingContext = {
  userId: "user_1",
  userEmail: "user@example.com",
  organizationId: "org_1",
} as any;

describe("keywordClustering service - two-level pure JS algorithm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchLlmResponseRaw.mockResolvedValue({
      data: {
        items: [
          {
            sections: [
              {
                text: '["Email Solutions", "SEO Strategy"]',
              },
            ],
          },
        ],
      },
    });
  });

  it("successfully clusters input keywords hierarchically into pillars and subtopics", async () => {
    const mockKeywords = [
      {
        keyword: "email marketing",
        searchVolume: 10000,
        cpc: 2.5,
        keywordDifficulty: 70,
        intent: "commercial" as const,
      },
      {
        keyword: "free email marketing",
        searchVolume: 2000,
        cpc: 0.5,
        keywordDifficulty: 40,
        intent: "informational" as const,
      },
      {
        keyword: "seo tips",
        searchVolume: 500,
        cpc: 1.0,
        keywordDifficulty: 30,
        intent: "informational" as const,
      },
    ];

    const result = await clusterKeywords(
      {
        projectId: "proj_1",
        seedKeyword: "email marketing",
        locationCode: 2840,
        languageCode: "en",
        keywords: mockKeywords,
      },
      mockBillingContext
    );

    // "email marketing" and "free email marketing" should cluster together under one subtopic, and then under one pillar.
    // "seo tips" forms a second pillar with its own subtopic and keyword.
    expect(result.pillars).toHaveLength(2);
    
    // First pillar should be the one named by LLM mock: "Email Solutions"
    expect(result.pillars[0]).toMatchObject({
      name: "Email Solutions",
      primaryKeyword: "email marketing",
      totalVolume: 12000,
      avgKd: 55, // (70+40)/2
    });
    expect(result.pillars[0].subtopics).toHaveLength(1);
    expect(result.pillars[0].subtopics[0].keywords).toHaveLength(2);

    // Second pillar should be "SEO Strategy"
    expect(result.pillars[1]).toMatchObject({
      name: "SEO Strategy",
      primaryKeyword: "seo tips",
      totalVolume: 500,
      avgKd: 30,
    });
    expect(result.pillars[1].subtopics).toHaveLength(1);
  });

  it("falls back to calling research when no keywords are provided", async () => {
    mockResearch.mockResolvedValue({
      rows: [
        {
          keyword: "email marketing tools",
          searchVolume: 1500,
          cpc: 3.0,
          keywordDifficulty: 65,
          intent: "commercial",
        },
      ],
    });

    const result = await clusterKeywords(
      {
        projectId: "proj_1",
        seedKeyword: "email marketing",
        locationCode: 2840,
        languageCode: "en",
      },
      mockBillingContext
    );

    expect(mockResearch).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj_1",
        keywords: ["email marketing"],
        resultLimit: 150,
      }),
      mockBillingContext
    );
    expect(result.pillars).toHaveLength(1);
    expect(result.pillars[0].name).toBe("Email Solutions");
    expect(result.totalKeywords).toBe(1);
  });
});

