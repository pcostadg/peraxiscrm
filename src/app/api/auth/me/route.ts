import { NextResponse } from "next/server"
import { requireApiUser } from "@/app/api/_shared"

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response
  return NextResponse.json({ user })
}
