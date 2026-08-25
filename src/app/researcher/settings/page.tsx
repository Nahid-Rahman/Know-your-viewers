import { PageHeader } from "@/components/layout/page-header";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const metadata = { title: "Settings | LiveDrop Arena" };

export default function ResearcherSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Account and research-data preferences." />

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Profile</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name" className="mb-1.5">Name</Label>
            <Input id="name" defaultValue="M. Rahman" />
          </div>
          <div>
            <Label htmlFor="email" className="mb-1.5">Email</Label>
            <Input id="email" type="email" defaultValue="mahmudur@shomvob.com" disabled />
          </div>
        </div>
        <Button className="mt-4">Save Changes</Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="mb-4 font-semibold">Research Data Preferences</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Require ethics reference for Active studies</p>
              <p className="text-xs text-muted-foreground">Blocks a Draft study from going Active without one.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-delete declined participant contact data</p>
              <p className="text-xs text-muted-foreground">Removes contact rows immediately when debrief permission is declined.</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>
    </div>
  );
}
