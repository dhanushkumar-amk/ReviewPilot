"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/src/lib/api";

export const AI_SETTINGS_QUERY_KEY = ["workspace", "ai-settings"] as const;
export const AI_USAGE_QUERY_KEY = ["workspace", "ai-usage"] as const;

export const aiSettingsSchema = z.object({
  aiEnabled: z.boolean(),
  providersAvailable: z.boolean(),
});

export const aiUsageSchema = z.object({
  callsToday: z.number().int(),
  limit: z.number().int(),
});

export const explainResultSchema = z.object({
  summary: z.string(),
  whyItMatters: z.string(),
  howToFix: z.string(),
  cached: z.boolean(),
  redacted: z.boolean(),
});

export const fixProposalSchema = z.object({
  id: z.string(),
  findingId: z.string(),
  status: z.enum(["DRAFT", "DISCARDED", "INVALID"]),
  filePath: z.string(),
  startLine: z.number().int(),
  endLine: z.number().int(),
  originalCode: z.string(),
  replacementCode: z.string(),
  diff: z.string(),
  explanation: z.string(),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  checks: z.object({
    patchApplies: z.boolean(),
    withinFile: z.boolean(),
    sizeOk: z.boolean(),
    reason: z.string().optional(),
    staticRecheck: z
      .object({
        passed: z.boolean(),
        findingGone: z.boolean(),
        newIssues: z.boolean(),
      })
      .optional(),
  }),
  createdAt: z.string(),
});

export const draftFixResultSchema = z.object({
  canFix: z.boolean(),
  explanation: z.string().optional(),
  fixProposal: fixProposalSchema.optional(),
});

export type AiSettings = z.infer<typeof aiSettingsSchema>;
export type AiUsage = z.infer<typeof aiUsageSchema>;
export type ExplainResult = z.infer<typeof explainResultSchema>;
export type FixProposal = z.infer<typeof fixProposalSchema>;
export type DraftFixResult = z.infer<typeof draftFixResultSchema>;

export function useAiSettings() {
  return useQuery({
    queryKey: AI_SETTINGS_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const payload = await apiFetch<unknown>("/api/workspace/ai-settings", { signal });
      return aiSettingsSchema.parse(payload);
    },
  });
}

export function useUpdateAiSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (aiEnabled: boolean) => {
      const payload = await apiFetch<{ aiEnabled: boolean }>("/api/workspace/ai-settings", {
        method: "PATCH",
        body: JSON.stringify({ aiEnabled }),
      });
      return payload.aiEnabled;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_SETTINGS_QUERY_KEY });
    },
  });
}

export function useAiUsage() {
  return useQuery({
    queryKey: AI_USAGE_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const payload = await apiFetch<unknown>("/api/workspace/ai-usage", { signal });
      return aiUsageSchema.parse(payload);
    },
  });
}

export function useExplainFinding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (findingId: string) => {
      const payload = await apiFetch<unknown>(
        `/api/findings/${encodeURIComponent(findingId)}/explain`,
        { method: "POST" },
      );
      return explainResultSchema.parse(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_USAGE_QUERY_KEY });
    },
  });
}

export function useDraftFix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (findingId: string) => {
      const payload = await apiFetch<unknown>(
        `/api/findings/${encodeURIComponent(findingId)}/fix-draft`,
        { method: "POST", timeoutMs: 30000 },
      );
      return draftFixResultSchema.parse(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_USAGE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["fix-proposals"] });
    },
  });
}

export function useDiscardProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      return apiFetch<{ proposal: FixProposal }>(
        `/api/fix-proposals/${encodeURIComponent(proposalId)}/discard`,
        { method: "POST" },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fix-proposals"] });
    },
  });
}

