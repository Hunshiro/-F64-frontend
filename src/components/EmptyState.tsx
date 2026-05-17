export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="card p-8 text-center">
      <div className="font-display text-xl mb-2">{title}</div>
      {description && (
        <div className="text-black/60 dark:text-white/60">{description}</div>
      )}
    </div>
  );
}

