"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/src/lib/api";

export const REPOSITORIES_QUERY_KEY = ["repositories"] as const;

export const repositoryItemSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  provider: z.enum(["GITHUB"]),
  externalId: z.string(),
  fullName: z.string(),
  defaultBranch: z.string(),
  isPrivate: z.boolean(),
  status: z.enum(["CONNECTED", "DISCONNECTED"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const repositoriesResponseSchema = z.object({
  items: z.array(repositoryItemSchema),
  total: z.number().int().nonnegative(),
  nextCursor: z.string().nullable(),
});

export type RepositoryItem = z.infer<typeof repositoryItemSchema>;
export type RepositoriesResponse = z.infer<typeof repositoriesResponseSchema>;

export interface FetchRepositoriesParams {
  cursor?: string;
  limit?: number;
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

  const query = searchParams.toString();
  const path = query ? `/api/repositories?${query}` : "/api/repositories";
  const payload = await apiFetch<unknown>(path, { signal });
  return repositoriesResponseSchema.parse(payload);
}

export function useRepositories(
  params?: FetchRepositoriesParams,
  options?: Omit<UseQueryOptions<RepositoriesResponse, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: [...REPOSITORIES_QUERY_KEY, params?.cursor ?? null, params?.limit ?? 20],
    queryFn: ({ signal }) => fetchRepositories(params, signal),
    ...options,
  });
}

