export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  /** Primary action for the page, e.g. "Novo conhecimento". */
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="grid gap-1">
        {/* Exactly one `h1` per page: it is what a screen reader jumps to, and
            what tells the user where they landed. */}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground max-w-prose text-sm">{description}</p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
