export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card glass-panel-interactive glow-card rounded-xl">
      <div className="card-body p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">
          {label}
        </p>
        <p className="text-3xl font-bold tracking-tight mt-1 bg-gradient-to-r from-base-content to-base-content/85 bg-clip-text text-transparent">{value}</p>
      </div>
    </div>
  );
}

