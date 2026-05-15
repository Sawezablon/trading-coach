import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/downloads/QyvexEdgeSyncEA.mq5", request.url));
}
