"use client";

import * as React from "react";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

const AuthUserContext = React.createContext<AuthenticatedUser | null>(null);

export function AuthUserProvider({
  user,
  children,
}: {
  user: AuthenticatedUser;
  children: React.ReactNode;
}) {
  return <AuthUserContext.Provider value={user}>{children}</AuthUserContext.Provider>;
}

export function useInitialAuthUser(): AuthenticatedUser | null {
  return React.useContext(AuthUserContext);
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
