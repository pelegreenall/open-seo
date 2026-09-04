import { useMemo } from "react";
import type { PillarCluster } from "@/types/schemas/keywordClustering";
import { formatNumber } from "@/client/features/keywords/utils";

type Props = {
  seedKeyword: string;
  pillars: PillarCluster[];
  selectedClusterName: string | null;
  onSelectCluster: (name: string | null) => void;
};

export function StrategyMindMap({
  seedKeyword,
  pillars,
  selectedClusterName,
  onSelectCluster,
}: Props) {
  const width = 900;
  const height = 500;
  const cx = width / 2;
  const cy = height / 2;

  // Calculate node positions and styling parameters for Pillars
  const nodes = useMemo(() => {
    if (pillars.length === 0) return [];

    const volumes = pillars.map((c) => c.totalVolume);
    const minVol = Math.min(...volumes);
    const maxVol = Math.max(...volumes);

    return pillars.map((pillar, index) => {
      // Radial layout with larger spacing to prevent overlap
      const angle = (index * 2 * Math.PI) / pillars.length;
      const distance = 190 + (index % 2) * 35; // Alternating distances
      const x = cx + distance * Math.cos(angle);
      const y = cy + distance * Math.sin(angle);

      // Node circle size scaled by volume
      let radius = 28;
      if (maxVol > minVol) {
        radius = 24 + 18 * ((pillar.totalVolume - minVol) / (maxVol - minVol));
      }

      // Premium styling classes matching Tailwind/DaisyUI colors
      let colorClass = "from-emerald-400 to-teal-500 text-emerald-950 ring-emerald-400/30";
      let borderStroke = "stroke-emerald-500/20";
      if (pillar.avgKd > 69) {
        colorClass = "from-rose-400 to-red-500 text-rose-950 ring-rose-400/30";
        borderStroke = "stroke-red-500/20";
      } else if (pillar.avgKd > 39) {
        colorClass = "from-amber-400 to-orange-500 text-amber-950 ring-amber-400/30";
        borderStroke = "stroke-orange-500/20";
      }

      return {
        ...pillar,
        x,
        y,
        radius,
        colorClass,
        borderStroke,
      };
    });
  }, [pillars, cx, cy]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-base-300 bg-base-100/50 p-6 shadow-inner backdrop-blur-sm">
      {/* Legend */}
      <div className="absolute left-6 top-6 z-10 flex flex-col gap-1.5 bg-base-100/80 backdrop-blur-md p-3 rounded-xl border border-base-200 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/40">Topical Mind Map</h3>
        <div className="flex gap-4 text-xs font-semibold text-base-content/70">
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500" />
            <span>Easy (KD &lt; 40%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500" />
            <span>Medium (KD 40%-69%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-full bg-gradient-to-br from-rose-400 to-red-500" />
            <span>Hard (KD &ge; 70%)</span>
          </div>
        </div>
      </div>

      {/* Contained Scrollable viewport canvas */}
      <div className="w-full overflow-auto mt-16 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
        <div className="min-w-[900px] mx-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full max-h-[500px]"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Connection Lines with subtle dashes */}
            {nodes.map((node) => (
              <path
                key={`line-${node.name}`}
                d={`M ${cx} ${cy} Q ${(cx + node.x) / 2} ${(cy + node.y) / 2 - 15} ${node.x} ${node.y}`}
                fill="none"
                className={`stroke-2 transition-all duration-300 ${
                  selectedClusterName === node.name
                    ? "stroke-primary opacity-90"
                    : "stroke-base-content/15 opacity-40"
                }`}
                strokeDasharray="4,4"
              />
            ))}

            {/* Center Seed Keyword Node */}
            <g className="cursor-pointer select-none">
              <circle
                cx={cx}
                cy={cy}
                r={54}
                className="animate-pulse fill-primary/10 stroke-none"
              />
              <circle
                cx={cx}
                cy={cy}
                r={46}
                className="fill-primary stroke-primary/20 stroke-[8px] shadow-lg"
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-primary-content text-xs font-black uppercase tracking-wider"
              >
                {seedKeyword.length > 12
                  ? `${seedKeyword.slice(0, 10)}...`
                  : seedKeyword}
              </text>
            </g>

            {/* Spoke Pillar Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedClusterName === node.name;

              return (
                <g
                  key={node.name}
                  className="cursor-pointer select-none"
                  onClick={() => onSelectCluster(isSelected ? null : node.name)}
                >
                  {/* Outer Selection Ring */}
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.radius + 8}
                      className="fill-primary/5 stroke-primary/30 stroke-2"
                    />
                  )}

                  {/* Node Circle with Gradient Fill */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius}
                    className={`transition-all duration-300 stroke-[5px] fill-base-100 ${node.borderStroke} ${
                      isSelected ? "scale-105" : "hover:scale-105"
                    }`}
                  />

                  {/* KD Percentage inside Node */}
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-base-content text-xs font-extrabold"
                  >
                    {node.avgKd}%
                  </text>

                  {/* HTML Labels using foreignObject to achieve clean typography & auto-wrapping */}
                  <foreignObject
                    x={node.x - 75}
                    y={node.y + node.radius + 6}
                    width={150}
                    height={80}
                    className="pointer-events-none"
                  >
                    <div className="flex flex-col items-center justify-start text-center space-y-0.5">
                      <div
                        className={`text-[10px] font-bold leading-tight line-clamp-2 px-1 rounded transition-colors ${
                          isSelected
                            ? "text-primary bg-primary/5 font-extrabold"
                            : "text-base-content/90"
                        }`}
                      >
                        {node.name}
                      </div>
                      <div className="text-[9px] font-medium text-base-content/40">
                        Vol: {formatNumber(node.totalVolume)} | Sub: {node.subtopics.length}
                      </div>
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

