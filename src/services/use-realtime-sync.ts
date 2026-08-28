"use client"

import { useEffect, useRef, useState } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase"

type RealtimeSyncOptions = {
  fallbackIntervalMs?: number
  minTickIntervalMs?: number
}

export function useRealtimeSync(modules: string[], options?: RealtimeSyncOptions) {
  const [status, setStatus] = useState<"conectando" | "tempo real" | "polling">("conectando")
  const [tick, setTick] = useState(0)
  const moduleKey = modules.join("-")
  const fallbackIntervalMs = options?.fallbackIntervalMs ?? 10000
  const minTickIntervalMs = options?.minTickIntervalMs ?? 3000
  const lastTickAtRef = useRef(0)
  const pendingTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const moduleList = moduleKey.split("-").filter(Boolean)
    function scheduleTick() {
      const now = Date.now()
      const elapsed = now - lastTickAtRef.current
      if (elapsed >= minTickIntervalMs) {
        lastTickAtRef.current = now
        setTick((value) => value + 1)
        return
      }

      if (pendingTimeoutRef.current !== null) return
      pendingTimeoutRef.current = window.setTimeout(() => {
        pendingTimeoutRef.current = null
        lastTickAtRef.current = Date.now()
        setTick((value) => value + 1)
      }, minTickIntervalMs - elapsed)
    }

    const supabase = createBrowserSupabaseClient()
    if (!supabase) {
      window.queueMicrotask(() => setStatus("polling"))
      const interval = window.setInterval(() => scheduleTick(), fallbackIntervalMs)
      return () => {
        window.clearInterval(interval)
        if (pendingTimeoutRef.current !== null) {
          window.clearTimeout(pendingTimeoutRef.current)
        }
      }
    }

    const channel = supabase
      .channel(`crm-records-${moduleKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_records" }, (payload) => {
        const record = payload.new as { module?: string } | null
        if (!record?.module || moduleList.includes(record.module)) scheduleTick()
      })
      .subscribe((state) => {
        setStatus(state === "SUBSCRIBED" ? "tempo real" : "conectando")
      })

    return () => {
      if (pendingTimeoutRef.current !== null) {
        window.clearTimeout(pendingTimeoutRef.current)
      }
      void supabase.removeChannel(channel)
    }
  }, [fallbackIntervalMs, minTickIntervalMs, moduleKey])

  return { status, tick }
}
