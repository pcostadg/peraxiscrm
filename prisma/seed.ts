import { randomUUID } from "node:crypto"
import bcrypt from "bcryptjs"
import { prisma } from "../src/lib/prisma"

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Defina ${name} antes de executar o seed.`)
  }
  return value
}

async function main() {
  const name = requiredEnv("SEED_ADMIN_NAME")
  const username = requiredEnv("SEED_ADMIN_USERNAME")
  const email = requiredEnv("SEED_ADMIN_EMAIL").toLowerCase()
  const phone = process.env.SEED_ADMIN_PHONE?.trim() || null
  const password = requiredEnv("SEED_ADMIN_PASSWORD")
  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.appUser.upsert({
    where: { email },
    update: {
      name,
      username,
      phone,
      role: "admin",
      status: "ativo",
      passwordHash,
    },
    create: {
      id: randomUUID(),
      name,
      username,
      email,
      phone,
      role: "admin",
      status: "ativo",
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      status: true,
    },
  })

  console.log(`Admin pronto: ${user.email} (${user.username})`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
