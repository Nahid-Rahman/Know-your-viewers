"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit() {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    // Phase 5 wires this to Supabase Auth and redirects by the user's real role.
    router.push("/researcher/dashboard");
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7">
      <h1 className="font-display text-xl font-bold">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Access your researcher or streamer dashboard.</p>

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
        <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-white hover:opacity-90">
          {submitting ? "Signing in..." : "Sign in"}
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
