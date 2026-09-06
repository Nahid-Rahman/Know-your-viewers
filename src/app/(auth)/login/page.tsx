"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleCheckIcon, Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { login } from "@/lib/actions/auth";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginValues = z.infer<typeof loginSchema>;

type Status = "idle" | "submitting" | "success";

export default function LoginPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setStatus("submitting");
    setErrorMessage(null);
    const result = await login(values);

    if ("error" in result) {
      setStatus("idle");
      setErrorMessage(result.error);
      return;
    }

    setStatus("success");
    // Brief pause so the success state is actually visible before navigating away.
    // A hard navigation (not router.push) so the dashboard's first render always
    // picks up the just-set session cookie fresh from the server.
    setTimeout(() => {
      window.location.href = result.role === "RESEARCHER" ? "/researcher/dashboard" : "/streamer/dashboard";
    }, 700);
  }

  if (status === "success") {
    return (
      <div className="glow-primary rounded-2xl border border-border bg-card p-7">
        <div className="flex flex-col items-center py-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent-green/10 text-accent-green">
            <CircleCheckIcon className="size-6" />
          </span>
          <h1 className="font-display mt-4 text-xl font-bold">Signed in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Redirecting to your dashboard&hellip;</p>
          <Loader2Icon className="mt-4 size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="glow-primary rounded-2xl border border-border bg-card p-7">
      <h1 className="font-display text-xl font-bold">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Access your researcher or streamer dashboard.</p>

      {errorMessage && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email" className="mb-1.5">Email</Label>
          <Input id="email" type="email" placeholder="you@university.edu" {...form.register("email")} />
          {form.formState.errors.email && (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="password" className="mb-1.5">Password</Label>
          <Input id="password" type="password" {...form.register("password")} />
          {form.formState.errors.password && (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>
        <Button
          type="submit"
          disabled={status === "submitting"}
          className="w-full bg-gradient-primary text-white hover:opacity-90"
        >
          {status === "submitting" && <Loader2Icon className="size-4 animate-spin" data-icon="inline-start" />}
          {status === "submitting" ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
