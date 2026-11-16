"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/src/lib/api";

export const SANDBOX_SETTINGS_QUERY_KEY = ["workspace", "sandbox-settings"] as const;
export const SANDBOX_USAGE_QUERY_KEY = ["workspace", "sandbox-usage"] as const;
export const FIX_VALIDATION_QUERY_KEY = ["fix-validation"] as const;

export const sandboxSettingsSchema = z.object({
  sandboxEnabled: z.boolean(),
  sandboxAvailable: z.boolean(),
});

export const sandboxUsageSchema = z.object({
  runsToday: z.number().int(),
  limit: z.number().int(),
});

export const staticCheckItemSchema = z.object({
  name: z.string(),
  status: z.enum(["PASSED", "FAILED", "WARNING", "SKIPPED"]),
  note: z.string(),
  details: z.array(z.string()).default([]),
});

export const testStepItemSchema = z.object({
  name: z.string(),
  status: z.enum(["PASSED", "FAILED", "SKIPPED"]),
  durationMs: z.number().default(0),
  note: z.string().optional(),
  outputTail: z.string().optional(),
  baselineAlsoFails: z.boolean().optional(),
});

export const fixValidationSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  fixProposalId: z.string(),
  status: z.enum(["QUEUED", "RUNNING", "PASSED", "PASSED_WITH_WARNINGS", "FAILED", "ERROR"]),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).nullable().optional(),
  staticChecks: z.array(staticCheckItemSchema).nullable().optional(),
  testsRequested: z.boolean().default(false),
  testsRun: z.boolean().default(false),
  testSteps: z.array(testStepItemSchema).nullable().optional(),
  nodeVersion: z.string().nullable().optional(),
  errorCode: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type SandboxSettings = z.infer<typeof sandboxSettingsSchema>;
export type SandboxUsage = z.infer<typeof sandboxUsageSchema>;
export type FixValidation = z.infer<typeof fixValidationSchema>;
export type StaticCheckItem = z.infer<typeof staticCheckItemSchema>;
export type TestStepItem = z.infer<typeof testStepItemSchema>;

export function useSandboxSettings() {
  return useQuery({
    queryKey: SANDBOX_SETTINGS_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const payload = await apiFetch<unknown>("/api/workspace/sandbox-settings", { signal });
      return sandboxSettingsSchema.parse(payload);
    },
  });
}

export function useUpdateSandboxSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sandboxEnabled: boolean) => {
      const payload = await apiFetch<unknown>("/api/workspace/sandbox-settings", {
        method: "PATCH",
        body: JSON.stringify({ sandboxEnabled }),
      });
      return sandboxSettingsSchema.parse(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SANDBOX_SETTINGS_QUERY_KEY });
    },
  });
}

export function useSandboxUsage() {
  return useQuery({
    queryKey: SANDBOX_USAGE_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const payload = await apiFetch<unknown>("/api/workspace/sandbox-usage", { signal });
      return sandboxUsageSchema.parse(payload);
    },
  });
}

export function useValidateFix(proposalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ runTests }: { runTests: boolean }) => {
      const payload = await apiFetch<{ validationId: string }>(
        `/api/fix-proposals/${proposalId}/validate`,
        {
          method: "POST",
          body: JSON.stringify({ runTests }),
        }
      );
      return payload;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: [...FIX_VALIDATION_QUERY_KEY, data.validationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["fix-proposals", proposalId, "validations"],
      });
    },
  });
}

export function useFixValidation(validationId: string | null) {
  return useQuery({
    queryKey: [...FIX_VALIDATION_QUERY_KEY, validationId],
    queryFn: async ({ signal }) => {
      if (!validationId) return null;
      const payload = await apiFetch<{ validation: unknown }>(
        `/api/fix-validations/${validationId}`,
        { signal }
      );
      return fixValidationSchema.parse(payload.validation);
    },
    enabled: Boolean(validationId),
    refetchInterval: (query) => {
      const current = query.state.data;
      if (!current) return 2000;
      if (current.status === "QUEUED" || current.status === "RUNNING") {
        return 2000;
      }
      return false;
    },
  });
}
