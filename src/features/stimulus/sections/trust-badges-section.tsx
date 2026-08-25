const BADGES = [
  { icon: "★", title: "100% Official", description: "Verified reward programme" },
  { icon: "🛡", title: "Secure & Safe", description: "No password needed" },
  { icon: "🎁", title: "Real Rewards", description: "Credits, vouchers & bonus entries" },
  { icon: "👥", title: "Trusted by Players", description: "Hundreds of thousands of claims" },
];

export function TrustBadgesSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {BADGES.map(({ icon, title, description }) => (
          <div key={title} className="card-border rounded-xl p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-background-deep text-lg">
              {icon}
            </div>
            <p className="font-display text-sm font-bold">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
