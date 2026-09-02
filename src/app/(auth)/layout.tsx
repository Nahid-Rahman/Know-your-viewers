import Link from "next/link";
import { Zap } from "lucide-react";
import { PageTransition } from "@/components/common/page-transition";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background-deep px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-15%] left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ backgroundImage: "radial-gradient(circle, var(--primary), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-15%] left-1/2 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ backgroundImage: "radial-gradient(circle, var(--purple), transparent 70%)" }}
      />

      <Link href="/" prefetch={false} className="relative z-10 mb-8 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-primary">
          <Zap className="size-4 text-white" fill="currentColor" />
        </span>
        <span className="font-display text-xl font-bold tracking-tight">
          LiveDrop<span className="text-primary">Arena</span>
        </span>
      </Link>
      <div className="relative z-10 w-full max-w-sm">
        <PageTransition>{children}</PageTransition>
      </div>
      <p className="relative z-10 mt-8 max-w-sm text-center text-xs text-muted-foreground">
        This login is for research staff and streamer partners only. Participants never need an
        account.
      </p>
    </div>
  );
}
