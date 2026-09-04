import { clusterKeywords } from "./server/features/keywords/services/research/keywordClustering";

async function main() {
  const mockBillingContext = {
    userId: "user_1",
    userEmail: "user@example.com",
    organizationId: "org_1",
  } as any;

  try {
    console.log("Running clusterKeywords...");
    const result = await clusterKeywords(
      {
        projectId: "proj_1",
        seedKeyword: "email marketing",
        locationCode: 2840,
        languageCode: "en",
      },
      mockBillingContext
    );
    console.log("Success! Pillars count:", result.pillars.length);
  } catch (error: any) {
    console.error("Clustering failed with error:", error);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

main();
