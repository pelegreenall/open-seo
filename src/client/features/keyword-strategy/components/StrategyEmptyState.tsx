import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { LOCATION_OPTIONS } from "@/client/features/keywords/locations";

type Props = {
  onSubmit: (seed: string, locationCode: number) => void;
  isLoading: boolean;
};

export function StrategyEmptyState({ onSubmit, isLoading }: Props) {
  const [seed, setSeed] = useState("");
  const [locationCode, setLocationCode] = useState(2840); // Default to US (2840)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seed.trim()) return;
    onSubmit(seed.trim(), locationCode);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-16 text-center">
      <div className="max-w-xl space-y-8">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary transition-all duration-300 hover:bg-primary/10">
          <Sparkles className="size-4 animate-pulse" />
          <span>Topical Map Strategy Builder</span>
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h1 className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
            Replicate Semrush Strategy Builder
          </h1>
          <p className="text-lg text-base-content/75">
            Turn a single seed keyword into a complete topical map. Automatically cluster keywords, assign search intents, and build a Pillar-and-Spoke structure.
          </p>
        </div>

        {/* Strategy Input Card */}
        <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-xl shadow-base-200/50 dark:shadow-none">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <label
                className="flex items-center gap-3 rounded-xl border border-base-300 bg-base-50/50 px-4 py-3.5 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
              >
                <Search className="size-5 text-base-content/40" />
                <input
                  type="text"
                  className="grow bg-transparent text-base outline-none placeholder:text-base-content/40"
                  placeholder="Enter a seed keyword (e.g., email marketing)"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                className="select select-bordered grow text-base focus:border-primary focus:outline-none"
                value={locationCode}
                onChange={(e) => setLocationCode(Number(e.target.value))}
                disabled={isLoading}
              >
                {LOCATION_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="btn btn-primary gap-2 text-base font-semibold"
                disabled={isLoading || !seed.trim()}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner size-4" />
                    Generating Strategy...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-5" />
                    Create Strategy
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-base-200 bg-base-50/20 p-4 text-left">
            <h3 className="font-bold text-base-content">Topical Authority</h3>
            <p className="mt-1 text-sm text-base-content/65">
              Visualize Hub-and-Spoke layout for organic authority rankings.
            </p>
          </div>
          <div className="rounded-xl border border-base-200 bg-base-50/20 p-4 text-left">
            <h3 className="font-bold text-base-content">Intent Profiling</h3>
            <p className="mt-1 text-sm text-base-content/65">
              Categorizes keyword clusters automatically into I, C, N, T search intents.
            </p>
          </div>
          <div className="rounded-xl border border-base-200 bg-base-50/20 p-4 text-left">
            <h3 className="font-bold text-base-content">Pillar Pages</h3>
            <p className="mt-1 text-sm text-base-content/65">
              Spot the highest value topics to target with comprehensive pillar articles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
