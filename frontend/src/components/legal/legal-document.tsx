import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeftIcon, ShieldCheckIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface LegalSection {
  id: string;
  title: string;
  summary?: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocumentProps {
  activeSlug: "terms" | "privacy" | "security";
  badge: string;
  title: string;
  description: string;
  effectiveDate: string;
  highlightTitle: string;
  highlightBody: string;
  sections: LegalSection[];
}

const legalPages = [
  { slug: "terms", label: "Terms of Service", href: "/terms" },
  { slug: "privacy", label: "Privacy Policy", href: "/privacy" },
  { slug: "security", label: "Security", href: "/security" },
] as const;

export function buildLegalMetadata(title: string, description: string): Metadata {
  return {
    title: `${title} — ReviewPilot`,
    description,
  };
}

export function LegalDocument({
  activeSlug,
  badge,
  title,
  description,
  effectiveDate,
  highlightTitle,
  highlightBody,
  sections,
}: LegalDocumentProps) {
  return (
    <div className="w-full bg-background py-10 sm:py-14">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 sm:px-6">
        {/* Header block */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/" />}
              nativeButton={false}
              className="-ml-2.5 text-muted-foreground"
            >
              <ArrowLeftIcon data-icon="inline-start" />
              <span>Back to ReviewPilot</span>
            </Button>

            <nav aria-label="Legal documents" className="flex flex-wrap items-center gap-2">
              {legalPages.map((page) => {
                const isActive = page.slug === activeSlug;
                return (
                  <Button
                    key={page.slug}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    render={<Link href={page.href} />}
                    nativeButton={false}
                  >
                    <span>{page.label}</span>
                  </Button>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="secondary">{badge}</Badge>
              <span className="font-mono text-xs text-muted-foreground">
                Effective {effectiveDate}
              </span>
            </div>

            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          <Alert>
            <ShieldCheckIcon />
            <AlertTitle>{highlightTitle}</AlertTitle>
            <AlertDescription>{highlightBody}</AlertDescription>
          </Alert>
        </div>

        <Separator />

        {/* Two-column editorial layout: table of contents + structured sections */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr] lg:items-start">
          <aside className="lg:sticky lg:top-20">
            <Card className="shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  On this page
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <nav aria-label="Section index" className="flex flex-col gap-1.5">
                  {sections.map((section, index) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none"
                    >
                      {index + 1}. {section.title}
                    </a>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          <div className="flex flex-col gap-5">
            {sections.map((section, index) => (
              <Card
                key={section.id}
                id={section.id}
                className="scroll-mt-20 shadow-xs"
              >
                <CardHeader className="border-b">
                  <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                    {index + 1}. {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
                  {section.summary ? (
                    <p className="font-medium text-foreground">{section.summary}</p>
                  ) : null}

                  {section.paragraphs?.map((paragraph, pIndex) => (
                    <p key={pIndex}>{paragraph}</p>
                  ))}

                  {section.bullets && section.bullets.length > 0 ? (
                    <ul className="flex list-disc flex-col gap-2 pl-5">
                      {section.bullets.map((bullet, bIndex) => (
                        <li key={bIndex}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            ))}

            <Card className="bg-muted/40 shadow-xs">
              <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-foreground">
                    Questions about our policies or data practices?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Contact the ReviewPilot team at{" "}
                    <span className="font-mono text-foreground">
                      legal@reviewpilot.dev
                    </span>{" "}
                    or{" "}
                    <span className="font-mono text-foreground">
                      security@reviewpilot.dev
                    </span>
                    .
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href="/status" />}
                    nativeButton={false}
                  >
                    <span>System status</span>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    render={<Link href="/login" />}
                    nativeButton={false}
                  >
                    <span>Sign in</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

