"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS, PRICING_FOOTNOTE } from "@/src/lib/pricing";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MarketingPricing() {
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">(
    "monthly"
  );

  return (
    <section
      id="pricing"
      className="relative w-full py-16 sm:py-24 border-b border-border bg-background"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="mb-10 flex flex-col items-center text-center gap-2 max-w-xl mx-auto">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Pricing
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Simple plans for growing teams
          </h2>
          <p className="font-body text-base text-muted-foreground">
            Start free on personal projects. Upgrade when your team expands.
          </p>

          {/* Monthly / Yearly Segmented Control (radiogroup semantics) */}
          <div
            role="radiogroup"
            aria-label="Billing cycle selection"
            className="mt-4 inline-flex items-center rounded-lg border border-border bg-muted/60 p-1 text-xs select-none"
          >
            <button
              type="button"
              role="radio"
              aria-checked={billingCycle === "monthly"}
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "relative rounded-md px-3 py-1.5 font-medium transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer",
                billingCycle === "monthly"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {billingCycle === "monthly" && (
                <motion.div
                  layoutId="pricing-active"
                  className="absolute inset-0 rounded-md bg-card border border-border/60 shadow-2xs"
                  transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                />
              )}
              <span className="relative z-10">Monthly billing</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={billingCycle === "yearly"}
              onClick={() => setBillingCycle("yearly")}
              className={cn(
                "relative rounded-md px-3 py-1.5 font-medium transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer flex items-center gap-1.5",
                billingCycle === "yearly"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {billingCycle === "yearly" && (
                <motion.div
                  layoutId="pricing-active"
                  className="absolute inset-0 rounded-md bg-card border border-border/60 shadow-2xs"
                  transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                />
              )}
              <span className="relative z-10">Annual billing</span>
              <span className="relative z-10 rounded bg-success/15 px-1.5 py-0.2 font-mono text-[10px] text-success font-semibold">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* 2 Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {PRICING_PLANS.map((plan) => {
            const isPremium = plan.id === "premium";
            const price =
              billingCycle === "monthly"
                ? plan.monthlyPrice
                : Math.round(plan.yearlyPrice / 12);
            const billedText =
              billingCycle === "yearly" && plan.yearlyPrice > 0
                ? `$${plan.yearlyPrice} billed annually`
                : "Billed monthly";

            return (
              <div
                key={plan.id}
                className={cn(
                  "rounded-lg border bg-card p-6 sm:p-8 flex flex-col justify-between gap-6",
                  isPremium
                    ? "border-foreground"
                    : "border-border"
                )}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      {plan.name}
                    </h3>
                    {isPremium && (
                      <span className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground border border-border">
                        POPULAR
                      </span>
                    )}
                  </div>

                  <p className="font-body text-xs text-muted-foreground min-h-[32px]">
                    {plan.description}
                  </p>

                  {/* Price display with 220ms vertical swap */}
                  <div className="flex items-baseline gap-1 py-1 overflow-hidden h-12">
                    <span className="font-mono text-2xl font-bold text-foreground">
                      $
                    </span>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={`${plan.id}-${billingCycle}`}
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -8, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="font-display text-4xl font-bold tracking-tight text-foreground"
                      >
                        {price}
                      </motion.span>
                    </AnimatePresence>
                    <span className="font-mono text-xs text-muted-foreground ml-1">
                      / month
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground -mt-3">
                    {billedText}
                  </span>

                  {/* Feature list */}
                  <div className="flex flex-col gap-2.5 pt-4 border-t border-border">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      Included features
                    </span>
                    {plan.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-2 text-xs text-foreground font-body"
                      >
                        <CheckIcon className="size-3.5 text-foreground shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Primary Button only on Premium; Outline on Free */}
                <Button
                  variant={isPremium ? "default" : "outline"}
                  size="default"
                  render={<Link href="/sign-up" />}
                  nativeButton={false}
                  className="w-full text-xs font-semibold justify-center mt-2"
                >
                  {plan.cta}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Footnote */}
        <p className="mt-8 text-center font-mono text-xs text-muted-foreground">
          {PRICING_FOOTNOTE}
        </p>
      </div>
    </section>
  );
}

