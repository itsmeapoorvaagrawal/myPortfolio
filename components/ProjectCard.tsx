type ProjectCardProps = {
  title: string;
  description: string;
  tags: string[];
  liveUrl?: string;
  codeUrl?: string;
};

export default function ProjectCard({
  title,
  description,
  tags,
  liveUrl,
  codeUrl,
}: ProjectCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent/60">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
        {description}
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <li
            key={tag}
            className="rounded-full bg-background px-2.5 py-1 text-xs text-muted"
          >
            {tag}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex gap-4 text-sm font-medium">
        {liveUrl && (
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="text-accent transition-opacity hover:opacity-80"
          >
            Live demo &rarr;
          </a>
        )}
        {codeUrl && (
          <a
            href={codeUrl}
            target="_blank"
            rel="noreferrer"
            className="text-muted transition-colors hover:text-foreground"
          >
            Source code
          </a>
        )}
      </div>
    </div>
  );
}
