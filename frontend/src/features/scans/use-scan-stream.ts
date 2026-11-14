"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SCANS_QUERY_KEY, type ScansResponse } from "./use-scans";

interface ScanStreamEvent {
  id: string;
  repositoryId: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";
  phase: string | null;
  progress: number;
  findingsCount: number;
  finishedAt: string | null;
}

export function useScanStream(options: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const eventSourceRef = React.useRef<EventSource | null>(null);

  React.useEffect(() => {
    if (!options.enabled || typeof window === "undefined") {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const es = new EventSource(`${apiUrl}/api/scans/stream`, {
      withCredentials: true,
    });
    eventSourceRef.current = es;

    es.addEventListener("scan", (event) => {
      try {
        const data = JSON.parse(event.data) as ScanStreamEvent;
        // Merge into TanStack Query scans cache
        queryClient.setQueriesData<ScansResponse>(
          { queryKey: SCANS_QUERY_KEY },
          (old) => {
            if (!old) return old;
            return {
              ...old,
              items: old.items.map((scan) => {
                if (scan.id === data.id) {
                  return {
                    ...scan,
                    status: data.status,
                    phase: data.phase,
                    progress: data.progress,
                    findingsCount: data.findingsCount,
                    finishedAt: data.finishedAt,
                  };
                }
                return scan;
              }),
            };
          },
        );

        // If completed or failed, invalidate both scans and findings
        if (data.status === "COMPLETED" || data.status === "FAILED") {
          queryClient.invalidateQueries({ queryKey: SCANS_QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: ["findings"] });
        }
      } catch {}
    });

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [options.enabled, queryClient]);
}

