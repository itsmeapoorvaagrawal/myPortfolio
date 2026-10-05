"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProjectInput } from "@/lib/projects";

function parseProjectForm(formData: FormData): ProjectInput {
  const tagsRaw = String(formData.get("tags") ?? "");

  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    tags: tagsRaw
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    live_url: String(formData.get("live_url") ?? "").trim() || null,
    code_url: String(formData.get("code_url") ?? "").trim() || null,
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
  };
}

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const input = parseProjectForm(formData);

  const { error } = await supabase.from("projects").insert(input);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateProject(id: string, formData: FormData) {
  const supabase = await createClient();
  const input = parseProjectForm(formData);

  const { error } = await supabase
    .from("projects")
    .update(input)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteProject(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
