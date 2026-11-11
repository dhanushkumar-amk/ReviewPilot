"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Code2Icon,
  PlusIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/app-shell/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { initialRules, type SecurityRuleRecord } from "@/lib/dashboard-data";

const categoryItems = [
  { label: "Security", value: "Security" },
  { label: "Performance", value: "Performance" },
  { label: "Reliability", value: "Reliability" },
  { label: "Style", value: "Style" },
];

const severityItems = [
  { label: "Critical", value: "Critical" },
  { label: "High", value: "High" },
  { label: "Medium", value: "Medium" },
  { label: "Low", value: "Low" },
];

function severityVariant(
  severity: SecurityRuleRecord["severity"]
): React.ComponentProps<typeof Badge>["variant"] {
  if (severity === "Critical" || severity === "High") return "destructive";
  if (severity === "Medium") return "default";
  return "secondary";
}

export default function RulesPage() {
  const [rules, setRules] = React.useState<SecurityRuleRecord[]>(initialRules);
  const [categoryTab, setCategoryTab] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");
  const [selectedRule, setSelectedRule] =
    React.useState<SecurityRuleRecord | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [ruleName, setRuleName] = React.useState("");
  const [ruleCwe, setRuleCwe] = React.useState("CWE-79");
  const [ruleCategory, setRuleCategory] =
    React.useState<SecurityRuleRecord["category"]>("Security");
  const [ruleSeverity, setRuleSeverity] =
    React.useState<SecurityRuleRecord["severity"]>("High");
  const [ruleDesc, setRuleDesc] = React.useState("");
  const [nameError, setNameError] = React.useState<string | null>(null);

  const filteredRules = rules.filter((rule) => {
    const matchesTab =
      categoryTab === "all" || rule.category === categoryTab;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      rule.name.toLowerCase().includes(q) ||
      rule.cwe.toLowerCase().includes(q) ||
      rule.engine.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const activeCount = rules.filter((r) => r.enabled).length;
  const criticalBlocking = rules.filter(
    (r) => r.enabled && r.severity === "Critical"
  ).length;
  const totalMatches = rules.reduce((sum, r) => sum + r.matches30d, 0);

  const handleToggleRule = (ruleId: string, nextEnabled: boolean) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: nextEnabled } : r))
    );
    toast.success(nextEnabled ? "Policy rule enabled" : "Policy rule paused");
  };

  const handleCreateRule = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ruleName.trim()) {
      setNameError("Enter a short, descriptive rule title.");
      return;
    }
    const created: SecurityRuleRecord = {
      id: `RULE-${100 + rules.length}`,
      name: ruleName.trim(),
      cwe: ruleCwe.trim() || "CUSTOM-01",
      category: ruleCategory,
      severity: ruleSeverity,
      engine: "Custom-YAML",
      enabled: true,
      matches30d: 0,
      description:
        ruleDesc.trim() ||
        "Custom organization security and quality policy rule.",
      exampleYaml: `id: ${ruleCwe.trim() || "CUSTOM-01"}
severity: ${ruleSeverity.toLowerCase()}
category: ${ruleCategory.toLowerCase()}
enabled: true`,
    };
    setRules((prev) => [created, ...prev]);
    setRuleName("");
    setRuleDesc("");
    setNameError(null);
    setCreateOpen(false);
    toast.success(`Added rule ${created.cwe}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rules"
        description="Configure AST security rules, CWE enforcement policies, and custom organization lint checks."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>
              <PlusIcon data-icon="inline-start" />
              Create custom rule
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form
                onSubmit={handleCreateRule}
                className="flex flex-col gap-4"
              >
                <DialogHeader>
                  <DialogTitle>Create custom policy rule</DialogTitle>
                  <DialogDescription>
                    Add a custom AST or pattern check applied across connected
                    repositories.
                  </DialogDescription>
                </DialogHeader>
                <FieldGroup>
                  <Field data-invalid={nameError ? true : undefined}>
                    <FieldLabel htmlFor="rule-name">Rule name</FieldLabel>
                    <Input
                      id="rule-name"
                      placeholder="Disallow raw innerHTML assignment"
                      value={ruleName}
                      onChange={(e) => {
                        setRuleName(e.target.value);
                        setNameError(null);
                      }}
                      aria-invalid={nameError ? true : undefined}
                    />
                    {nameError ? <FieldError>{nameError}</FieldError> : null}
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field>
                      <FieldLabel htmlFor="rule-cwe">Code / CWE</FieldLabel>
                      <Input
                        id="rule-cwe"
                        value={ruleCwe}
                        onChange={(e) => setRuleCwe(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="rule-cat">Category</FieldLabel>
                      <Select
                        items={categoryItems}
                        value={ruleCategory}
                        onValueChange={(value) => {
                          if (value) {
                            setRuleCategory(
                              value as SecurityRuleRecord["category"]
                            );
                          }
                        }}
                      >
                        <SelectTrigger id="rule-cat" className="w-full">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          <SelectGroup>
                            {categoryItems.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="rule-sev">Severity</FieldLabel>
                      <Select
                        items={severityItems}
                        value={ruleSeverity}
                        onValueChange={(value) => {
                          if (value) {
                            setRuleSeverity(
                              value as SecurityRuleRecord["severity"]
                            );
                          }
                        }}
                      >
                        <SelectTrigger id="rule-sev" className="w-full">
                          <SelectValue placeholder="Severity" />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          <SelectGroup>
                            {severityItems.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="rule-desc">
                      Remediation guidance
                    </FieldLabel>
                    <Textarea
                      id="rule-desc"
                      placeholder="Explain why this pattern is unsafe and what safe API engineers should use."
                      value={ruleDesc}
                      onChange={(e) => setRuleDesc(e.target.value)}
                    />
                  </Field>
                </FieldGroup>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save rule</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Active policy rules"
          value={activeCount}
          description={`${rules.length} rules configured in catalog`}
          icon={ShieldCheckIcon}
        />
        <StatCard
          title="Merge-blocking critical"
          value={criticalBlocking}
          valueClassName="text-destructive"
          description="Automatically fail PR check runs when violated"
          icon={ShieldAlertIcon}
        />
        <StatCard
          title="Matches (30 days)"
          value={totalMatches}
          description="Violations caught prior to main branch merge"
          icon={ZapIcon}
        />
      </div>

      {/* Rules Table */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={categoryTab} onValueChange={setCategoryTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="Security">Security</TabsTrigger>
                <TabsTrigger value="Performance">Performance</TabsTrigger>
                <TabsTrigger value="Reliability">Reliability</TabsTrigger>
                <TabsTrigger value="Style">Style</TabsTrigger>
              </TabsList>
            </Tabs>

            <InputGroup className="w-full lg:w-64">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                placeholder="Search CWE or rule name..."
                aria-label="Search policy rules"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
          </div>
          <CardTitle className="sr-only">Rules catalog</CardTitle>
          <CardDescription className="sr-only">
            Enable or inspect ReviewPilot analysis rules
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>CWE / Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>30d hits</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Spec</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {rule.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {rule.engine}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {rule.cwe}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{rule.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={severityVariant(rule.severity)}>
                      {rule.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {rule.matches30d}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.enabled}
                      aria-label={`Enable ${rule.name}`}
                      onCheckedChange={(checked) =>
                        handleToggleRule(rule.id, checked)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRule(rule)}
                    >
                      <Code2Icon data-icon="inline-start" />
                      YAML
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rule Detail Sheet */}
      <Sheet
        open={Boolean(selectedRule)}
        onOpenChange={(open) => {
          if (!open) setSelectedRule(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          {selectedRule ? (
            <>
              <SheetHeader className="border-b">
                <div className="flex items-center gap-2">
                  <Badge variant={severityVariant(selectedRule.severity)}>
                    {selectedRule.severity}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {selectedRule.id} · {selectedRule.cwe}
                  </span>
                </div>
                <SheetTitle>{selectedRule.name}</SheetTitle>
                <SheetDescription>{selectedRule.description}</SheetDescription>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-4 p-4">
                <CodeBlock size="sm">
                  <CodeBlockHeader>
                    <CodeBlockTitle>.reviewpilot.yml snippet</CodeBlockTitle>
                    <CodeBlockActions>
                      <CodeBlockCopyButton value={selectedRule.exampleYaml} />
                    </CodeBlockActions>
                  </CodeBlockHeader>
                  <CodeBlockContent lineNumbers>
                    {selectedRule.exampleYaml}
                  </CodeBlockContent>
                </CodeBlock>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
