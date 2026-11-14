"use client";

import {
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/src/lib/api";

export const SCANS_QUERY_KEY = ["scans"] as const;

export const scanStatusSchema = z.enum([
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "SKIPPED",
]);

export const scanTriggerSchema = z.enum(["PUSH", "MANUAL"]);

export type ScanStatus = z.infer<typeof scanStatusSchema>;
export type ScanTrigger = z.infer<typeof scanTriggerSchema>;

export const scanItemSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  repositoryId: z.string(),
  branch: z.string(),
  commitSha: z.string(),
  trigger: scanTriggerSchema,
  status: scanStatusSchema,
  phase: z.string().nullable().optional(),
  progress: z.number().int().default(0),
  filesScanned: z.number().int().nullable().optional(),
  findingsCount: z.number().int().default(0),
  durationMs: z.number().int().nullable().optional(),
  analyzers: z.any().nullable().optional(),
  errorCode: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  repository: z.object({
    id: z.string(),
    fullName: z.string(),
    defaultBranch: z.string(),
  }),
});

export const scansResponseSchema = z.object({
  items: z.array(scanItemSchema),
  nextCursor: z.string().nullable(),
});

export type ScanItem = z.infer<typeof scanItemSchema>;
export type ScansResponse = z.infer<typeof scansResponseSchema>;

export interface FetchScansParams {
  cursor?: string;
  limit?: number;
  repositoryId?: string;
  status?: ScanStatus;
}

export async function fetchScans(
  params?: FetchScansParams,
  signal?: AbortSignal,
): Promise<ScansResponse> {
  const searchParams = new URLSearchParams();
  if (params?.cursor) {
    searchParams.set("cursor", params.cursor);
  }
  if (params?.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params?.repositoryId) {
    searchParams.set("repositoryId", params.repositoryId);
  }
  if (params?.status) {
    searchParams.set("status", params.status);
  }

  const query = searchParams.toString();
  const path = query ? `/api/scans?${query}` : "/api/scans";
  const payload = await apiFetch<unknown>(path, { signal });
  return scansResponseSchema.parse(payload);
}

export function useScans(
  params?: FetchScansParams,
  options?: Omit<UseQueryOptions<ScansResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: [
      ...SCANS_QUERY_KEY,
      params?.cursor ?? null,
      params?.limit ?? 20,
      params?.repositoryId ?? null,
      params?.status ?? null,
    ],
    queryFn: ({ signal }) => fetchScans(params, signal),
    refetchInterval: (query) => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return false;
      }
      const items = query.state.data?.items ?? [];
      const hasActive = items.some(
        (scan) => scan.status === "QUEUED" || scan.status === "RUNNING",
      );
      return hasActive ? 3000 : false;
    },
    ...options,
  });
}

