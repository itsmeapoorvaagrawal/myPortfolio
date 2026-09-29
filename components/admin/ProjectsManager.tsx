"use client";

import { useState } from "react";
import ProjectForm from "@/components/admin/ProjectForm";
import { createProject, updateProject, deleteProject } from "@/app/admin/actions";
import type { Project } from "@/lib/projects";

export default function ProjectsManager({
  projects,
}: {
  projects: Project[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleUpdate(id: string, formData: FormData) {
    await updateProject(id, formData);
    setEditingId(null);
  }

  async function handleDelete(project: Project) {
    if (!confirm(`Delete "${project.title}"? This can't be undone.`)) return;
    setDeletingId(project.id);
    try {
      await deleteProject(project.id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h2 className="text-sm font-medium uppercase tracking-widest text-accent">
          Add a project
        </h2>
        <ProjectForm
          key={projects.length}
          action={createProject}
          submitLabel="Add project"
        />
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-widest text-accent">
          Existing projects ({projects.length})
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          {projects.length === 0 && (
            <p className="text-sm text-muted">No projects yet.</p>
          )}

          {projects.map((project) =>
            editingId === project.id ? (
              <div
                key={project.id}
                className="rounded-2xl border border-border bg-surface p-6"
              >
                <ProjectForm
                  action={(formData) => handleUpdate(project.id, formData)}
                  submitLabel="Save changes"
                  defaultValues={project}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div
                key={project.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-6"
              >
                <div>
                  <h3 className="font-semibold text-foreground">
                    {project.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {project.description}
                  </p>
                  {project.tags.length > 0 && (
                    <p className="mt-2 text-xs text-muted">
                      {project.tags.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-4 text-sm font-medium">
                  <button
                    type="button"
                    onClick={() => setEditingId(project.id)}
                    className="text-accent transition-opacity hover:opacity-80"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === project.id}
                    onClick={() => handleDelete(project)}
                    className="text-red-400 transition-opacity hover:opacity-80 disabled:opacity-50"
                  >
                    {deletingId === project.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
