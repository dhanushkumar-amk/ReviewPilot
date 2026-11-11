"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { env } from "@/lib/env";

const REQUEST_TIMEOUT_MS = 10_000;

const healthSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  uptime: z.number(),
  time: z.string(),
  db: z.enum(["ok", "error"]),
  dbLatencyMs: z.number().optional(),
});

export type HealthResponse = z.infer<typeof healthSchema>;

async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const handleExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", handleExternalAbort, { once: true });
    }
  }

  try {
    const base = env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
    const response = await fetch(`${base}/health`, {
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    const requestId = response.headers.get("x-request-id") ?? undefined;

    if (response.ok || response.status === 503) {
      const data: unknown = await response.json();
      const parsed = healthSchema.safeParse(data);
      if (parsed.success) {
        return parsed.data;
      }
    }

    throw new ApiError({
      status: response.status,
      code: "API_ERROR",
      message: response.statusText || `Request failed with status ${response.status}`,
      requestId,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (timedOut) {
      throw new ApiError({
        status: 0,
        code: "TIMEOUT",
        message: "Request timed out while waiting for the API",
      });
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError({
        status: 0,
        code: "ABORTED",
        message: "Request was cancelled",
      });
    }

    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: error instanceof Error && error.message ? error.message : "Unable to reach the API",
    });
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", handleExternalAbort);
  }
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => fetchHealth(signal),
  });
}
