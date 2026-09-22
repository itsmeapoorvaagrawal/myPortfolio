import ProjectCard from "@/components/ProjectCard";

const projects = [
  {
    title: "Task Flow",
    description:
      "A collaborative task management app with real-time updates, drag-and-drop boards, and team workspaces.",
    tags: ["Next.js", "TypeScript", "PostgreSQL"],
    liveUrl: "#",
    codeUrl: "#",
  },
  {
    title: "Weatherly",
    description:
      "A minimal weather dashboard that surfaces hyperlocal forecasts with clean data visualizations.",
    tags: ["React", "Node.js", "REST API"],
    liveUrl: "#",
    codeUrl: "#",
  },
  {
    title: "ShopStack",
    description:
      "A full-stack e-commerce storefront with cart, checkout, and an admin dashboard for inventory.",
    tags: ["Next.js", "Stripe", "Tailwind CSS"],
    liveUrl: "#",
    codeUrl: "#",
  },
];

export default function Projects() {
  return (
    <section id="projects" className="section-container py-20">
      <h2 className="text-sm font-medium uppercase tracking-widest text-accent">
        Projects
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        A few things I&apos;ve built recently. Replace these with your own
        projects.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.title} {...project} />
        ))}
      </div>
    </section>
  );
}
