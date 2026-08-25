import { PageHeader } from "@/components/layout/page-header";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getStreamerById } from "@/lib/mock/research";

const CURRENT_STREAMER_ID = "str_1";

export const metadata = { title: "Profile | LiveDrop Arena" };

export default function StreamerProfilePage() {
  const streamer = getStreamerById(CURRENT_STREAMER_ID);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Profile" description="Your streamer profile as shown to the research team." />

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="displayName" className="mb-1.5">Display Name</Label>
            <Input id="displayName" defaultValue={streamer?.displayName} />
          </div>
          <div>
            <Label htmlFor="platform" className="mb-1.5">Platform</Label>
            <Input id="platform" defaultValue={streamer?.platform} disabled />
          </div>
          <div>
            <Label htmlFor="channelUrl" className="mb-1.5">Channel URL</Label>
            <Input id="channelUrl" defaultValue={streamer?.channelUrl} />
          </div>
          <div>
            <Label htmlFor="category" className="mb-1.5">Category</Label>
            <Input id="category" defaultValue={streamer?.category} />
          </div>
        </div>
        <Button className="mt-5">Save Changes</Button>
      </div>
    </div>
  );
}
