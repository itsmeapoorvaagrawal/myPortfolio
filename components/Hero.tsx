export default function Hero() {
  return (
    <section
      id="top"
      className="section-container flex min-h-[calc(100vh-4rem)] flex-col justify-center gap-6 py-20"
    >
      <p className="text-sm font-medium uppercase tracking-widest text-accent">
        Hi, my name is
      </p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
        <span className="gradient-text">Apoorva Agrawal</span>
      </h1>
      <p className="max-w-2xl text-lg text-muted sm:text-xl">
        A full-stack developer who builds clean, fast, and thoughtful digital
        experiences — from idea to production.
      </p>
      <div className="mt-4 flex flex-wrap gap-4">
        <a
          href="#projects"
          className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
        >
          View my work
        </a>
        <a
          href="#contact"
          className="rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface"
        >
          Get in touch
        </a>
      </div>
    </section>
  );
}
