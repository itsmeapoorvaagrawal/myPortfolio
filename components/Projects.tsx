import ProjectCard from "@/components/ProjectCard";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/projects";

async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to load projects:", error.message);
    return [];
  }

  return data ?? [];
}

export default async function Projects() {
  const projects = await getProjects();

  return (
    <section id="projects" className="section-container py-20">
      <h2 className="text-sm font-medium uppercase tracking-widest text-accent">
        Projects
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        A few things I&apos;ve built recently.
      </p>

      {projects.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          Projects are on their way — check back soon.
        </p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              title={project.title}
              description={project.description}
              tags={project.tags}
              liveUrl={project.live_url ?? undefined}
              codeUrl={project.code_url ?? undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
