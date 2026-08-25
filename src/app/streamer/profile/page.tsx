import { PageHeader } from "@/components/layout/page-header";
import { requireRoleOrRedirect } from "@/lib/auth";
import { getStreamerByUserId } from "@/lib/queries/research";
import { StreamerProfileForm } from "@/features/streamer/profile-form";

export const metadata = { title: "Profile | LiveDrop Arena" };

export default async function StreamerProfilePage() {
  const user = await requireRoleOrRedirect("STREAMER");
  const streamer = await getStreamerByUserId(user.id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Profile" description="Your streamer profile as shown to the research team." />

      <div className="rounded-xl border border-border bg-card p-6">
        <StreamerProfileForm
          defaultValues={{
            displayName: streamer?.displayName ?? "",
            platform: streamer?.platform ?? "",
            channelUrl: streamer?.channelUrl ?? "",
            category: streamer?.category ?? "",
          }}
        />
      </div>
    </div>
  );
}
