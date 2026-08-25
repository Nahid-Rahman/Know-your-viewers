import { HeroSection } from "@/features/stimulus/sections/hero-section";
import { TrustBadgesSection } from "@/features/stimulus/sections/trust-badges-section";
import { CategoriesSection } from "@/features/stimulus/sections/categories-section";
import { RewardRouletteSection } from "@/features/stimulus/sections/reward-roulette-section";
import { HowItWorksSection } from "@/features/stimulus/sections/how-it-works-section";
import { FaqSection } from "@/features/stimulus/sections/faq-section";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <TrustBadgesSection />
      <CategoriesSection />
      <RewardRouletteSection />
      <HowItWorksSection />
      <FaqSection />
    </>
  );
}
