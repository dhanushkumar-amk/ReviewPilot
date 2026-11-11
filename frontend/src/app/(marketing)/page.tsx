import * as React from "react";
import { MarketingHero } from "@/src/components/marketing/hero";
import { MarketingWorksWith } from "@/src/components/marketing/works-with";
import { MarketingPipelineStory } from "@/src/components/marketing/pipeline-story";
import { MarketingBento } from "@/src/components/marketing/bento";
import { MarketingSecurityTimeline } from "@/src/components/marketing/security-timeline";
import { MarketingDashboardPreview } from "@/src/components/marketing/dashboard-preview";
import { MarketingPricing } from "@/src/components/marketing/pricing";
import { MarketingFAQ } from "@/src/components/marketing/faq";
import { MarketingFinalCTA } from "@/src/components/marketing/final-cta";

export default function MarketingPage() {
  return (
    <>
      <MarketingHero />
      <MarketingWorksWith />
      <MarketingPipelineStory />
      <MarketingBento />
      <MarketingSecurityTimeline />
      <MarketingDashboardPreview />
      <MarketingPricing />
      <MarketingFAQ />
      <MarketingFinalCTA />
    </>
  );
}

