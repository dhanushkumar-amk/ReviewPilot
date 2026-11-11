export interface Plan {
  id: "free" | "premium";
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
}

export const PRICING_PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "For individual developers scanning personal projects.",
    features: [
      "1 connected repository",
      "30 automated scans / month",
      "3 sandbox-tested AI fixes / month",
      "7-day finding history",
      "Public and private repositories",
    ],
    cta: "Connect GitHub",
    popular: false,
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPrice: 19,
    yearlyPrice: 190,
    description: "For professional developers and growing engineering teams.",
    features: [
      "10 connected repositories",
      "1,000 automated scans / month",
      "50 sandbox-tested AI fixes / month",
      "90-day finding history",
      "Team roles and member invites",
      "Priority webhook processing",
    ],
    cta: "Connect GitHub",
    popular: true,
  },
];

export const PRICING_FOOTNOTE = "Prices shown are launch placeholders.";

