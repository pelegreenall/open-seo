import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Globe,
  Minus,
} from "lucide-react";
import {
  AreaTrendChart,
  SerpAnalysisCard,
} from "@/client/features/keywords/components";
import type { KeywordResearchRow } from "@/types/keywords";
import type { KeywordResearchControllerState } from "./types";

const MONTH_SHORT_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatTrendRangeLabel(trend: KeywordResearchRow["trend"]): string {
  if (trend.length === 0) return "";

  const start = trend[0];
  const end = trend[trend.length - 1];

  const toLabel = (month: number, year: number) => {
    const monthLabel = MONTH_SHORT_LABELS[month - 1] ?? `M${month}`;
    return `${monthLabel} ${year}`;
  };

  const startLabel = toLabel(start.month, start.year);
  const endLabel = toLabel(end.month, end.year);
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

type Props = {
  controller: KeywordResearchControllerState;
};

export function DesktopSerpPanel({ controller }: Props) {
  const { overviewKeyword } = controller;
  const [timeFrame, setTimeFrame] = useState<3 | 6 | 12>(12);

  const sortedTrend = overviewKeyword
    ? overviewKeyword.trend.toSorted(
        (a, b) => a.year * 100 + a.month - (b.year * 100 + b.month),
      )
    : [];

  const filteredTrend = sortedTrend.slice(-timeFrame);

  const trendRangeLabel = overviewKeyword
    ? formatTrendRangeLabel(filteredTrend)
    : "Last 12 available months";

  let trendDirection: "up" | "down" | "stable" = "stable";
  let trendPercentage = 0;

  if (filteredTrend.length >= 2) {
    const first = filteredTrend[0];
    const last = filteredTrend[filteredTrend.length - 1];

    if (last.searchVolume > first.searchVolume) {
      trendDirection = "up";
    } else if (last.searchVolume < first.searchVolume) {
      trendDirection = "down";
    }

    if (first.searchVolume !== 0) {
      trendPercentage =
        ((last.searchVolume - first.searchVolume) / first.searchVolume) * 100;
    } else if (last.searchVolume !== 0) {
      trendPercentage = 100;
    }
  }

  return (
    <div className="order-1 xl:order-2 flex flex-col min-w-0 gap-2 xl:basis-2/5 xl:overflow-y-auto">
      {overviewKeyword && overviewKeyword.trend.length > 0 ? (
        <div className="shrink-0 border border-base-300 rounded-xl bg-base-100 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 flex-wrap">
              <span>Search Trends</span>
              {trendRangeLabel && (
                <span className="font-normal text-base-content/50 text-xs">
                  {trendRangeLabel}
                </span>
              )}
              <div className="flex items-center gap-1 text-xs font-medium ml-1">
                {trendDirection === "up" && (
                  <span className="flex items-center gap-0.5 text-success bg-success/10 px-1.5 py-0.5 rounded">
                    <ArrowUpRight className="size-3.5" />
                    {trendPercentage.toFixed(0)}%
                  </span>
                )}
                {trendDirection === "down" && (
                  <span className="flex items-center gap-0.5 text-error bg-error/10 px-1.5 py-0.5 rounded">
                    <ArrowDownRight className="size-3.5" />
                    {trendPercentage.toFixed(0)}%
                  </span>
                )}
                {trendDirection === "stable" && (
                  <span className="flex items-center gap-0.5 text-base-content/50 bg-base-content/10 px-1.5 py-0.5 rounded">
                    <Minus className="size-3.5" />
                    {trendPercentage.toFixed(0)}%
                  </span>
                )}
              </div>
            </h4>

            <div className="flex items-center gap-1 bg-base-200 p-0.5 rounded-lg text-xs">
              {([3, 6, 12] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  className={`px-2 py-1 rounded-md font-medium transition-colors ${
                    timeFrame === tf
                      ? "bg-base-100 text-base-content shadow-sm"
                      : "text-base-content/60 hover:text-base-content"
                  }`}
                  onClick={() => setTimeFrame(tf)}
                >
                  {tf}M
                </button>
              ))}
            </div>
          </div>
          <AreaTrendChart trend={filteredTrend} />
        </div>
      ) : null}

      <div className="flex flex-col overflow-hidden border border-base-300 rounded-xl bg-base-100">
        <div className="shrink-0 px-4 py-3 border-b border-base-300">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Globe className="size-3.5" />
            SERP Analysis
            {controller.activeSerpKeyword ? (
              <span className="font-normal text-base-content/50 truncate">
                : {controller.activeSerpKeyword}
              </span>
            ) : null}
          </h3>
        </div>
        <div className="p-4">
          <SerpAnalysisCard
            items={controller.serpResults}
            keyword={controller.activeSerpKeyword}
            loading={controller.serpLoading}
            error={controller.serpError}
            onRetry={() => void controller.serpQuery.refetch()}
            page={controller.serpPage}
            pageSize={controller.SERP_PAGE_SIZE}
            onPageChange={controller.setSerpPage}
          />
        </div>
      </div>
    </div>
  );
}
