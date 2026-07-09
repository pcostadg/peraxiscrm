"use client"

import { useEffect, useState } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase"

export function useRealtimeSync(modules: string[]) {
  const [status, setStatus] = useState<"conectando" | "tempo real" | "polling">("conectando")
  const [tick, setTick] = useState(0)
  const moduleKey = modules.join("-")

  useEffect(() => {
    const moduleList = moduleKey.split("-").filter(Boolean)
    const supabase = createBrowserSupabaseClient()
    if (!supabase) {
      window.queueMicrotask(() => setStatus("polling"))
      const interval = window.setInterval(() => setTick((value) => value + 1), 12000)
      return () => window.clearInterval(interval)
    }

    const channel = supabase
      .channel(`crm-records-${moduleKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_records" }, (payload) => {
        const record = payload.new as { module?: string } | null
        if (!record?.module || moduleList.includes(record.module)) setTick((value) => value + 1)
      })
      .subscribe((state) => {
        setStatus(state === "SUBSCRIBED" ? "tempo real" : "conectando")
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [moduleKey])

  return { status, tick }
}
