"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/src/lib/api";
import { authClient } from "@/src/lib/auth-client";
import {
  meResponseSchema,
  type MeResponse,
} from "./schemas";

export {
  formatWorkspaceRole,
  meResponseSchema,
  meUserSchema,
  workspaceSummarySchema,
  type MeResponse,
  type MeUser,
  type WorkspaceSummary,
} from "./schemas";

export const ME_QUERY_KEY = ["me"] as const;

export const MeInitialContext = React.createContext<MeResponse | null>(null);

export async function fetchMe(signal?: AbortSignal): Promise<MeResponse> {
  const payload = await apiFetch<unknown>("/api/me", { signal });
  return meResponseSchema.parse(payload);
}

export function useMe(
  options?: Omit<UseQueryOptions<MeResponse, Error>, "queryKey" | "queryFn">
) {
  const initialMe = React.useContext(MeInitialContext);

  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: ({ signal }) => fetchMe(signal),
    initialData: initialMe ?? undefined,
    ...options,
  });
}

export function useWorkspace() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const meQuery = useMe();
  const [isSwitching, setIsSwitching] = React.useState(false);

  const switchWorkspace = React.useCallback(
    async (organizationId: string) => {
      if (isSwitching || organizationId === meQuery.data?.activeWorkspace?.id) {
        return;
      }

      setIsSwitching(true);
      try {
        const { error } = await authClient.organization.setActive({
          organizationId,
        });

        if (error) {
          toast.error(error.message || "Unable to switch workspace.");
          return;
        }

        await queryClient.invalidateQueries();
        router.refresh();
      } catch {
        toast.error("Unable to switch workspace right now.");
      } finally {
        setIsSwitching(false);
      }
    },
    [isSwitching, meQuery.data?.activeWorkspace?.id, queryClient, router]
  );

  return {
    me: meQuery.data ?? null,
    user: meQuery.data?.user ?? null,
    activeWorkspace: meQuery.data?.activeWorkspace ?? null,
    workspaces: meQuery.data?.workspaces ?? [],
    isLoading: meQuery.isLoading,
    isFetching: meQuery.isFetching,
    error: meQuery.error ?? null,
    isSwitching,
    switchWorkspace,
    refetch: meQuery.refetch,
  };
}
