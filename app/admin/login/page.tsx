"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8"
      >
        <h1 className="text-lg font-semibold text-foreground">Admin login</h1>
        <p className="mt-1 text-sm text-muted">
          Sign in to manage your portfolio projects.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-foreground"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </form>
    </main>
  );
}
