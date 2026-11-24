import { NextResponse } from "next/server";
import { z } from "zod";
import { runWebPreflight } from "@/lib/preflight";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  target: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "target must be a 20-byte hex address"),
  calldata: z.string().max(20_000).optional(),
  skillHash: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const report = await runWebPreflight(parsed.data);
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Preflight failed: ${message}` },
      { status: 502 },
    );
  }
}
