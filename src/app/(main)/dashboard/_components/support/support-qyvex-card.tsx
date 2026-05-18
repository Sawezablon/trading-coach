"use client";

import Link from "next/link";

import { ArrowRight, Coffee } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const supportUrl = "https://www.paypal.com/donate/?hosted_button_id=YXGFSPPGWUVPY";

export function SupportQyvexCard({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-cyan-400/15 bg-[linear-gradient(145deg,rgb(18_20_30/0.92),rgb(10_10_11/0.98)_58%,rgb(12_32_36/0.72))] shadow-[0_18px_60px_rgb(0_0_0/0.28)] transition-all duration-300 hover:border-cyan-300/30 hover:shadow-[0_24px_70px_rgb(34_211_238/0.12)]",
        compact ? "p-4" : "p-5 sm:p-6",
        className,
      )}
    >
      <div className="absolute -top-14 -right-12 size-36 rounded-full bg-cyan-400/10 blur-3xl transition-opacity duration-300 group-hover:opacity-90" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent opacity-70" />

      <div
        className={cn(
          "relative flex gap-3",
          compact ? "flex-col" : "flex-col sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-[0_0_28px_rgb(94_234_212/0.14)] transition duration-300 group-hover:border-cyan-300/35 group-hover:bg-cyan-300/15">
            <Coffee className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className={cn("font-semibold tracking-tight", compact ? "text-sm" : "text-lg")}>
              Fuel Qyvex Development
            </h2>
            <p className={cn("text-muted-foreground leading-relaxed", compact ? "text-xs" : "max-w-xl text-sm")}>
              Support AI trading discipline tools and future development.
            </p>
          </div>
        </div>

        <Button
          asChild
          size={compact ? "sm" : "default"}
          className={cn(
            "relative bg-cyan-300 text-black shadow-[0_14px_34px_rgb(94_234_212/0.16)] hover:bg-cyan-200 hover:shadow-[0_18px_46px_rgb(94_234_212/0.24)]",
            compact ? "w-full" : "w-full sm:w-auto",
          )}
        >
          <Link href={supportUrl} target="_blank" rel="noreferrer">
            Support Qyvex
            <ArrowRight
              className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </Button>
      </div>
    </section>
  );
}
