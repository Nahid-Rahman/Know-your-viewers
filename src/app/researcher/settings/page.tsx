import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Switch } from "@/components/ui/switch";
import { requireRoleOrRedirect } from "@/lib/auth";
import { ResearcherSettingsForm } from "@/features/researcher/settings-form";

export const metadata = { title: "Settings | LiveDrop Arena" };

export default async function ResearcherSettingsPage() {
  const user = await requireRoleOrRedirect("RESEARCHER");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Account and research-data preferences." />

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Profile</p>
        <ResearcherSettingsForm name={user.name} email={user.email} />
      </div>

      <Link
        href="/researcher/settings/content"
        className="flex items-center justify-between rounded-xl border border-border bg-card p-6 hover:bg-secondary/30"
      >
        <div>
          <p className="font-semibold">Stimulus Content</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Edit hero text, FAQ, reward pool, trust badges, and categories shown on the public
            event page.
          </p>
        </div>
        <ArrowRight className="size-4 text-muted-foreground" />
      </Link>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Research Data Preferences</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Require ethics reference for Active studies</p>
              <p className="text-xs text-muted-foreground">
                Enforced platform-wide for every experiment — not a per-researcher preference.
              </p>
            </div>
            <Switch checked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-delete declined participant contact data</p>
              <p className="text-xs text-muted-foreground">
                Enforced platform-wide on every debrief decline — not a per-researcher preference.
              </p>
            </div>
            <Switch checked disabled />
          </div>
        </div>
      </div>
    </div>
  );
}
