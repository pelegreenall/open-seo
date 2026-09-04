import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Bookmark, Sparkles, Folder, FileText } from "lucide-react";
import type { PillarCluster, SubtopicCluster, ClusterKeywordItem } from "@/types/schemas/keywordClustering";
import { formatNumber } from "@/client/features/keywords/utils";

type Props = {
  pillars: PillarCluster[];
  selectedClusterName: string | null;
  onSelectCluster: (name: string | null) => void;
  onSaveKeywords?: (keywords: string[]) => void;
};

export function StrategyClusterTable({
  pillars,
  selectedClusterName,
  onSelectCluster,
  onSaveKeywords,
}: Props) {
  const [expandedPillars, setExpandedPillars] = useState<Record<string, boolean>>({});
  const [expandedSubtopics, setExpandedSubtopics] = useState<Record<string, boolean>>({});
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Expand and scroll to row if selected from Mind Map
  useEffect(() => {
    if (selectedClusterName) {
      setExpandedPillars((prev) => ({ ...prev, [selectedClusterName]: true }));
      rowRefs.current[selectedClusterName]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectedClusterName]);

  const togglePillar = (name: string) => {
    setExpandedPillars((prev) => ({ ...prev, [name]: !prev[name] }));
    onSelectCluster(selectedClusterName === name ? null : name);
  };

  const toggleSubtopic = (name: string) => {
    setExpandedSubtopics((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case "informational":
        return "badge-info";
      case "commercial":
        return "badge-success";
      case "transactional":
        return "badge-secondary";
      case "navigational":
        return "badge-warning";
      default:
        return "badge-ghost";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Topical Pillars & Subtopics ({pillars.length})</h2>
      </div>

      <div className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-md">
        {/* Table Headers */}
        <div className="grid grid-cols-12 border-b border-base-200 bg-base-50/50 px-6 py-4 text-xs font-bold uppercase tracking-wider text-base-content/65">
          <div className="col-span-5">Pillar Category / Subtopic</div>
          <div className="col-span-2 text-right">Subtopics / Kws</div>
          <div className="col-span-2 text-right">Total Volume</div>
          <div className="col-span-1 text-center">Avg KD</div>
          <div className="col-span-2 text-center">Intent Profile</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-base-200">
          {pillars.map((pillar) => {
            const isPillarExpanded = !!expandedPillars[pillar.name];
            const isSelected = selectedClusterName === pillar.name;
            const dist = pillar.intentDistribution;
            const totalKeywordsCount = pillar.subtopics.reduce((acc, s) => acc + s.keywords.length, 0);

            return (
              <div
                key={pillar.name}
                ref={(el) => {
                  rowRefs.current[pillar.name] = el;
                }}
                className={`transition-colors ${
                  isSelected ? "bg-primary/5" : "hover:bg-base-50/30"
                }`}
              >
                {/* Level 1: Pillar Row Summary */}
                <div
                  className="grid grid-cols-12 items-center px-6 py-4 cursor-pointer text-sm font-medium"
                  onClick={() => togglePillar(pillar.name)}
                >
                  {/* Name and Folder Icon */}
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="text-base-content/60 shrink-0">
                      {isPillarExpanded ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Folder className="size-4 text-primary shrink-0" />
                      <div>
                        <div className="font-semibold text-base-content hover:text-primary transition-colors">
                          {pillar.name}
                        </div>
                        <div className="text-xs text-base-content/50 mt-0.5 flex items-center gap-1.5">
                          <span>Target: <strong>{pillar.primaryKeyword}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subtopics / Keywords count */}
                  <div className="col-span-2 text-right text-base-content/85">
                    {pillar.subtopics.length} subtopics ({totalKeywordsCount} kws)
                  </div>

                  {/* Total Volume */}
                  <div className="col-span-2 text-right font-semibold text-base-content/85">
                    {formatNumber(pillar.totalVolume)}
                  </div>

                  {/* Average Difficulty */}
                  <div className="col-span-1 text-center">
                    <span
                      className={`badge font-semibold ${
                        pillar.avgKd > 69
                          ? "badge-error"
                          : pillar.avgKd > 39
                          ? "badge-warning"
                          : "badge-success"
                      }`}
                    >
                      {pillar.avgKd}%
                    </span>
                  </div>

                  {/* Search Intent breakdown progress bar */}
                  <div className="col-span-2 px-2 flex flex-col gap-1 text-center">
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-base-200">
                      {dist.informational > 0 && (
                        <div
                          style={{ width: `${dist.informational}%` }}
                          className="bg-info shrink-0"
                          title={`Informational: ${dist.informational}%`}
                        />
                      )}
                      {dist.commercial > 0 && (
                        <div
                          style={{ width: `${dist.commercial}%` }}
                          className="bg-success shrink-0"
                          title={`Commercial: ${dist.commercial}%`}
                        />
                      )}
                      {dist.transactional > 0 && (
                        <div
                          style={{ width: `${dist.transactional}%` }}
                          className="bg-secondary shrink-0"
                          title={`Transactional: ${dist.transactional}%`}
                        />
                      )}
                      {dist.navigational > 0 && (
                        <div
                          style={{ width: `${dist.navigational}%` }}
                          className="bg-warning shrink-0"
                          title={`Navigational: ${dist.navigational}%`}
                        />
                      )}
                    </div>
                    <div className="flex justify-center gap-1.5 text-[10px] text-base-content/50 font-bold uppercase">
                      {dist.informational > 0 && <span className="text-info">I</span>}
                      {dist.commercial > 0 && <span className="text-success">C</span>}
                      {dist.transactional > 0 && <span className="text-secondary">T</span>}
                      {dist.navigational > 0 && <span className="text-warning">N</span>}
                    </div>
                  </div>
                </div>

                {/* Level 2: Nested Subtopics List */}
                {isPillarExpanded && (
                  <div className="border-t border-base-200 bg-base-50/20 px-8 py-2 space-y-2">
                    {pillar.subtopics.map((subtopic) => {
                      const isSubtopicExpanded = !!expandedSubtopics[subtopic.name];
                      const subDist = subtopic.intentDistribution;

                      return (
                        <div key={subtopic.name} className="border border-base-200 rounded-lg bg-base-100/60 overflow-hidden">
                          {/* Subtopic Header Row */}
                          <div
                            className="grid grid-cols-12 items-center px-4 py-3 cursor-pointer text-xs font-semibold hover:bg-base-50/80 transition-colors"
                            onClick={() => toggleSubtopic(subtopic.name)}
                          >
                            <div className="col-span-5 flex items-center gap-2">
                              {isSubtopicExpanded ? (
                                <ChevronUp className="size-3.5" />
                              ) : (
                                <ChevronDown className="size-3.5" />
                              )}
                              <FileText className="size-3.5 text-secondary shrink-0" />
                              <div>
                                <div className="text-base-content font-medium">{subtopic.name}</div>
                                <div className="text-[10px] text-base-content/40 font-normal">
                                  Primary: <strong>{subtopic.primaryKeyword}</strong>
                                </div>
                              </div>
                            </div>
                            <div className="col-span-2 text-right text-base-content/60 font-medium">
                              {subtopic.keywords.length} keywords
                            </div>
                            <div className="col-span-2 text-right font-medium">
                              {formatNumber(subtopic.totalVolume)}
                            </div>
                            <div className="col-span-1 text-center">
                              <span
                                className={`badge badge-xs font-semibold ${
                                  subtopic.avgKd > 69
                                    ? "badge-error"
                                    : subtopic.avgKd > 39
                                    ? "badge-warning"
                                    : "badge-success"
                                }`}
                              >
                                {subtopic.avgKd}%
                              </span>
                            </div>
                            <div className="col-span-2 px-1 flex flex-col gap-0.5 text-center">
                              <div className="flex h-1.5 overflow-hidden rounded-full bg-base-200">
                                {subDist.informational > 0 && (
                                  <div style={{ width: `${subDist.informational}%` }} className="bg-info shrink-0" />
                                )}
                                {subDist.commercial > 0 && (
                                  <div style={{ width: `${subDist.commercial}%` }} className="bg-success shrink-0" />
                                )}
                                {subDist.transactional > 0 && (
                                  <div style={{ width: `${subDist.transactional}%` }} className="bg-secondary shrink-0" />
                                )}
                                {subDist.navigational > 0 && (
                                  <div style={{ width: `${subDist.navigational}%` }} className="bg-warning shrink-0" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Level 3: Subtopic Keywords Detail Table */}
                          {isSubtopicExpanded && (
                            <div className="border-t border-base-200 bg-base-50/10 px-4 py-3">
                              <div className="overflow-x-auto rounded-lg border border-base-200 bg-base-100 shadow-inner">
                                <table className="table table-xs w-full text-left">
                                  <thead>
                                    <tr className="text-[10px] uppercase tracking-wider text-base-content/50">
                                      <th>Keyword</th>
                                      <th className="text-right">Volume</th>
                                      <th className="text-right">CPC</th>
                                      <th className="text-center">KD</th>
                                      <th className="text-center">Intent</th>
                                      <th className="text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {subtopic.keywords.map((kw, i) => (
                                      <tr key={i} className="hover:bg-base-50/50">
                                        <td className="font-semibold text-base-content/90 flex items-center gap-1.5">
                                          {kw.keyword}
                                          <a
                                            href={`https://www.google.com/search?q=${encodeURIComponent(
                                              kw.keyword
                                            )}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-base-content/30 hover:text-primary"
                                          >
                                            <ExternalLink className="size-3" />
                                          </a>
                                        </td>
                                        <td className="text-right font-medium">
                                          {kw.searchVolume !== null
                                            ? formatNumber(kw.searchVolume)
                                            : "-"}
                                        </td>
                                        <td className="text-right font-medium">
                                          {kw.cpc !== null ? `$${kw.cpc.toFixed(2)}` : "-"}
                                        </td>
                                        <td className="text-center">
                                          <span className="font-semibold">
                                            {kw.keywordDifficulty !== null
                                              ? `${kw.keywordDifficulty}%`
                                              : "-"}
                                          </span>
                                        </td>
                                        <td className="text-center">
                                          <span
                                            className={`badge badge-xs font-semibold uppercase ${getIntentColor(
                                              kw.intent
                                            )}`}
                                          >
                                            {kw.intent[0]}
                                          </span>
                                        </td>
                                        <td className="text-right">
                                          {onSaveKeywords && (
                                            <button
                                              onClick={() => onSaveKeywords([kw.keyword])}
                                              className="btn btn-ghost btn-xs text-base-content/40 hover:text-primary gap-1"
                                              title="Save to Keyword Manager"
                                            >
                                              <Bookmark className="size-3" /> Save
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

