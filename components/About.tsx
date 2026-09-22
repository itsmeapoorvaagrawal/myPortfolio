const skills = [
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "SQL",
  "Tailwind CSS",
  "Git",
];

export default function About() {
  return (
    <section id="about" className="section-container py-20">
      <h2 className="text-sm font-medium uppercase tracking-widest text-accent">
        About me
      </h2>
      <div className="mt-4 grid gap-10 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <p className="text-lg leading-relaxed text-muted">
            I&apos;m a developer who enjoys turning complex problems into
            simple, elegant solutions. I care about clean code, good design,
            and building products that people actually enjoy using. When
            I&apos;m not coding, I&apos;m usually exploring new tools,
            contributing to side projects, or learning something outside my
            comfort zone.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            I&apos;m currently open to new opportunities and collaborations —
            feel free to reach out if you&apos;d like to work together.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Tools &amp; technologies
          </h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <li
                key={skill}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted"
              >
                {skill}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
