"use client";

import { useCallback, useEffect, useState } from "react";
import { MoreHorizontal, Shield, ShieldCheck, Crown, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api-client";

// ── Types ──────────────────────────────────────────────

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

interface TeamInfo {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface MembersResponse {
  members: TeamMember[];
  total: number;
}

// ── Helpers ────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline"; icon: typeof Crown }> = {
  owner: { label: "Owner", variant: "default", icon: Crown },
  admin: { label: "Admin", variant: "secondary", icon: ShieldCheck },
  member: { label: "Member", variant: "outline", icon: Shield },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Page ───────────────────────────────────────────────

export default function TeamPage() {
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  // Confirm dialog (role change / remove)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "role" | "remove";
    memberId: string;
    memberName: string;
    newRole?: string;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [teamData, membersData, me] = await Promise.all([
        api.get<TeamInfo>("/api/team"),
        api.get<MembersResponse>("/api/team/members"),
        api.get<{ id: string; role: string }>("/api/auth/me"),
      ]);
      setTeam(teamData);
      setMembers(membersData.members);
      setCurrentUserId(me.id);
      setCurrentUserRole(me.role);
    } catch {
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Invite ─────────────────────────────────────────

  async function handleInvite() {
    setInviting(true);
    try {
      await api.post("/api/team/members", {
        email: inviteEmail,
        full_name: inviteName,
        password: invitePassword,
        role: inviteRole,
      });
      toast.success(`Invited ${inviteEmail} to the team`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInvitePassword("");
      setInviteRole("member");
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to invite member";
      toast.error(message);
    } finally {
      setInviting(false);
    }
  }

  // ── Role change / Remove ───────────────────────────

  function requestRoleChange(member: TeamMember, newRole: string) {
    setConfirmAction({
      type: "role",
      memberId: member.id,
      memberName: member.full_name,
      newRole,
    });
    setConfirmOpen(true);
  }

  function requestRemove(member: TeamMember) {
    setConfirmAction({
      type: "remove",
      memberId: member.id,
      memberName: member.full_name,
    });
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (!confirmAction) return;
    setConfirming(true);
    try {
      if (confirmAction.type === "role") {
        await api.put(`/api/team/members/${confirmAction.memberId}/role`, {
          role: confirmAction.newRole,
        });
        toast.success(`Changed ${confirmAction.memberName}'s role to ${confirmAction.newRole}`);
      } else {
        await api.delete(`/api/team/members/${confirmAction.memberId}`);
        toast.success(`Removed ${confirmAction.memberName} from the team`);
      }
      setConfirmOpen(false);
      setConfirmAction(null);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Action failed";
      toast.error(message);
    } finally {
      setConfirming(false);
    }
  }

  // ── Permissions ────────────────────────────────────

  const canInvite = currentUserRole === "owner" || currentUserRole === "admin";
  const canManage = currentUserRole === "owner";

  // ── Render ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="rounded-md border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {team?.name ?? "Team"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>

        {canInvite && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Create an account for a new team member. They can change their
                  password after logging in.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Full Name</Label>
                  <Input
                    id="invite-name"
                    placeholder="Jane Smith"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="jane@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-password">Temporary Password</Label>
                  <Input
                    id="invite-password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <select
                    id="invite-role"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={!inviteEmail || !inviteName || !invitePassword || invitePassword.length < 8 || inviting}
                >
                  {inviting ? "Inviting..." : "Send Invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Members table */}
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No team members</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite colleagues to collaborate on contract reviews.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {canManage && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isCurrentUser = member.id === currentUserId;
                const roleConfig = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.member;
                const RoleIcon = roleConfig.icon;

                return (
                  <TableRow
                    key={member.id}
                    className={isCurrentUser ? "bg-slate-50" : undefined}
                  >
                    <TableCell className="font-medium">
                      {member.full_name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (You)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleConfig.variant} className="gap-1">
                        <RoleIcon className="h-3 w-3" />
                        {roleConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(member.created_at)}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        {!isCurrentUser && member.role !== "owner" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {member.role !== "admin" && (
                                <DropdownMenuItem
                                  onClick={() => requestRoleChange(member, "admin")}
                                >
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  Make Admin
                                </DropdownMenuItem>
                              )}
                              {member.role !== "member" && (
                                <DropdownMenuItem
                                  onClick={() => requestRoleChange(member, "member")}
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  Make Member
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => requestRemove(member)}
                              >
                                Remove from Team
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Only-you empty state (when there's just one member — you) */}
      {members.length === 1 && members[0].id === currentUserId && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            You&apos;re the only team member. Invite colleagues to collaborate
            on contract reviews.
          </p>
        </div>
      )}

      {/* Confirm dialog for role change / remove */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "role"
                ? "Change Role"
                : "Remove Member"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "role"
                ? `Change ${confirmAction.memberName}'s role to ${confirmAction.newRole}?`
                : `Remove ${confirmAction?.memberName} from the team? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction?.type === "remove" ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={confirming}
            >
              {confirming
                ? "Processing..."
                : confirmAction?.type === "role"
                  ? "Change Role"
                  : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
