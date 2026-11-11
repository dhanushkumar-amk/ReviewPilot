"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  DownloadIcon,
  MailIcon,
  MoreHorizontalIcon,
  SearchIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/app-shell/stat-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MemberRole = "Owner" | "Admin" | "Developer" | "Security Lead";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: MemberRole;
  status: "active" | "invited";
  twoFactor: boolean;
  lastActive: string;
}

const initialMembers: TeamMember[] = [
  {
    id: "m-1",
    name: "Alex Rivera",
    email: "alex@reviewpilot.io",
    initials: "AR",
    role: "Owner",
    status: "active",
    twoFactor: true,
    lastActive: "Active now",
  },
  {
    id: "m-2",
    name: "Sarah Chen",
    email: "sarah.chen@reviewpilot.io",
    initials: "SC",
    role: "Admin",
    status: "active",
    twoFactor: true,
    lastActive: "14m ago",
  },
  {
    id: "m-3",
    name: "Marcus Vance",
    email: "m.vance@reviewpilot.io",
    initials: "MV",
    role: "Security Lead",
    status: "active",
    twoFactor: true,
    lastActive: "2h ago",
  },
  {
    id: "m-4",
    name: "Elena Rostova",
    email: "elena.r@reviewpilot.io",
    initials: "ER",
    role: "Developer",
    status: "active",
    twoFactor: true,
    lastActive: "Yesterday",
  },
  {
    id: "m-5",
    name: "David Kim",
    email: "david.k@reviewpilot.io",
    initials: "DK",
    role: "Developer",
    status: "active",
    twoFactor: true,
    lastActive: "3d ago",
  },
  {
    id: "m-6",
    name: "Jordan Hayes",
    email: "j.hayes@partner.dev",
    initials: "JH",
    role: "Developer",
    status: "invited",
    twoFactor: false,
    lastActive: "Invited 2d ago",
  },
];

const roleFilterItems = [
  { label: "All roles", value: "all" },
  { label: "Owner", value: "Owner" },
  { label: "Admin", value: "Admin" },
  { label: "Security Lead", value: "Security Lead" },
  { label: "Developer", value: "Developer" },
];

const inviteRoleItems = [
  { label: "Developer", value: "Developer" },
  { label: "Security Lead", value: "Security Lead" },
  { label: "Admin", value: "Admin" },
];

