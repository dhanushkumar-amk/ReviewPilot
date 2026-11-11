import * as React from "react";
import { Schibsted_Grotesk, Instrument_Sans, Geist_Mono } from "next/font/google";
import { SmoothScrollProvider } from "@/src/lib/smooth-scroll";
import { MarketingNav } from "@/src/components/marketing/nav";
import { MarketingFooter } from "@/src/components/marketing/footer";

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono-landing",
  subsets: ["latin"],
  display: "swap",
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${schibsted.variable} ${instrument.variable} ${geistMono.variable} font-body bg-background text-foreground min-h-screen flex flex-col selection:bg-primary/20 selection:text-foreground`}
    >
      <SmoothScrollProvider>
        <MarketingNav />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <MarketingFooter />
      </SmoothScrollProvider>
    </div>
  );
}

