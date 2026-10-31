// Original "How it works" step cards and "Questions, answered." FAQ, shared by
// the open (StudyHome) and idle (IdleHome) homepages. Text comes from the
// session's homepage configuration.
import { Eye, Zap, Mail } from "lucide-react";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { StepCard } from "@/components/common/step-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const STEP_META = [
  { title: "Spin the Reward Wheel", accent: "cyan" as const, icon: <Eye className="size-5" /> },
  { title: "Leave Your Details", accent: "violet" as const, icon: <Zap className="size-5" /> },
  { title: "Wait for the Draw", accent: "green" as const, icon: <Mail className="size-5" /> },
];

export function HowItWorks({ steps }: { steps: string[] }) {
  if (!steps.length) return null;
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-6xl scroll-mt-[69px] px-4 py-16 sm:px-6">
      <div className="mb-10 max-w-lg">
        <EyebrowLabel variant="cyan" className="mb-4">
          HOW IT WORKS
        </EyebrowLabel>
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          Three steps to <span className="text-purple">enter the draw.</span>
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {steps.slice(0, 6).map((step, i) => {
          const meta = STEP_META[i] ?? { title: `Step ${i + 1}`, accent: "cyan" as const, icon: <Eye className="size-5" /> };
          return <StepCard key={i} step={i + 1} accent={meta.accent} icon={meta.icon} title={meta.title} description={step} />;
        })}
      </div>
    </section>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  if (!items.length) return null;
  return (
    <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-[69px] px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          Questions, <span className="text-purple">answered.</span>
        </h2>
      </div>
      <Accordion defaultValue={["item-0"]} className="card-border rounded-xl px-2">
        {items.map((item, i) => (
          <AccordionItem key={`${item.q}-${i}`} value={`item-${i}`} className="px-3">
            <AccordionTrigger className="text-sm font-semibold">{item.q}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