function initialsFromEmailOrName(name: string, email: string): string {
  const clean = name.trim();
  if (clean.includes(" ")) {
    const parts = clean.split(/\s+/);
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return (clean.slice(0, 2) || email.slice(0, 2)).toUpperCase();
}

export default function TeamPage() {
  const [members, setMembers] = React.useState<TeamMember[]>(initialMembers);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteName, setInviteName] = React.useState("");
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<MemberRole>("Developer");
  const [inviteError, setInviteError] = React.useState<string | null>(null);

  const [memberToRevoke, setMemberToRevoke] = React.useState<TeamMember | null>(
    null
  );

  const filteredMembers = members.filter((member) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query);
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const activeCount = members.filter((m) => m.status === "active").length;
  const invitedCount = members.filter((m) => m.status === "invited").length;
  const twoFactorCount = members.filter((m) => m.twoFactor).length;
  const twoFactorPct = members.length
    ? Math.round((twoFactorCount / members.length) * 100)
    : 100;

  const handleInviteSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    const name = inviteName.trim();
    if (!email || !email.includes("@")) {
      setInviteError("Enter a valid work email address.");
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === email)) {
      setInviteError("This email address is already in the workspace.");
      return;
    }
    const displayName = name || email.split("@")[0] || "New member";
    const created: TeamMember = {
      id: `m-${Date.now()}`,
      name: displayName,
      email,
      initials: initialsFromEmailOrName(displayName, email),
      role: inviteRole,
      status: "invited",
      twoFactor: false,
      lastActive: "Invited just now",
    };
    setMembers((prev) => [created, ...prev]);
    setInviteName("");
    setInviteEmail("");
    setInviteRole("Developer");
    setInviteError(null);
    setInviteOpen(false);
    toast.success(`Invitation sent to ${email}`);
  };

  const handleRoleUpdate = (memberId: string, nextRole: MemberRole) => {
    setMembers((prev) =>
      prev.map((member) =>
        member.id === memberId ? { ...member, role: nextRole } : member
      )
    );
    toast.success(`Updated role to ${nextRole}`);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard
      ?.writeText(email)
      .then(() => toast.success(`Copied ${email}`))
      .catch(() => toast.error("Clipboard access denied"));
  };

  const handleConfirmRevoke = () => {
    if (!memberToRevoke) return;
    setMembers((prev) => prev.filter((m) => m.id !== memberToRevoke.id));
    toast.success(`Revoked workspace access for ${memberToRevoke.name}`);
    setMemberToRevoke(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team"
        description="Manage organization seats, role-based access control, and security policies across ReviewPilot."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => toast.success("Exported team roster CSV")}
            >
              <DownloadIcon data-icon="inline-start" />
              Export CSV
            </Button>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger render={<Button />}>
                <UserPlusIcon data-icon="inline-start" />
                Invite member
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <form onSubmit={handleInviteSubmit} className="flex flex-col gap-4">
                  <DialogHeader>
                    <DialogTitle>Invite team member</DialogTitle>
                    <DialogDescription>
                      Send a workspace invitation and assign initial repository
                      review permissions.
                    </DialogDescription>
                  </DialogHeader>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="invite-name">Full name</FieldLabel>
                      <Input
                        id="invite-name"
                        placeholder="Priya Nair"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                      />
                    </Field>
                    <Field data-invalid={inviteError ? true : undefined}>
                      <FieldLabel htmlFor="invite-email">Work email</FieldLabel>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="priya@company.com"
                        value={inviteEmail}
                        onChange={(e) => {
                          setInviteEmail(e.target.value);
                          setInviteError(null);
                        }}
                        aria-invalid={inviteError ? true : undefined}
                      />
                      {inviteError ? (
                        <FieldError>{inviteError}</FieldError>
                      ) : (
                        <FieldDescription>
                          Single sign-on and 2FA enforcement apply automatically
                          on first login.
                        </FieldDescription>
                      )}
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="invite-role">Role</FieldLabel>
                      <Select
                        items={inviteRoleItems}
                        value={inviteRole}
                        onValueChange={(value) => {
                          if (value) setInviteRole(value as MemberRole);
                        }}
                      >
                        <SelectTrigger id="invite-role" className="w-full">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          <SelectGroup>
                            {inviteRoleItems.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldGroup>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setInviteOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Send invitation</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {/* Team Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total seats"
          value={
            <span>
              {members.length}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / 25
              </span>
            </span>
          }
          description={`${activeCount} active across 4 engineering pods`}
          icon={UsersIcon}
        />
        <StatCard
          title="Pending invites"
          value={invitedCount}
          description={
            invitedCount > 0
              ? "Awaiting initial email verification"
              : "All workspace invitations accepted"
          }
          icon={MailIcon}
        />
        <StatCard
          title="2FA enforcement"
          value={`${twoFactorPct}%`}
          description={`${twoFactorCount} of ${members.length} members verified with MFA`}
          badge={{ label: "SSO active", variant: "success" }}
        />
      </div>

      {/* Members Directory */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Workspace directory</CardTitle>
              <CardDescription>
                {filteredMembers.length} of {members.length} members shown
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <InputGroup className="w-full sm:w-64">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  placeholder="Search members or emails..."
                  aria-label="Search team members"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>

              <Select
                items={roleFilterItems}
                value={roleFilter}
                onValueChange={(value) => {
                  if (value) setRoleFilter(value);
                }}
              >
                <SelectTrigger className="w-40" aria-label="Filter by role">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {roleFilterItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No members match the current search or role filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          <AvatarFallback>{member.initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-foreground">
                            {member.name}
                          </span>
                          <span className="truncate font-mono text-xs text-muted-foreground">
                            {member.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.role === "Owner" ? "default" : "secondary"
                        }
                      >
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.status === "active" ? "success" : "outline"
                        }
                      >
                        {member.status === "active" ? "Active" : "Invited"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.twoFactor ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-success">
                          <ShieldCheckIcon className="size-3.5" />
                          <span>Enabled</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {member.lastActive}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${member.name}`}
                            />
                          }
                        >
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Permissions</DropdownMenuLabel>
                            {(
                              ["Admin", "Security Lead", "Developer"] as MemberRole[]
                            ).map((roleOption) => (
                              <DropdownMenuItem
                                key={roleOption}
                                disabled={member.role === "Owner"}
                                onClick={() =>
                                  handleRoleUpdate(member.id, roleOption)
                                }
                              >
                                <CheckIcon
                                  data-icon="inline-start"
                                  className={
                                    member.role === roleOption
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }
                                />
                                <span>Set as {roleOption}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onClick={() => handleCopyEmail(member.email)}
                            >
                              Copy email address
                            </DropdownMenuItem>
                            {member.role !== "Owner" ? (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setMemberToRevoke(member)}
                              >
                                Revoke access
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirm Revoke Access AlertDialog */}
      <AlertDialog
        open={Boolean(memberToRevoke)}
        onOpenChange={(open) => {
          if (!open) setMemberToRevoke(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke workspace access?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRevoke
                ? `${memberToRevoke.name} (${memberToRevoke.email}) will immediately lose access to ReviewPilot repositories and findings.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmRevoke}
            >
              Revoke access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
