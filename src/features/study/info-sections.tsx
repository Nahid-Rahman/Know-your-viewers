// Static homepage sections shared by the open (StudyHome) and idle (IdleHome) pages.

export function HowItWorks({ steps }: { steps: string[] }) {
  if (!steps.length) return null;
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h2 className="mb-5 font-display text-2xl font-bold">How it works</h2>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 rounded-xl border border-border bg-card/60 p-4 text-sm">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  if (!items.length) return null;
  return (
    <section id="faq" className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
      <h2 className="mb-5 font-display text-2xl font-bold">FAQ</h2>
      <div className="space-y-3">
        {items.map((f, i) => (
          <details key={i} className="rounded-xl border border-border bg-card/60 p-4">
            <summary className="cursor-pointer text-sm font-semibold">{f.q}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
