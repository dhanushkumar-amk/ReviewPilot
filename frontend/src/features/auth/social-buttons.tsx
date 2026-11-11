"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/src/lib/api";
import { authClient } from "@/src/lib/auth-client";
import { env } from "@/src/lib/env";
import { getSafeRedirectPath } from "@/src/lib/safe-redirect";

interface AuthProvidersResponse {
  google: boolean;
  github: boolean;
}

type SocialProviderId = "google" | "github";

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
    >
      <path
        d="M21.805 12.23c0-.68-.061-1.333-.174-1.96H12v3.71h5.499a4.7 4.7 0 0 1-2.039 3.084v2.562h3.3c1.93-1.777 3.045-4.395 3.045-7.396Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.757 0 5.069-.914 6.759-2.374l-3.3-2.562c-.914.613-2.083.975-3.459.975-2.66 0-4.913-1.797-5.718-4.212H2.87v2.643A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.282 13.827A6.012 6.012 0 0 1 5.97 12c0-.634.11-1.25.312-1.827V7.53H2.87A10.002 10.002 0 0 0 2 12c0 1.613.386 3.14 1.07 4.47l3.212-2.643Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.961c1.499 0 2.845.515 3.903 1.527l2.929-2.929C17.065 2.91 14.753 2 12 2a10 10 0 0 0-8.93 5.53l3.212 2.643C7.087 7.758 9.34 5.961 12 5.961Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 shrink-0 fill-current"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}

export function SocialButtons({
  nextPath,
  disabled = false,
}: {
  nextPath?: string | null;
  disabled?: boolean;
}) {
  const [pendingProvider, setPendingProvider] = React.useState<SocialProviderId | null>(
    null
  );

  const { data: providers } = useQuery({
    queryKey: ["auth-providers"],
    queryFn: () => apiFetch<AuthProvidersResponse>("/api/auth-providers"),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const googleEnabled = providers?.google === true;
  const githubEnabled = providers?.github === true;

  if (!googleEnabled && !githubEnabled) {
    return null;
  }

  const handleSocialSignIn = async (provider: SocialProviderId) => {
    if (pendingProvider || disabled) {
      return;
    }

    setPendingProvider(provider);

    const webBase = env.NEXT_PUBLIC_WEB_URL.replace(/\/+$/, "");
    const safeNext = getSafeRedirectPath(nextPath);

    try {
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: `${webBase}${safeNext}`,
        errorCallbackURL: `${webBase}/login`,
        newUserCallbackURL: `${webBase}/dashboard`,
      });

      if (error) {
        toast.error("Unable to start social sign-in right now. Please try again.");
        setPendingProvider(null);
      }
    } catch {
      toast.error("Unable to start social sign-in right now. Please try again.");
      setPendingProvider(null);
    }
  };

  const isBusy = pendingProvider !== null || disabled;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {googleEnabled ? (
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full"
            disabled={isBusy}
            onClick={() => handleSocialSignIn("google")}
          >
            {pendingProvider === "google" ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <GoogleMark />
            )}
            <span>Continue with Google</span>
          </Button>
        ) : null}

        {githubEnabled ? (
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full"
            disabled={isBusy}
            onClick={() => handleSocialSignIn("github")}
          >
            {pendingProvider === "github" ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <GitHubMark />
            )}
            <span>Continue with GitHub</span>
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="shrink-0 text-xs text-muted-foreground">
          or continue with email
        </span>
        <Separator className="flex-1" />
      </div>
    </div>
  );
}

