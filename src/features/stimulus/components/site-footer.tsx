import Link from "next/link";
import { getSiteContent } from "@/lib/queries/research";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content-defaults";

export async function SiteFooter() {
  const content = (await getSiteContent()) ?? DEFAULT_SITE_CONTENT;
  const { links, copyrightText, disclaimerText } = content.footerContent;

  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-10 sm:flex-row sm:justify-between">
        <Link href="/" prefetch={false} className="flex items-center gap-2 font-display text-sm font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand text-xs text-white">
            ▲
          </span>
          <span>{content.siteName}</span>
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {links.map((link, i) => (
            <Link
              key={`${link.href}-${link.label}-${i}`}
              href={link.href}
              prefetch={link.href.startsWith("/#") || link.href === "/" ? false : undefined}
              className="hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-muted-foreground">{copyrightText}</p>
      </div>
      <p className="border-t border-border/60 px-4 py-4 text-center text-[11px] text-muted-foreground">
        {disclaimerText}
      </p>
    </footer>
  );
}
