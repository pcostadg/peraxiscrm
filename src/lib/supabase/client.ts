"use client"

import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseEnv } from "@/lib/supabase/env"

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  const { url, key } = getSupabaseEnv()
  browserClient ??= createBrowserClient(url, key)
  return browserClient
}
