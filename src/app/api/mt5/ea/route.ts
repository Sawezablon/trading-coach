import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const eaPath = path.join(process.cwd(), "mt5", "QyvexEdgeSyncEA.mq5");
  const source = await readFile(eaPath, "utf8");

  return new Response(source, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Content-Disposition": 'attachment; filename="QyvexEdgeSyncEA.mq5"',
      "Content-Type": "text/plain; charset=utf-8",
      Pragma: "no-cache",
    },
  });
}
