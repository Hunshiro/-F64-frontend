export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-black/50 dark:text-white/60">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
    </div>
  );
}
