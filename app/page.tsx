import { MarkdownView } from "@/components/markdown-view";

const sampleMarkdown = `## Code Review Summary

ReviewPilot has scanned the pull request and identified several improvements.

- Static analysis complete
- Markdown typography styles applied
- Markdown tables rendered via remark-gfm

| Rule ID | Severity | Status |
| :--- | :--- | :--- |
| SEC-001 | High | Resolved |
| PERF-002 | Medium | In Progress |

To integrate, import the \`MarkdownView\` component directly into your page or card.

\`\`\`typescript
export function reviewAnalysis(code: string): boolean {
  console.log("Analyzing review findings...");
  return code.length > 0;
}
\`\`\`
`;

export default function Home() {
  return (
    <main className="max-w-prose mx-auto p-8">
      <MarkdownView>{sampleMarkdown}</MarkdownView>
    </main>
  );
}
