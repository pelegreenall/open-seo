import { useState } from "react";
import { toast } from "sonner";
import { clusterKeywords, saveKeywords } from "@/serverFunctions/keywords";
import { StrategyEmptyState } from "../components/StrategyEmptyState";
import { StrategyMindMap } from "../components/StrategyMindMap";
import { StrategyClusterTable } from "../components/StrategyClusterTable";
import type { PillarCluster } from "@/types/schemas/keywordClustering";
import { Sparkles, ArrowLeft, Bookmark } from "lucide-react";

type Props = {
  projectId: string;
};

export function StrategyPage({ projectId }: Props) {
  const [seedKeyword, setSeedKeyword] = useState<string | null>(null);
  const [locationCode, setLocationCode] = useState(2840);
  const [pillars, setPillars] = useState<PillarCluster[]>([]);
  const [selectedClusterName, setSelectedClusterName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerateStrategy = async (seed: string, locCode: number) => {
    setIsLoading(true);
    setSeedKeyword(seed);
    setLocationCode(locCode);
    try {
      const response = await clusterKeywords({
        data: {
          projectId,
          seedKeyword: seed,
          locationCode: locCode,
        },
      });

      setPillars(response.pillars);
      toast.success("Topical Strategy Map generated successfully!");
    } catch (error: any) {
      console.error("Clustering generation failed:", error);
      toast.error(error.message || "Could not generate strategy map.");
      setSeedKeyword(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveKeywords = async (keywordsToSave: string[]) => {
    setIsSaving(true);
    try {
      await saveKeywords({
        data: {
          projectId,
          keywords: keywordsToSave,
          locationCode,
          tagMode: "append",
          tags: [`strategy:${seedKeyword}`],
        },
      });
      toast.success(`Successfully saved ${keywordsToSave.length} keyword(s) to Saved Keywords!`);
    } catch (error: any) {
      console.error("Failed to save keywords:", error);
      toast.error(error.message || "Failed to save keywords.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSeedKeyword(null);
    setPillars([]);
    setSelectedClusterName(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-6 px-4 py-32">
        <span className="loading loading-spinner loading-lg text-primary" />
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-xl font-bold text-base-content">Analyzing Search Intent & Topical Depth</h2>
          <p className="text-sm text-base-content/60">
            Evaluating keywords around <span className="font-semibold text-primary">"{seedKeyword}"</span> and clustering them into Pillar-and-Spoke authority structures...
          </p>
        </div>
      </div>
    );
  }

  if (!seedKeyword || pillars.length === 0) {
    return (
      <StrategyEmptyState
        onSubmit={handleGenerateStrategy}
        isLoading={isLoading}
      />
    );
  }

  const allKeywordTexts = pillars.flatMap((p) =>
    p.subtopics.flatMap((s) => s.keywords.map((k) => k.keyword))
  );

  return (
    <div className="h-full overflow-auto px-6 py-6 pb-24 md:pb-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-base-content"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-base-content sm:text-3xl">
                  Strategy: {seedKeyword}
                </h1>
                <Sparkles className="size-5 text-primary animate-pulse" />
              </div>
              <p className="text-sm text-base-content/65 mt-0.5">
                Topical mapping and authority strategy hub
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleSaveKeywords(allKeywordTexts)}
              className="btn btn-primary gap-2 font-semibold"
              disabled={isSaving || allKeywordTexts.length === 0}
            >
              {isSaving ? (
                <span className="loading loading-spinner size-4" />
              ) : (
                <Bookmark className="size-4" />
              )}
              Save All Keywords
            </button>
            <button onClick={handleReset} className="btn btn-outline">
              New Strategy
            </button>
          </div>
        </div>

        {/* Mind Map */}
        <StrategyMindMap
          seedKeyword={seedKeyword}
          pillars={pillars}
          selectedClusterName={selectedClusterName}
          onSelectCluster={setSelectedClusterName}
        />

        {/* Strategy Table */}
        <StrategyClusterTable
          pillars={pillars}
          selectedClusterName={selectedClusterName}
          onSelectCluster={setSelectedClusterName}
          onSaveKeywords={handleSaveKeywords}
        />
      </div>
    </div>
  );
}

