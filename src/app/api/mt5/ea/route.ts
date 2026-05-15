import { NextResponse } from "next/server";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const file = await readFile(join(process.cwd(), "mt5", "QyvexEdgeSyncEA.mq5"), "utf8");

  return new NextResponse(file, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": 'attachment; filename="QyvexEdgeSyncEA.mq5"',
    },
  });
}
