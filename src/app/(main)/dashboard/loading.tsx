import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-12 w-full max-w-xl" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl lg:w-[340px]" />
      </div>

      <section className="rounded-3xl border bg-card p-6">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <Skeleton className="h-6 w-48 rounded-full" />
            <Skeleton className="h-24 w-56" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-12">
        <LoadingCard className="xl:col-span-5" />
        <LoadingCard className="xl:col-span-7" />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <LoadingCard className="xl:col-span-4" />
        <LoadingCard className="xl:col-span-4" />
        <LoadingCard className="xl:col-span-4" />
      </div>
    </div>
  );
}

function LoadingCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-56" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </CardContent>
    </Card>
  );
}
