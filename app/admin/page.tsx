import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/admin/actions";
import ProjectsManager from "@/components/admin/ProjectsManager";
import type { Project } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <main className="section-container py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Project admin
          </h1>
          <p className="mt-1 text-sm text-muted">Signed in as {user.email}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-10">
        <ProjectsManager projects={(projects as Project[]) ?? []} />
      </div>
    </main>
  );
}
