import Link from "next/link";
import { Zap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background-deep px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-primary">
          <Zap className="size-4 text-white" fill="currentColor" />
        </span>
        <span className="font-display text-xl font-bold tracking-tight">
          LiveDrop<span className="text-primary">Arena</span>
        </span>
      </Link>
      {children}
      <p className="mt-8 max-w-sm text-center text-xs text-muted-foreground">
        This login is for research staff and streamer partners only. Participants never need an
        account.
      </p>
    </div>
  );
}
