"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/src/lib/api";

export const FINDINGS_QUERY_KEY = ["findings"] as const;
export const FINDINGS_SUMMARY_QUERY_KEY = ["findings", "summary"] as const;

export const findingSeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]);
export const findingStatusSchema = z.enum(["OPEN", "ACCEPTED", "REJECTED", "FIXED"]);
export const findingToolSchema = z.enum(["ESLINT", "SEMGREP", "GITLEAKS"]);
export const findingCategorySchema = z.enum(["SECURITY", "BUG", "PERFORMANCE", "QUALITY", "SECRET"]);

export type FindingSeverity = z.infer<typeof findingSeveritySchema>;
export type FindingStatus = z.infer<typeof findingStatusSchema>;
export type FindingTool = z.infer<typeof findingToolSchema>;
export type FindingCategory = z.infer<typeof findingCategorySchema>;

export const findingItemSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  repositoryId: z.string(),
  firstScanId: z.string(),
  lastScanId: z.string(),
  fingerprint: z.string(),
  tool: findingToolSchema,
  ruleId: z.string(),
  severity: findingSeveritySchema,
  category: findingCategorySchema,
  title: z.string(),
  message: z.string(),
  filePath: z.string(),
  startLine: z.number().int(),
  endLine: z.number().int(),
  snippet: z.string().nullable().optional(),
  status: findingStatusSchema,
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  resolvedAt: z.string().nullable().optional(),
  repository: z.object({
    id: z.string(),
    fullName: z.string(),
  }),
});

export const findingsResponseSchema = z.object({
  items: z.array(findingItemSchema),
  nextCursor: z.string().nullable(),
});

export const findingsSummarySchema = z.object({
  open: z.number().int(),
  critical: z.number().int(),
  high: z.number().int(),
  medium: z.number().int(),
  low: z.number().int(),
  scansToday: z.number().int(),
  lastScan: z
    .object({
      status: z.string(),
      durationMs: z.number().nullable().optional(),
      finishedAt: z.string().nullable().optional(),
    })
    .nullable(),
});

export type FindingItem = z.infer<typeof findingItemSchema>;
export type FindingsResponse = z.infer<typeof findingsResponseSchema>;
export type FindingsSummary = z.infer<typeof findingsSummarySchema>;

export interface FetchFindingsParams {
  cursor?: string;
  limit?: number;
  repositoryId?: string;
  severity?: FindingSeverity[];
  status?: FindingStatus[];
  tool?: FindingTool[];
  search?: string;
  sortBy?: "severity" | "lastSeenAt" | "firstSeenAt";
  sortDir?: "asc" | "desc";
}

export async function fetchFindings(
  params?: FetchFindingsParams,
  signal?: AbortSignal,
): Promise<FindingsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.repositoryId && params.repositoryId !== "ALL") {
    searchParams.set("repositoryId", params.repositoryId);
  }
  if (params?.severity && params.severity.length > 0) {
    searchParams.set("severity", params.severity.join(","));
  }
  if (params?.status && params.status.length > 0) {
    searchParams.set("status", params.status.join(","));
  }
  if (params?.tool && params.tool.length > 0) {
    searchParams.set("tool", params.tool.join(","));
  }
  if (params?.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.sortDir) searchParams.set("sortDir", params.sortDir);

  const query = searchParams.toString();
  const path = query ? `/api/findings?${query}` : "/api/findings";
  const payload = await apiFetch<unknown>(path, { signal });
  return findingsResponseSchema.parse(payload);
}

export function useFindings(
  params?: FetchFindingsParams,
  options?: Omit<UseQueryOptions<FindingsResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: [
      ...FINDINGS_QUERY_KEY,
      params?.cursor ?? null,
      params?.limit ?? 25,
      params?.repositoryId ?? null,
      params?.severity?.sort().join(",") ?? null,
      params?.status?.sort().join(",") ?? null,
      params?.tool?.sort().join(",") ?? null,
      params?.search?.trim() ?? null,
      params?.sortBy ?? "lastSeenAt",
      params?.sortDir ?? "desc",
    ],
    queryFn: ({ signal }) => fetchFindings(params, signal),
    ...options,
  });
}

export function useFindingsSummary(
  options?: Omit<UseQueryOptions<FindingsSummary, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: FINDINGS_SUMMARY_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const payload = await apiFetch<unknown>("/api/findings/summary", { signal });
      return findingsSummarySchema.parse(payload);
    },
    ...options,
  });
}

export function useUpdateFindingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      findingId,
      status,
    }: {
      findingId: string;
      status: "OPEN" | "ACCEPTED" | "REJECTED";
    }) => {
      const payload = await apiFetch<{ finding: FindingItem }>(
        `/api/findings/${encodeURIComponent(findingId)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
      );
      return payload.finding;
    },
    onMutate: async ({ findingId, status }) => {
      await queryClient.cancelQueries({ queryKey: FINDINGS_QUERY_KEY });
      const previousData = queryClient.getQueriesData<FindingsResponse>({
        queryKey: FINDINGS_QUERY_KEY,
      });

      queryClient.setQueriesData<FindingsResponse>(
        { queryKey: FINDINGS_QUERY_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === findingId ? { ...item, status } : item,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: FINDINGS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: FINDINGS_SUMMARY_QUERY_KEY }),
      ]);
    },
  });
}

