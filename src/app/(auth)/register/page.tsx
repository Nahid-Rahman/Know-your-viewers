"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { register } from "@/lib/actions/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const registerSchema = z.object({
  name: z.string().min(2, "Enter your name."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(["RESEARCHER", "STREAMER"], { message: "Choose a role." }),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", role: undefined },
  });

  async function onSubmit(values: RegisterValues) {
    setSubmitting(true);
    const result = await register(values);
    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    if ("needsEmailConfirmation" in result) {
      toast.success("Account created. Check your email to confirm it before signing in.");
      router.push("/login");
      return;
    }
    router.push(result.role === "RESEARCHER" ? "/researcher/dashboard" : "/streamer/dashboard");
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7">
      <h1 className="font-display text-xl font-bold">Create an account</h1>
      <p className="mt-1 text-sm text-muted-foreground">For research staff and streamer partners.</p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="name" className="mb-1.5">Name</Label>
          <Input id="name" placeholder="Jane Doe" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>
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
        <div>
          <Label className="mb-1.5">Role</Label>
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESEARCHER">Researcher</SelectItem>
                  <SelectItem value="STREAMER">Streamer</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.role && (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.role.message}</p>
          )}
        </div>
        <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-white hover:opacity-90">
          {submitting ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
