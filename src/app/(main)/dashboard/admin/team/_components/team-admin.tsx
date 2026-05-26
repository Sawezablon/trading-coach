"use client";

import { Check, CircleUser, ShieldCheck } from "lucide-react";

import { updateTeamMemberStatusAction, upsertTeamMemberAction } from "@/app/(main)/dashboard/admin/team/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TeamMember } from "@/lib/supabase/types";
import { teamRoles } from "@/lib/team-constants";

export function TeamAdmin({ members }: { members: TeamMember[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-primary/25 bg-[radial-gradient(circle_at_top_left,rgb(124_92_255/0.2),transparent_35%),linear-gradient(135deg,rgb(23_24_28),rgb(10_10_11))] p-6">
        <div className="flex items-center gap-2 text-primary text-sm">
          <ShieldCheck className="size-4" />
          Owner operations
        </div>
        <h1 className="mt-3 font-semibold text-4xl tracking-tight">Team control</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
          Add hired users, define roles, and keep internal work separate from trader accounts.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Add team member</CardTitle>
            <CardDescription>Use the same email they use to log into Qyvex Edge.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={upsertTeamMemberAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" placeholder="person@company.com" required type="email" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Name</Label>
                  <Input id="full_name" name="full_name" placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_title">Job title</Label>
                  <Input id="job_title" name="job_title" placeholder="QA, Developer, Support..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-secondary/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                  defaultValue="staff"
                  id="role"
                  name="role"
                >
                  {teamRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit">Add member</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team directory</CardTitle>
            <CardDescription>{members.length} internal member records.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {members.length ? (
              members.map((member) => <MemberCard key={member.id} member={member} />)
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground text-sm">
                No team members yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <article className="rounded-2xl border bg-secondary/35 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CircleUser className="size-4 text-primary" />
            <h2 className="font-semibold">{member.full_name ?? member.email}</h2>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">{member.email}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{member.role}</Badge>
            <Badge variant="outline">{member.status}</Badge>
            {member.job_title ? <Badge variant="secondary">{member.job_title}</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["active", "inactive", "invited"] as const).map((status) => (
            <form action={updateTeamMemberStatusAction} key={status}>
              <input name="id" type="hidden" value={member.id} />
              <input name="status" type="hidden" value={status} />
              <Button disabled={member.status === status} size="sm" type="submit" variant="outline">
                {member.status === status ? <Check className="size-3.5" /> : null}
                {status}
              </Button>
            </form>
          ))}
        </div>
      </div>
    </article>
  );
}
