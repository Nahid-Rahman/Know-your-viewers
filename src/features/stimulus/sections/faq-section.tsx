import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqItems } from "@/features/stimulus/config";

export function FaqSection() {
  return (
    <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-[69px] px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          Questions, <span className="text-purple">answered.</span>
        </h2>
      </div>

      <Accordion defaultValue={["item-0"]} className="card-border rounded-xl px-2">
        {faqItems.map((item, i) => (
          <AccordionItem key={item.q} value={`item-${i}`} className="px-3">
            <AccordionTrigger className="text-sm font-semibold">{item.q}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
