"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/src/lib/api";
import { REPOSITORIES_QUERY_KEY } from "@/src/features/repositories/use-repositories";

export const GITHUB_INSTALLATIONS_QUERY_KEY = ["github", "installations"] as const;

export const githubInstallationSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  installationId: z.string(),
  accountLogin: z.string(),
  accountType: z.enum(["User", "Organization"]),
  accountId: z.string(),
  repositorySelection: z.enum(["ALL", "SELECTED"]),
  htmlUrl: z.string(),
  suspendedAt: z.string().nullable(),
  lastSyncedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const githubInstallationsResponseSchema = z.object({
  installations: z.array(githubInstallationSchema),
});

export const githubInstallUrlResponseSchema = z.object({
  url: z.string().url(),
});

export const githubSyncResponseSchema = z.object({
  synced: z.number().int().nonnegative(),
  removed: z.number().int().nonnegative(),
  lastSyncedAt: z.string(),
});

export const githubDeleteResponseSchema = z.object({
  deleted: z.boolean(),
  htmlUrl: z.string(),
});

export type GithubInstallation = z.infer<typeof githubInstallationSchema>;
export type GithubInstallationsResponse = z.infer<typeof githubInstallationsResponseSchema>;
export type GithubSyncResponse = z.infer<typeof githubSyncResponseSchema>;

export async function fetchGithubInstallations(
  signal?: AbortSignal
): Promise<GithubInstallationsResponse> {
  const payload = await apiFetch<unknown>("/api/github/installations", { signal });
  return githubInstallationsResponseSchema.parse(payload);
}

export function useGithubInstallations(
  options?: Omit<UseQueryOptions<GithubInstallationsResponse, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: GITHUB_INSTALLATIONS_QUERY_KEY,
    queryFn: ({ signal }) => fetchGithubInstallations(signal),
    ...options,
  });
}

export function useStartGithubInstall() {
  return useMutation({
    mutationFn: async () => {
      const payload = await apiFetch<unknown>("/api/github/install-url", {
        method: "POST",
      });
      return githubInstallUrlResponseSchema.parse(payload);
    },
  });
}

export function useSyncGithubInstallation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (installationId: string) => {
      const payload = await apiFetch<unknown>(
        `/api/github/installations/${encodeURIComponent(installationId)}/sync`,
        {
          method: "POST",
          timeoutMs: 60_000,
        }
      );
      return githubSyncResponseSchema.parse(payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: GITHUB_INSTALLATIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY }),
      ]);
    },
  });
}

export function useDeleteGithubInstallation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (installationId: string) => {
      const payload = await apiFetch<unknown>(
        `/api/github/installations/${encodeURIComponent(installationId)}`,
        {
          method: "DELETE",
        }
      );
      return githubDeleteResponseSchema.parse(payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: GITHUB_INSTALLATIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY }),
      ]);
    },
  });
}

