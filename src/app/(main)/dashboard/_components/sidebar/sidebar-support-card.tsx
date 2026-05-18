import Link from "next/link";

import { siX } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { FeedbackActions } from "../feedback/feedback-actions";

export function SidebarSupportCard() {
  return (
    <Card size="sm" className="shadow-none group-data-[collapsible=icon]:hidden">
      <CardHeader className="gap-3 px-4">
        <div className="space-y-1">
          <CardTitle className="text-sm">Help improve Qyvex Edge</CardTitle>
          <CardDescription>Report issues or suggest what should be better in the next version.</CardDescription>
        </div>
        <FeedbackActions compact />
        <CardDescription>
          You can also reach us on&nbsp;
          <Link
            href="https://x.com/useqyvex"
            target="_blank"
            rel="noreferrer"
            aria-label="Reach out on X"
            className="inline-flex items-center text-foreground"
          >
            <SimpleIcon icon={siX} aria-hidden className="size-3 fill-current" />
          </Link>
          .
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
