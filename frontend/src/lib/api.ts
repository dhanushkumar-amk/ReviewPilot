import { env } from "./env";

const REQUEST_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor({
    status,
    code,
    message,
    requestId,
  }: {
    status: number;
    code: string;
    message: string;
    requestId?: string;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

interface ErrorBodyShape {
  error?: {
    code?: unknown;
    message?: unknown;
    requestId?: unknown;
  };
}

function buildUrl(path: string): string {
  const base = env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const externalSignal = init?.signal;
  const handleExternalAbort = () => {
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", handleExternalAbort, { once: true });
    }
  }

  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(buildUrl(path), {
      ...init,
      headers,
      credentials: "include",
      signal: controller.signal,
    });

    const headerRequestId = response.headers.get("x-request-id") ?? undefined;

    if (!response.ok) {
      let code = "API_ERROR";
      let message = response.statusText || `Request failed with status ${response.status}`;
      let requestId = headerRequestId;

      try {
        const body = (await response.json()) as ErrorBodyShape;
        if (typeof body?.error?.code === "string" && body.error.code.length > 0) {
          code = body.error.code;
        }
        if (typeof body?.error?.message === "string" && body.error.message.length > 0) {
          message = body.error.message;
        }
        if (typeof body?.error?.requestId === "string" && body.error.requestId.length > 0) {
          requestId = body.error.requestId;
        }
      } catch {
        // Non-JSON error response; keep status text fallback without logging body
      }

      throw new ApiError({
        status: response.status,
        code,
        message,
        requestId,
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
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
    externalSignal?.removeEventListener("abort", handleExternalAbort);
  }
}

