"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCollaboratorAction } from "@/lib/actions/study-admin";

export function CollaboratorForm({ experimentId }: { experimentId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"RESEARCHER" | "VIEWER">("VIEWER");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addCollaboratorAction(experimentId, email, role);
          if ("error" in r) return void toast.error(r.error);
          toast.success("Access granted.");
          setEmail("");
          router.refresh();
        });
      }}
    >
      <Input aria-label="Researcher email" type="email" placeholder="researcher@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="w-64" />
      <select aria-label="Role" className="h-9 rounded-md border border-input bg-transparent px-2 text-sm" value={role} onChange={(e) => setRole(e.target.value as "VIEWER")}>
        <option value="VIEWER">Viewer — aggregates & pseudonymous data only</option>
        <option value="RESEARCHER">Researcher — can manage and reveal contacts</option>
      </select>
      <Button size="sm" type="submit" disabled={pending || !email}>Grant access</Button>
    </form>
  );
}
