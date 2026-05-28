"use client";

import type React from "react";

import { Check, ClipboardList, MessageSquareDot } from "lucide-react";

import { createTeamTaskAction, updateTeamTaskStatusAction } from "@/app/(main)/dashboard/admin/tasks/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TeamTaskWithRelations } from "@/lib/data/team";
import type { FeedbackReport, TeamMember } from "@/lib/supabase/types";
import { teamTaskPriorities, teamTaskStatuses, teamTaskTypes } from "@/lib/team-constants";

export function TasksAdmin({
  feedback,
  members,
  tasks,
}: {
  feedback: FeedbackReport[];
  members: TeamMember[];
  tasks: TeamTaskWithRelations[];
}) {
  const openTasks = tasks.filter((task) => !["approved", "done"].includes(task.status)).length;
  const submittedTasks = tasks.filter((task) => task.status === "submitted").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-primary/25 bg-[radial-gradient(circle_at_top_left,rgb(94_234_212/0.16),transparent_32%),linear-gradient(135deg,rgb(23_24_28),rgb(10_10_11))] p-6">
        <div className="flex items-center gap-2 text-primary text-sm">
          <ClipboardList className="size-4" />
          Internal execution
        </div>
        <h1 className="mt-3 font-semibold text-4xl tracking-tight">Task command center</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
          Assign product work, connect it to user feedback, and approve submissions in one place.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MiniMetric label="Total tasks" value={tasks.length} />
          <MiniMetric label="Open work" value={openTasks} />
          <MiniMetric label="Waiting approval" value={submittedTasks} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create assignment</CardTitle>
            <CardDescription>Give work a clear owner, priority, deadline, and context.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createTeamTaskAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="Fix password reset callback" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Expected outcome, notes, acceptance criteria..."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Assignee" name="assigned_to">
                  <option value="">Unassigned</option>
                  {members
                    .filter((member) => member.status === "active")
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name ?? member.email}
                      </option>
                    ))}
                </SelectField>
                <SelectField label="Type" name="task_type">
                  {teamTaskTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </SelectField>
                <SelectField label="Priority" name="priority">
                  {teamTaskPriorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </SelectField>
                <div className="space-y-2">
                  <Label htmlFor="due_at">Due date</Label>
                  <Input id="due_at" name="due_at" type="datetime-local" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="related_feedback_id">Related feedback</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-secondary/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                  id="related_feedback_id"
                  name="related_feedback_id"
                >
                  <option value="">No feedback linked</option>
                  {feedback.map((report) => (
                    <option key={report.id} value={report.id}>
                      {report.type}: {report.title ?? report.message.slice(0, 60)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="page_url">Page URL</Label>
                <Input id="page_url" name="page_url" placeholder="Optional page or bug URL" />
              </div>
              <Button type="submit">Create task</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>Track ownership, progress, and submissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length ? (
              tasks.map((task) => <TaskCard key={task.id} task={task} />)
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground text-sm">
                No tasks yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: TeamTaskWithRelations }) {
  const latestSubmission = task.comments.find((comment) => comment.kind === "submission");

  return (
    <article className="rounded-2xl border bg-secondary/35 p-4 transition hover:border-primary/30 hover:bg-card/80">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{task.status.replaceAll("_", " ")}</Badge>
            <Badge variant="outline">{task.priority}</Badge>
            <Badge variant="secondary">{task.task_type}</Badge>
          </div>
          <h2 className="mt-3 truncate font-semibold text-base">{task.title}</h2>
          <div className="mt-2 text-muted-foreground text-xs">
            {task.assignee?.full_name ?? task.assignee?.email ?? "Unassigned"}
            {task.due_at ? ` - Due ${formatDate(task.due_at)}` : ""}
          </div>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">View</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{task.title}</DialogTitle>
              <DialogDescription>
                {task.assignee?.full_name ?? task.assignee?.email ?? "Unassigned"} - {task.priority} priority
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap gap-2">
              <Badge>{task.status.replaceAll("_", " ")}</Badge>
              <Badge variant="outline">{task.task_type}</Badge>
              {task.due_at ? <Badge variant="secondary">Due {formatDate(task.due_at)}</Badge> : null}
            </div>

            <section className="rounded-2xl border bg-secondary/35 p-4">
              <div className="font-medium text-sm">Description</div>
              <p className="mt-3 whitespace-pre-wrap text-muted-foreground text-sm leading-6">
                {task.description || "No description added."}
              </p>
            </section>

            {task.feedback ? (
              <section className="rounded-2xl border bg-background/35 p-4">
                <div className="flex items-center gap-2 text-primary text-xs">
                  <MessageSquareDot className="size-3.5" />
                  Linked feedback
                </div>
                <p className="mt-2 text-muted-foreground text-sm">{task.feedback.title ?? task.feedback.message}</p>
              </section>
            ) : null}

            {latestSubmission ? (
              <section className="rounded-2xl border border-[#22C55E]/20 bg-[#22C55E]/10 p-4">
                <div className="font-medium text-[#22C55E] text-sm">Latest submission</div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{latestSubmission.body}</p>
              </section>
            ) : null}

            {task.comments.length ? (
              <section className="space-y-2">
                <div className="font-medium text-sm">Activity</div>
                {task.comments.slice(0, 5).map((comment) => (
                  <div className="rounded-2xl border bg-secondary/35 p-3" key={comment.id}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium capitalize">{comment.kind}</span>
                      <span className="text-muted-foreground">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-muted-foreground text-sm">{comment.body}</p>
                  </div>
                ))}
              </section>
            ) : null}

            <section className="rounded-2xl border bg-secondary/35 p-4">
              <div className="mb-3 font-medium text-sm">Change status</div>
              <div className="flex flex-wrap gap-2">
                {teamTaskStatuses.map((status) => (
                  <form action={updateTeamTaskStatusAction} key={status}>
                    <input name="id" type="hidden" value={task.id} />
                    <input name="status" type="hidden" value={status} />
                    <Button disabled={task.status === status} size="sm" type="submit" variant="outline">
                      {task.status === status ? <Check className="size-3.5" /> : null}
                      {status.replaceAll("_", " ")}
                    </Button>
                  </form>
                ))}
              </div>
            </section>
          </DialogContent>
        </Dialog>
      </div>
    </article>
  );
}

function SelectField({ children, label, name }: { children: React.ReactNode; label: string; name: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        className="flex h-10 w-full rounded-xl border border-input bg-secondary/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
        id={name}
        name={name}
      >
        {children}
      </select>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-background/35 p-4">
      <div className="text-muted-foreground text-sm">{label}</div>
      <div className="mt-2 font-semibold text-3xl">{value}</div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
