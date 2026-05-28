"use client";

import { ClipboardList } from "lucide-react";

import { submitTeamTaskUpdateAction } from "@/app/(main)/dashboard/admin/tasks/actions";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TeamTaskWithRelations } from "@/lib/data/team";
import { teamTaskStatuses } from "@/lib/team-constants";

export function MyWork({ tasks }: { tasks: TeamTaskWithRelations[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-primary/25 bg-[radial-gradient(circle_at_top_left,rgb(124_92_255/0.2),transparent_35%),linear-gradient(135deg,rgb(23_24_28),rgb(10_10_11))] p-6">
        <div className="flex items-center gap-2 text-primary text-sm">
          <ClipboardList className="size-4" />
          Staff workbench
        </div>
        <h1 className="mt-3 font-semibold text-4xl tracking-tight">My work</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
          See assigned Qyvex work, submit progress, and request approval when work is ready.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned tasks</CardTitle>
          <CardDescription>{tasks.length} task records assigned to your team account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasks.length ? (
            tasks.map((task) => <WorkTaskCard key={task.id} task={task} />)
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <div className="font-semibold">No assigned work yet</div>
              <p className="mt-2 text-muted-foreground text-sm">
                Your tasks will appear here after an admin assigns them.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WorkTaskCard({ task }: { task: TeamTaskWithRelations }) {
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
          {task.due_at ? <div className="mt-2 text-muted-foreground text-xs">Due {formatDate(task.due_at)}</div> : null}
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">View</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{task.title}</DialogTitle>
              <DialogDescription>
                {task.priority} priority - {task.status.replaceAll("_", " ")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap gap-2">
              <Badge>{task.status.replaceAll("_", " ")}</Badge>
              <Badge variant="outline">{task.task_type}</Badge>
              {task.due_at ? <Badge variant="secondary">Due {formatDate(task.due_at)}</Badge> : null}
            </div>

            <section className="rounded-2xl border bg-secondary/35 p-4">
              <div className="font-medium text-sm">Assignment</div>
              <p className="mt-3 whitespace-pre-wrap text-muted-foreground text-sm leading-6">
                {task.description || "No description added."}
              </p>
            </section>

            {task.comments.length ? (
              <section className="space-y-2">
                <div className="font-medium text-sm">Recent updates</div>
                {task.comments.slice(0, 5).map((comment) => (
                  <div className="rounded-2xl border bg-background/35 p-3" key={comment.id}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium capitalize">{comment.kind}</span>
                      <span className="text-muted-foreground">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-muted-foreground text-sm">{comment.body}</p>
                  </div>
                ))}
              </section>
            ) : null}

            <form action={submitTeamTaskUpdateAction} className="space-y-3 rounded-2xl border bg-background/35 p-4">
              <input name="id" type="hidden" value={task.id} />
              <div className="space-y-2">
                <Label htmlFor={`body-${task.id}`}>Work update</Label>
                <Textarea
                  id={`body-${task.id}`}
                  name="body"
                  placeholder="What changed, what is blocked, or what should be reviewed?"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`status-${task.id}`}>New status</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-secondary/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                  defaultValue={task.status === "todo" ? "in_progress" : task.status}
                  id={`status-${task.id}`}
                  name="status"
                >
                  {teamTaskStatuses
                    .filter((status) => !["approved", "done"].includes(status))
                    .map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                </select>
              </div>
              <Button type="submit">Submit update</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
