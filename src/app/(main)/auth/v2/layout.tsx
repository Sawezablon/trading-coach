import type { ReactNode } from "react";

import { Separator } from "@/components/ui/separator";
import { APP_CONFIG } from "@/config/app-config";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="relative order-2 hidden h-full overflow-hidden rounded-3xl border bg-card lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(124_92_255/0.28),transparent_28rem),radial-gradient(circle_at_80%_80%,rgb(94_234_212/0.12),transparent_24rem)]" />
          <div className="absolute top-10 space-y-1 px-10 text-primary-foreground">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary-foreground text-primary">
              QE
            </div>
            <h1 className="font-medium text-2xl">{APP_CONFIG.name}</h1>
            <p className="text-xs opacity-80">by {APP_CONFIG.parentBrand}</p>
            <p className="text-sm">Stop breaking your own trading rules.</p>
          </div>

          <div className="absolute bottom-10 flex w-full justify-between px-10">
            <div className="flex-1 space-y-1 text-primary-foreground">
              <h2 className="font-medium">Discipline first</h2>
              <p className="text-sm">Journal trades, audit behavior, and review rule violations.</p>
            </div>
            <Separator orientation="vertical" className="mx-3 h-auto!" />
            <div className="flex-1 space-y-1 text-primary-foreground">
              <h2 className="font-medium">No signals</h2>
              <p className="text-sm">Qyvex Edge coaches execution quality without predicting markets.</p>
            </div>
          </div>
        </div>
        <div className="relative order-1 flex h-full">
          {children}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-muted-foreground text-xs">by Qyvex</div>
        </div>
      </div>
    </main>
  );
}
