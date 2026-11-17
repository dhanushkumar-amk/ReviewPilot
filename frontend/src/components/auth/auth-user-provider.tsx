"use client";

import * as React from "react";
import { MeInitialContext, type MeResponse, type MeUser } from "@/src/features/me/use-me";

export type AuthenticatedUser = MeUser;

export function AuthUserProvider({
  initialMe,
  children,
}: {
  initialMe: MeResponse;
  children: React.ReactNode;
}) {
  return (
    <MeInitialContext.Provider value={initialMe}>
      {children}
    </MeInitialContext.Provider>
  );
}

export function useInitialAuthUser(): AuthenticatedUser | null {
  const initialMe = React.useContext(MeInitialContext);
  return initialMe?.user ?? null;
}

export function getUserInitials(name?: string | null, email?: string | null): string {
  const cleaned = name?.trim();
  if (cleaned) {
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return cleaned.slice(0, 2).toUpperCase();
  }

  const emailChar = email?.trim()?.[0];
  return emailChar ? emailChar.toUpperCase() : "U";
}
