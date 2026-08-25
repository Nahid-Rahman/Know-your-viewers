import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { SupportForm } from "@/features/stimulus/components/support-form";

export const metadata = { title: "Contact Support | LiveDrop Arena" };

const INFO_CARDS = [
  {
    icon: "📄",
    title: "Entry Follow-up",
    description: "Use your response code if you need help checking the status of your viewer drop entry.",
  },
  {
    icon: "✓",
    title: "Reward Verification",
    description: "Reward results are saved with the entry and reviewed before the team contacts the participant.",
  },
  {
    icon: "🛡",
    title: "Safe Support",
    description: "Support will never ask for your password, OTP, payment details, or game account login.",
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-12 md:grid-cols-2 md:items-start">
        <div>
          <EyebrowLabel className="mb-4">CONTACT SUPPORT</EyebrowLabel>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">
            Need help with
            <br />
            <span className="text-gradient-primary">your viewer drop?</span>
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Send a short support request about your viewer drop entry. Our team will contact you
            regarding the next process after verification.
          </p>

          <div className="mt-8 space-y-4">
            {INFO_CARDS.map((card) => (
              <div key={card.title} className="card-border flex items-start gap-3 rounded-xl p-4">
                <span className="text-xl">{card.icon}</span>
                <div>
                  <p className="font-display font-bold">{card.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-border rounded-xl p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="text-2xl">✉</span>
            <div>
              <p className="font-display text-lg font-bold">Support Request</p>
              <p className="text-xs font-semibold text-primary">LIVEDROP ARENA</p>
            </div>
          </div>
          <SupportForm />
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Our team will contact you using the provided email or phone number.
          </p>
        </div>
      </div>

      <p className="mt-16 text-center text-xs font-semibold text-green">
        ✓ No password &nbsp; ✓ No OTP &nbsp; ✓ No payment &nbsp; ✓ No game login &nbsp; ✓ No account connection
      </p>
    </div>
  );
}
