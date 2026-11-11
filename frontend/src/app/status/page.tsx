"use client";

import { RefreshCwIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useHealth } from "@/features/health/use-health";
import { ApiError } from "@/lib/api";

function formatUptime(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const secs = wholeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export default function StatusPage() {
  const { data, error, isPending, isFetching, refetch } = useHealth();

  const requestId = error instanceof ApiError ? error.requestId : undefined;
  const errorMessage =
    error instanceof Error && error.message
      ? error.message
      : "Unable to reach the API server";

  return (
    <main className="light flex min-h-screen items-center justify-center bg-background p-6 text-sm text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>API status</CardTitle>
          <CardDescription>
            Live health check for the ReviewPilot backend and database.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : error ? (
            <div className="flex flex-col gap-3">
              <Badge variant="destructive">API is unreachable</Badge>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              {requestId ? (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Request ID</span>
                  <span className="font-mono text-foreground">{requestId}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {data.status === "ok" ? (
                  <Badge variant="success">API is healthy</Badge>
                ) : (
                  <Badge variant="outline">API is degraded</Badge>
                )}
                {data.db === "ok" ? (
                  <Badge variant="success">
                    Database connected
                    {typeof data.dbLatencyMs === "number"
                      ? ` (${data.dbLatencyMs} ms)`
                      : ""}
                  </Badge>
                ) : (
                  <Badge variant="destructive">Database error</Badge>
                )}
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Database</span>
                  <span className="font-mono text-foreground">
                    {data.db === "ok"
                      ? typeof data.dbLatencyMs === "number"
                        ? `Connected (${data.dbLatencyMs} ms)`
                        : "Connected"
                      : "Error"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-mono text-foreground">
                    {formatUptime(data.uptime)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-mono text-foreground">{data.time}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void refetch();
            }}
            disabled={isFetching}
          >
            {isFetching ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <RefreshCwIcon data-icon="inline-start" />
            )}
            Check again
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
