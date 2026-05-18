"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { CircleAlert, MessageSquareDot, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { submitFeedbackAction } from "@/app/(main)/dashboard/feedback/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FeedbackKind = "bug" | "improvement";

type BrowserContext = {
  pageUrl: string;
  userAgent: string;
  language: string;
  viewportWidth: number;
  viewportHeight: number;
};

const categories = [
  { value: "mt5_sync", label: "MT5 sync" },
  { value: "auth", label: "Login or signup" },
  { value: "dashboard", label: "Dashboard" },
  { value: "journal", label: "Journal" },
  { value: "trade_upload", label: "Trade logging" },
  { value: "rules", label: "Rules or checklist" },
  { value: "performance", label: "Performance analytics" },
  { value: "design", label: "Design or usability" },
  { value: "other", label: "Other" },
];

const severities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "blocking", label: "Blocking" },
];

function getBrowserContext(): BrowserContext {
  if (typeof window === "undefined") {
    return {
      pageUrl: "",
      userAgent: "",
      language: "",
      viewportWidth: 0,
      viewportHeight: 0,
    };
  }

  return {
    pageUrl: window.location.href,
    userAgent: window.navigator.userAgent,
    language: window.navigator.language,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}

export function FeedbackActions({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [state, formAction, pending] = useActionState(submitFeedbackAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [context, setContext] = useState<BrowserContext>({
    pageUrl: "",
    userAgent: "",
    language: "",
    viewportWidth: 0,
    viewportHeight: 0,
  });

  useEffect(() => {
    function handleResize() {
      setContext(getBrowserContext());
    }

    setContext(getBrowserContext());
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (state.message) {
      toast.success(state.message);
      formRef.current?.reset();
      setOpen(false);
    }

    if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  function openFeedbackDialog(nextKind: FeedbackKind) {
    setContext(getBrowserContext());
    setKind(nextKind);
    setOpen(true);
  }

  const dialogCopy =
    kind === "bug"
      ? {
          title: "Report an issue",
          description: "Tell us what broke, what page you were on, and what you expected to happen.",
          messageLabel: "What happened?",
          placeholder: "Example: MT5 says synced, but the dashboard still shows zero trades.",
          submit: "Send issue",
        }
      : {
          title: "Suggest an improvement",
          description: "Tell us what would make Qyvex Edge more useful for your trading workflow.",
          messageLabel: "What should we improve or add?",
          placeholder: "Example: I want a monthly review card for my prop firm challenge rules.",
          submit: "Send idea",
        };

  return (
    <>
      <div className={cn("flex gap-2", compact ? "flex-col" : "flex-wrap", className)}>
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "default"}
          className={compact ? "justify-start" : undefined}
          onClick={() => openFeedbackDialog("bug")}
        >
          <CircleAlert />
          Report issue
        </Button>
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "default"}
          className={compact ? "justify-start" : undefined}
          onClick={() => openFeedbackDialog("improvement")}
        >
          <Sparkles />
          Suggest idea
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogCopy.title}</DialogTitle>
            <DialogDescription>{dialogCopy.description}</DialogDescription>
          </DialogHeader>

          <form key={kind} ref={formRef} action={formAction} className="space-y-4">
            <input type="hidden" name="type" value={kind} />
            <input type="hidden" name="page_url" value={context.pageUrl} />
            <input type="hidden" name="user_agent" value={context.userAgent} />
            <input type="hidden" name="browser_language" value={context.language} />
            <input type="hidden" name="viewport_width" value={context.viewportWidth} />
            <input type="hidden" name="viewport_height" value={context.viewportHeight} />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="feedback-category">Area</Label>
                <select
                  id="feedback-category"
                  name="category"
                  defaultValue={kind === "bug" ? "dashboard" : "design"}
                  className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-severity">Priority</Label>
                <select
                  id="feedback-severity"
                  name="severity"
                  defaultValue={kind === "bug" ? "high" : "medium"}
                  className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30"
                >
                  {severities.map((severity) => (
                    <option key={severity.value} value={severity.value}>
                      {severity.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-title">Short title</Label>
              <Input id="feedback-title" name="title" placeholder="Optional, but helpful" maxLength={120} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-message">{dialogCopy.messageLabel}</Label>
              <Textarea
                id="feedback-message"
                name="message"
                required
                minLength={10}
                maxLength={4000}
                placeholder={dialogCopy.placeholder}
                className="min-h-32"
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                <MessageSquareDot />
                {pending ? "Sending..." : dialogCopy.submit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
