import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/support", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/terms#privacy", label: "Privacy" },
  { href: "/#faq", label: "FAQ" },
  { href: "/support", label: "Support" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-10 sm:flex-row sm:justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-sm font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand text-xs text-white">
            ▲
          </span>
          <span>
            LiveDrop<span className="text-primary">Arena</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-muted-foreground">&copy; 2026 LiveDrop Arena</p>
      </div>
      <p className="border-t border-border/60 px-4 py-4 text-center text-[11px] text-muted-foreground">
        LiveDrop Arena is an independent viewer reward event platform. Not affiliated with any
        official game publisher or streaming platform. For entertainment purposes only.
      </p>
    </footer>
  );
}
