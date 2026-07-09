import { NextResponse } from "next/server"
import { accepted, ok, requireApiUser } from "@/app/api/_shared"
import { createAppUser, deleteAppUser, listAppUsers, updateAppUser } from "@/services/crm-repository"

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response
  if (user?.role !== "admin") return NextResponse.json({ error: "Permissao negada." }, { status: 403 })
  return ok(await listAppUsers())
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response
  if (user?.role !== "admin") return NextResponse.json({ error: "Permissao negada." }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { name?: string; email?: string; phone?: string; cargo?: string; role?: "admin" | "funcionario"; status?: "ativo" | "inativo" }
  if (!body.name || !body.email) return NextResponse.json({ error: "Nome e email sao obrigatorios." }, { status: 400 })
  const data = await createAppUser({
    name: body.name,
    email: body.email,
    phone: body.phone,
    cargo: body.cargo,
    role: body.role ?? "funcionario",
    status: body.status ?? "ativo",
  })
  return accepted("Usuario de equipe salvo.", { data })
}

export async function PUT(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response
  if (user?.role !== "admin") return NextResponse.json({ error: "Permissao negada." }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { id?: string; name?: string; email?: string; phone?: string; role?: "admin" | "funcionario"; status?: "ativo" | "inativo" }
  if (!body.id || !body.name || !body.email) return NextResponse.json({ error: "ID, nome e email sao obrigatorios." }, { status: 400 })
  const data = await updateAppUser(body.id, {
    name: body.name,
    email: body.email,
    phone: body.phone,
    role: body.role ?? "funcionario",
    status: body.status ?? "ativo",
  })
  return ok(data)
}

export async function DELETE(request: Request) {
  const { user, response } = await requireApiUser(request)
  if (response) return response
  if (user?.role !== "admin") return NextResponse.json({ error: "Permissao negada." }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { id?: string }
  if (!body.id) return NextResponse.json({ error: "ID obrigatorio." }, { status: 400 })
  await deleteAppUser(body.id)
  return ok({ id: body.id })
}
