"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/src/lib/api";
import { SCANS_QUERY_KEY, scanStatusSchema } from "@/src/features/scans/use-scans";

export const REPOSITORIES_QUERY_KEY = ["repositories"] as const;
const GITHUB_INSTALLATIONS_QUERY_KEY = ["github", "installations"] as const;

export const repoStatusSchema = z.enum([
  "AVAILABLE",
  "CONNECTED",
  "DISCONNECTED",
  "REMOVED",
]);

export type RepoStatus = z.infer<typeof repoStatusSchema>;

export const lastScanSummarySchema = z.object({
  id: z.string(),
  status: scanStatusSchema,
  commitSha: z.string(),
  findingsCount: z.number().int().optional(),
  finishedAt: z.string().nullable(),
});

export const repositoryItemSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  installationId: z.string(),
  provider: z.enum(["GITHUB"]),
  externalId: z.string(),
  fullName: z.string(),
  defaultBranch: z.string(),
  isPrivate: z.boolean(),
  status: repoStatusSchema,
  lastPushAt: z.string().nullable().optional(),
  lastScan: lastScanSummarySchema.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const repositoriesResponseSchema = z.object({
  items: z.array(repositoryItemSchema),
  total: z.number().int().nonnegative(),
  nextCursor: z.string().nullable(),
});

export const repositoryMutationResponseSchema = z.object({
  repository: repositoryItemSchema,
});

export type RepositoryItem = z.infer<typeof repositoryItemSchema>;
export type RepositoriesResponse = z.infer<typeof repositoriesResponseSchema>;

export interface FetchRepositoriesParams {
  cursor?: string;
  limit?: number;
  status?: RepoStatus[];
  search?: string;
  installationId?: string;
}

export async function fetchRepositories(
  params?: FetchRepositoriesParams,
  signal?: AbortSignal
): Promise<RepositoriesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.cursor) {
    searchParams.set("cursor", params.cursor);
  }
  if (params?.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params?.status && params.status.length > 0) {
    for (const status of params.status) {
      searchParams.append("status", status);
    }
  }
  if (params?.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params?.installationId) {
    searchParams.set("installationId", params.installationId);
  }

  const query = searchParams.toString();
  const path = query ? `/api/repositories?${query}` : "/api/repositories";
  const payload = await apiFetch<unknown>(path, { signal });
  return repositoriesResponseSchema.parse(payload);
}

export function useRepositories(
  params?: FetchRepositoriesParams,
  options?: Omit<UseQueryOptions<RepositoriesResponse, Error>, "queryKey" | "queryFn">
) {
  const normalizedStatus = params?.status ? [...params.status].sort() : [];
  const normalizedSearch = params?.search?.trim() ?? "";

  return useQuery({
    queryKey: [
      ...REPOSITORIES_QUERY_KEY,
      params?.cursor ?? null,
      params?.limit ?? 20,
      normalizedStatus,
      normalizedSearch,
      params?.installationId ?? null,
    ],
    queryFn: ({ signal }) => fetchRepositories(params, signal),
    ...options,
  });
}

export function useConnectRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repositoryId: string) => {
      const payload = await apiFetch<unknown>(
        `/api/repositories/${encodeURIComponent(repositoryId)}/connect`,
        { method: "POST" }
      );
      return repositoryMutationResponseSchema.parse(payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: GITHUB_INSTALLATIONS_QUERY_KEY }),
      ]);
    },
  });
}

export function useDisconnectRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repositoryId: string) => {
      const payload = await apiFetch<unknown>(
        `/api/repositories/${encodeURIComponent(repositoryId)}/disconnect`,
        { method: "POST" }
      );
      return repositoryMutationResponseSchema.parse(payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: GITHUB_INSTALLATIONS_QUERY_KEY }),
      ]);
    },
  });
}

export function useTriggerManualScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repositoryId: string) => {
      return apiFetch<{ ok: boolean }>(
        `/api/repositories/${encodeURIComponent(repositoryId)}/scan`,
        { method: "POST" },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SCANS_QUERY_KEY }),
      ]);
    },
  });
}
