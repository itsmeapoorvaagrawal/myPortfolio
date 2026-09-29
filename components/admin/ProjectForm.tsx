"use client";

import type { Project } from "@/lib/projects";

type ProjectFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  defaultValues?: Project;
  onCancel?: () => void;
};

export default function ProjectForm({
  action,
  submitLabel,
  defaultValues,
  onCancel,
}: ProjectFormProps) {
  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className="text-sm font-medium text-foreground">Title</label>
          <input
            name="title"
            required
            defaultValue={defaultValues?.title}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className="text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            name="description"
            required
            rows={3}
            defaultValue={defaultValues?.description}
            className="resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className="text-sm font-medium text-foreground">
            Tags (comma-separated)
          </label>
          <input
            name="tags"
            defaultValue={defaultValues?.tags.join(", ")}
            placeholder="Next.js, TypeScript, PostgreSQL"
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            Live URL
          </label>
          <input
            name="live_url"
            type="url"
            defaultValue={defaultValues?.live_url ?? ""}
            placeholder="https://..."
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            Code URL
          </label>
          <input
            name="code_url"
            type="url"
            defaultValue={defaultValues?.code_url ?? ""}
            placeholder="https://github.com/..."
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            Sort order
          </label>
          <input
            name="sort_order"
            type="number"
            defaultValue={defaultValues?.sort_order ?? 0}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-background"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
