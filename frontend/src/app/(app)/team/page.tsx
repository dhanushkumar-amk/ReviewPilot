"use client";

import * as React from "react";
import { ShieldCheckIcon, UserPlusIcon, UsersIcon } from "lucide-react";

import { getUserInitials } from "@/components/auth/auth-user-provider";
import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/app-shell/stat-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatWorkspaceRole, useWorkspace } from "@/src/features/me/use-me";

export default function TeamPage() {
  const { user, activeWorkspace } = useWorkspace();

  const workspaceName = activeWorkspace?.name ?? "Personal workspace";
  const roleLabel = formatWorkspaceRole(activeWorkspace?.role);
  const displayName = user?.name ?? "User";
  const displayEmail = user?.email ?? "";
  const initials = getUserInitials(displayName, displayEmail);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team"
        description={`Members and workspace access roles for ${workspaceName}.`}
        actions={
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex cursor-not-allowed" tabIndex={0} />
                }
              >
                <Button type="button" disabled>
                  <UserPlusIcon data-icon="inline-start" />
                  Invite member
                </Button>
              </TooltipTrigger>
              <TooltipContent>Available in a future step</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Active members"
          value={user ? 1 : 0}
          description={`Member access scoped to ${workspaceName}`}
          icon={UsersIcon}
        />
        <StatCard
          title="Your role"
          value={roleLabel}
          description="Role enforced by server-side workspace membership"
          badge={{ label: "Verified", variant: "success" }}
        />
        <StatCard
          title="Pending invitations"
          value={0}
          description="Workspace invitations are not enabled yet"
          icon={ShieldCheckIcon}
        />
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Workspace directory</CardTitle>
          <CardDescription>
            Authenticated members belonging to {workspaceName}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {user ? (
                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={user.image ?? undefined}
                          alt={displayName}
                          referrerPolicy="no-referrer"
                        />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {displayName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {displayEmail}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">{roleLabel}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.emailVerified ? "success" : "secondary"}
                    >
                      {user.emailVerified ? "Verified" : "Pending verification"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No member records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
