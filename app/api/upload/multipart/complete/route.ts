import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  return NextResponse.json({
    ok: true,
    message: "Upload already completed client-side",
  })
}