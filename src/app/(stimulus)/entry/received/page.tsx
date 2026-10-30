import Link from "next/link";
import { cookies } from "next/headers";
import { CheckCircle2 } from "lucide-react";
import { CodeBlock } from "@/components/common/code-block";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { AGE_GROUP_LABELS } from "@/lib/study/constants";
import { maskPhone } from "@/lib/study/phone";
import { parseRewardConfig } from "@/lib/study/reward";
import { recordStudyEvent } from "@/lib/study/events";
import { findVisitorByToken, VISITOR_COOKIE } from "@/lib/study/visits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entry received", robots: { index: false } };

/**
 * Server-backed confirmation: shown only to the browser that made the
 * submission (visitor cookie must match). Contact values are never sent back —
 * only a masked phone and which optional fields were supplied.
 */
export default async function SubmissionReceivedPage({ searchParams }: PageProps<"/entry/received">) {
  const sp = await searchParams;
  const id = typeof sp.s === "string" ? sp.s : "";
  const visitor = await findVisitorByToken((await cookies()).get(VISITOR_COOKIE)?.value);
  const submission =
    visitor && /^[0-9a-f-]{36}$/.test(id)
      ? await prisma.submission.findFirst({
          where: { id, visitorId: visitor.id },
          include: { contact: { select: { phoneTail: true } }, config: true, spinOutcome: true, visit: true },
        })
      : null;

  if (!submission) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Confirmation not available</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The confirmation can only be shown in the browser that submitted the entry. If you need help, use the support page.
        </p>
        <Link href="/support" className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>
          Support
        </Link>
      </div>
    );
  }

  await recordStudyEvent(prisma, submission.visit, { type: "CONFIRMATION_VIEWED", submissionId: submission.id }).catch(() => {});
  const reward = parseRewardConfig(submission.config.rewardConfig);
  const details: [string, string][] = [
    ["Phone", maskPhone(submission.contact?.phoneTail)],
    ["Age group", AGE_GROUP_LABELS[submission.ageGroup]],
    ["Email", submission.emailProvided ? "Provided" : "Skipped"],
    ["In-game name", submission.ignProvided ? "Provided" : "Skipped"],
    ["Social contact", submission.socialProvided ? (submission.socialType === "DISCORD" ? "Discord provided" : "Facebook provided") : "Skipped"],
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <div className="rounded-xl border border-primary/25 bg-card p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full border border-accent-green/40 bg-accent-green/10">
            <CheckCircle2 className="size-7 text-accent-green" aria-hidden />
          </div>
          <h1 className="font-display text-3xl font-bold">Entry received</h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">{reward.resultExplanation}</p>
        </div>

        {submission.spinOutcome && (
          <p className="mt-6 rounded-xl border border-border p-4 text-sm">
            <span className="text-muted-foreground">Wheel result: </span>
            <span className="font-semibold">{submission.spinOutcome.resultLabel}</span>
            <span className="block text-xs text-muted-foreground">
              The wheel result is not a draw win. Winners are drawn at random from valid entries after the session.
            </span>
          </p>
        )}

        <CodeBlock
          className="mt-4"
          label="Response code"
          value={submission.responseCode}
          hint="Keep this code. The research team may ask for it if they contact you. It does not give access to your details."
        />

        <div className="mt-4 rounded-xl border border-border">
          <p className="border-b border-border px-4 py-3 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            What we received
          </p>
          <dl className="divide-y divide-border">
            {details.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Each phone number counts once in the draw for this campaign. Additional entries are kept for review but do not add chances.
          We will never ask for your bKash PIN, OTP or password.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/" prefetch={false} className={cn(buttonVariants({ size: "lg" }), "flex-1 bg-gradient-primary text-white hover:opacity-90")}>
            Back to the stream page
          </Link>
          <Link href="/support" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            Support
          </Link>
        </div>
      </div>
    </div>
  );
}
