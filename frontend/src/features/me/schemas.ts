import { z } from "zod";

export const workspaceSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  role: z.string(),
});

export const meUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  emailVerified: z.boolean(),
});

export const meResponseSchema = z.object({
  user: meUserSchema,
  activeWorkspace: workspaceSummarySchema.nullable(),
  workspaces: z.array(workspaceSummarySchema),
});

export type WorkspaceSummary = z.infer<typeof workspaceSummarySchema>;
export type MeUser = z.infer<typeof meUserSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;

export function formatWorkspaceRole(role?: string | null): string {
  const normalized = role?.trim().toLowerCase();
  if (!normalized) return "Member";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
