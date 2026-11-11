"use client";

import * as React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

// TODO: Complete detailed data transmission, encryption-in-transit, and SOC-2 data isolation details after privacy policy is finalized by legal. Render clean, neutral statement in the meantime.

const FAQ_ITEMS = [
  {
    id: "change-code",
    question: "Does ReviewPilot change my code without asking?",
    answer:
      "No. ReviewPilot never commits directly to your production or main branches. Candidate fixes are packaged as GitHub pull requests that you must inspect, review, and manually merge.",
  },
  {
    id: "repo-access",
    question: "What can ReviewPilot read?",
    answer:
      "Only the specific repositories you select when installing the GitHub App, strictly adhering to the granular permissions listed during GitHub authorization.",
  },
  {
    id: "git-providers",
    question: "Which Git providers are supported?",
    answer:
      "GitHub is supported today. Support for self-hosted GitLab and Bitbucket is currently planned.",
  },
  {
    id: "failing-tests",
    question: "What happens if a fix fails its tests?",
    answer:
      "If a candidate patch fails your repository's unit tests, linter, or type checks in the ephemeral sandbox, ReviewPilot suppresses the pull request and provides failure logs for manual inspection.",
  },
  {
    id: "private-repos",
    question: "Can I use it on private repositories?",
    answer:
      "Yes. Both public and private repositories that you explicitly authorize are fully supported on all plan tiers.",
  },
  {
    id: "code-storage",
    question: "Where does my code go?",
    answer:
      "Code is processed ephemerally in isolated sandbox worker instances to perform AST parsing and test execution. Code is not used to train public foundational AI models.",
  },
];

export function MarketingFAQ() {
  return (
    <section
      id="faq"
      className="relative w-full py-16 sm:py-24 border-b border-border bg-background"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="max-w-3xl">
          <div className="mb-10 flex flex-col gap-2 text-left">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Frequently asked questions
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Questions and answers
            </h2>
            <p className="font-body text-base text-muted-foreground">
              Technical specifics on permissions, sandbox testing, and workflow.
            </p>
          </div>

          <Accordion className="w-full">
            {FAQ_ITEMS.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="text-left font-heading text-sm sm:text-base font-semibold py-4 text-foreground">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="font-body text-sm leading-relaxed text-muted-foreground pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

