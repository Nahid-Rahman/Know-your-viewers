import { Eye, Zap, Mail } from "lucide-react";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { StepCard } from "@/components/common/step-card";

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-6xl scroll-mt-[69px] px-4 py-16 sm:px-6">
      <div className="mb-10 max-w-lg">
        <EyebrowLabel variant="cyan" className="mb-4">
          HOW IT WORKS
        </EyebrowLabel>
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          Three steps to <span className="text-purple">unlock your next drop.</span>
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <StepCard
          step={1}
          accent="cyan"
          icon={<Eye className="size-5" />}
          title="Choose a Reward Pool"
          description="Open the reward event and review the featured drop categories before you roll."
        />
        <StepCard
          step={2}
          accent="violet"
          icon={<Zap className="size-5" />}
          title="Spin the Reward Roll"
          description="Hit SPIN and watch the carousel land on your viewer reward result."
        />
        <StepCard
          step={3}
          accent="green"
          icon={<Mail className="size-5" />}
          title="Submit for Follow-up"
          description="Provide your email and phone so the admin team can contact you after verification."
        />
      </div>
    </section>
  );
}
