import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSiteContent } from "@/lib/queries/research";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content-defaults";

export async function SiteNavbar() {
  const content = (await getSiteContent()) ?? DEFAULT_SITE_CONTENT;
  const { links, ctaLabel } = content.navContent;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-[69px] w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand text-white">
            ▲
          </span>
          <span>{content.siteName}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link, i) => (
            <Link
              key={`${link.href}-${i}`}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link href="/#spin" className={cn(buttonVariants(), "bg-gradient-primary text-white hover:opacity-90")}>
          {ctaLabel}
        </Link>
      </div>
    </header>
  );
}
