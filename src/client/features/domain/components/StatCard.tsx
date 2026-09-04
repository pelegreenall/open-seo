export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card glass-panel-interactive glow-card rounded-xl">
      <div className="card-body p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">
          {label}
        </p>
        <p className="text-3xl font-bold tracking-tight mt-1 bg-gradient-to-r from-base-content to-base-content/85 bg-clip-text text-transparent">{value}</p>
        <p className="text-2xl font-semibold">{value}</p>
        {hint ? <p className="text-xs text-base-content/50">{hint}</p> : null}
      </div>
    </div>
  );
}

