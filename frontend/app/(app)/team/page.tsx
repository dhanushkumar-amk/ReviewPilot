"use client";

import * as React from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  UserPlusIcon,
  SearchIcon,
  MoreHorizontalIcon,
  ShieldCheckIcon,
  DownloadIcon,
  UsersIcon,
  MailIcon,
  CheckIcon,
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: "Owner" | "Admin" | "Developer" | "Security Lead";
  status: "active" | "invited";
  twoFactor: boolean;
  lastActive: string;
}

const TEAM_MEMBERS: TeamMember[] = [
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

export default function TeamPage() {
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");

  const filteredMembers = TEAM_MEMBERS.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        title="Team"
        description="Manage team members, roles, seat allocations, and invited reviewers."
        showTabs={false}
        actions={
          <Button variant="default" size="sm" className="font-medium cursor-pointer">
            <UserPlusIcon data-icon="inline-start" />
            <span>Invite member</span>
          </Button>
        }
      />

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-lg border border-border bg-card p-5 shadow-none">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Team seats</span>
            <UsersIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">
            6 / 10
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            4 seats available on Enterprise tier
          </p>
        </Card>

        <Card className="rounded-lg border border-border bg-card p-5 shadow-none">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Pending invites</span>
            <MailIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">
            1
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Invitation expires in 5 days
          </p>
        </Card>

        <Card className="rounded-lg border border-border bg-card p-5 shadow-none">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">2FA Enforcement</span>
            <ShieldCheckIcon className="size-4 text-success" />
          </div>
          <div className="text-2xl font-semibold tracking-tight text-success">
            Mandatory
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            SSO & security policies enforced
          </p>
        </Card>
      </div>

      {/* Members Table Card */}
      <Card className="rounded-lg border border-border bg-card shadow-none">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search members by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
                aria-label="Search members"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Role Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="h-8 px-2.5 text-xs font-medium border border-border rounded-md bg-card hover:bg-muted transition-colors inline-flex items-center gap-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Filter by role"
              >
                <span>Role: {roleFilter === "all" ? "All" : roleFilter}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuGroup>
                  {["all", "Owner", "Admin", "Developer", "Security Lead"].map((r) => (
                    <DropdownMenuItem
                      key={r}
                      onClick={() => setRoleFilter(r)}
                      className="cursor-pointer text-xs flex items-center justify-between"
                    >
                      <span>{r === "all" ? "All roles" : r}</span>
                      {roleFilter === r && <CheckIcon className="size-3.5" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export Button */}
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <DownloadIcon data-icon="inline-start" />
              <span>Export</span>
            </Button>
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-4">
                  Member
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-4">
                  Role
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-4">
                  Status
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-4">
                  2FA
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10 px-4">
                  Last active
                </TableHead>
                <TableHead className="h-10 w-12 px-4" aria-label="Row actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow
                  key={member.id}
                  className="h-12 border-b border-border hover:bg-muted/40 transition-colors"
                >
                  {/* Member Name + Email */}
                  <TableCell className="px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-7 shrink-0 text-[11px] font-semibold">
                        <AvatarFallback>{member.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 leading-tight">
                        <span className="text-xs font-medium text-foreground truncate">
                          {member.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {member.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Role Badge */}
                  <TableCell className="px-4">
                    <Badge
                      variant={member.role === "Owner" ? "default" : "secondary"}
                      className="text-[10px] font-medium px-2 py-0.5"
                    >
                      {member.role}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="px-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`size-1.5 rounded-full shrink-0 ${
                          member.status === "active" ? "bg-success" : "bg-warning"
                        }`}
                      />
                      <span className="text-xs capitalize text-foreground">
                        {member.status}
                      </span>
                    </div>
                  </TableCell>

                  {/* 2FA */}
                  <TableCell className="px-4">
                    {member.twoFactor ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <ShieldCheckIcon className="size-3.5 text-success" />
                        <span>Enabled</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Pending</span>
                    )}
                  </TableCell>

                  {/* Last active */}
                  <TableCell className="px-4 text-xs text-muted-foreground font-mono">
                    {member.lastActive}
                  </TableCell>

                  {/* Row Actions */}
                  <TableCell className="px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex size-7 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors outline-none cursor-pointer"
                        aria-label={`Actions for ${member.name}`}
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuGroup>
                          <DropdownMenuItem className="cursor-pointer text-xs">
                            Edit permissions
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-xs">
                            Copy email
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        {member.role !== "Owner" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                variant="destructive"
                                className="cursor-pointer text-xs"
                              >
                                Revoke access
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

