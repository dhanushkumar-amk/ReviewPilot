"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  SearchIcon,
  TerminalIcon,
  WebhookIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ui/code-block";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  cliSnippetBash,
  configSnippetYaml,
  webhookSnippetTs,
} from "@/lib/dashboard-data";

const faqItems = [
  {
    id: "faq-1",
    question: "How does ReviewPilot isolate source code during scans?",
    answer:
      "Every PR scan executes inside an ephemeral worker sandbox that fetches shallow commit diffs in memory and discards repository trees immediately after posting findings and patch suggestions.",
  },
  {
    id: "faq-2",
    question: "Can I require ReviewPilot checks before GitHub PR merge?",
    answer:
      "Yes. Enable Branch Protection Rules in GitHub and select `ReviewPilot / Security Gate` as a required status check. Pull requests violating your blocking severity threshold will remain blocked until remediated.",
  },
  {
    id: "faq-3",
    question: "How do repository `.reviewpilot.yml` files interact with global rules?",
    answer:
      "Workspace policy rules act as the organization baseline. A repository `.reviewpilot.yml` can tighten blocking thresholds, add custom ignored paths, or enable framework-specific packs without disabling mandatory CWE rules.",
  },
];

export default function DocsPage() {
  const [search, setSearch] = React.useState("");

  const filteredFaqs = faqItems.filter((item) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Documentation"
        showTabs={false}
        description="Guides for repository configuration, CI CLI scanning, and HMAC-verified webhooks."
        actions={
          <Button
            variant="outline"
            render={<Link href="/support" />}
            nativeButton={false}
          >
            Contact support
            <ArrowUpRightIcon data-icon="inline-end" />
          </Button>
        }
      />

      {/* Search + Quick Cards */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <InputGroup className="w-full sm:max-w-sm">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Search guides & FAQs..."
            aria-label="Search documentation"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Config v2</Badge>
          <Badge variant="secondary">CLI v2.4</Badge>
        </div>
      </div>

      {/* Reference Snippets Tabs */}
      <Tabs defaultValue="config" className="gap-4">
        <TabsList>
          <TabsTrigger value="config">Repository config</TabsTrigger>
          <TabsTrigger value="cli">CLI & CI</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Declarative `.reviewpilot.yml`</CardTitle>
              <CardDescription>
                Commit this configuration file at your repository root to tune
                merge gates and ignored globs
              </CardDescription>
              <CardAction>
                <BookOpenIcon className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <CodeBlock size="sm">
                <CodeBlockHeader>
                  <CodeBlockTitle className="font-mono">
                    .reviewpilot.yml
                  </CodeBlockTitle>
                  <CodeBlockActions>
                    <CodeBlockCopyButton value={configSnippetYaml} />
                  </CodeBlockActions>
                </CodeBlockHeader>
                <CodeBlockContent lineNumbers>
                  {configSnippetYaml}
                </CodeBlockContent>
              </CodeBlock>
            </CardContent>
            <CardFooter className="justify-between">
              <span className="text-xs text-muted-foreground">
                Changes take effect immediately on the next push or pull request
              </span>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/rules" />}
                nativeButton={false}
              >
                Browse rule IDs
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="cli">
          <Card>
            <CardHeader>
              <CardTitle>Run local & CI diff checks</CardTitle>
              <CardDescription>
                Run ReviewPilot checks locally before opening a pull request or
                inside GitHub Actions
              </CardDescription>
              <CardAction>
                <TerminalIcon className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <CodeBlock size="sm">
                <CodeBlockHeader>
                  <CodeBlockTitle className="font-mono">Terminal</CodeBlockTitle>
                  <CodeBlockActions>
                    <CodeBlockCopyButton value={cliSnippetBash} />
                  </CodeBlockActions>
                </CodeBlockHeader>
                <CodeBlockContent lineNumbers>{cliSnippetBash}</CodeBlockContent>
              </CodeBlock>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle>Verify outbound webhook signatures</CardTitle>
              <CardDescription>
                Validate `X-ReviewPilot-Signature` using timing-safe HMAC
                SHA-256 comparison
              </CardDescription>
              <CardAction>
                <WebhookIcon className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <CodeBlock size="sm">
                <CodeBlockHeader>
                  <CodeBlockTitle className="font-mono">
                    verify-webhook.ts
                  </CodeBlockTitle>
                  <CodeBlockActions>
                    <CodeBlockCopyButton value={webhookSnippetTs} />
                  </CodeBlockActions>
                </CodeBlockHeader>
                <CodeBlockContent lineNumbers>
                  {webhookSnippetTs}
                </CodeBlockContent>
              </CodeBlock>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FAQ Accordion */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Frequently asked questions</CardTitle>
          <CardDescription>
            Architecture, security boundaries, and merge gate behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {filteredFaqs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No FAQ entries match &ldquo;{search}&rdquo;.
            </p>
          ) : (
            <Accordion defaultValue={["faq-1"]}>
              {filteredFaqs.map((item) => (
                <AccordionItem key={item.id} value={item.id}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
