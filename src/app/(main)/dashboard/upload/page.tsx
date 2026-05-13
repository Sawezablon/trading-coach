import { TradeUploadForm } from "@/app/(main)/dashboard/upload/_components/trade-upload-form";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight">Log a trade</h1>
        <p className="text-muted-foreground text-sm">
          Upload a screenshot and journal the decision. TradeGuardian checks the entry against your rules.
        </p>
      </div>
      <TradeUploadForm />
    </div>
  );
}
