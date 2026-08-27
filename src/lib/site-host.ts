const APP_HOST = "app.peraxis.com.br"

function stripPort(value: string) {
  return value.split(":")[0] ?? value
}

export function normalizeHost(host: string | null | undefined) {
  if (!host) return ""
  return stripPort(host.trim().toLowerCase())
}

export function isPreviewOrLocalHost(host: string | null | undefined) {
  const normalized = normalizeHost(host)
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized.endsWith(".vercel.app")
  )
}

export function isAppHost(host: string | null | undefined) {
  const normalized = normalizeHost(host)
  return normalized === APP_HOST || isPreviewOrLocalHost(normalized)
}

export function getAppOrigin(host: string | null | undefined) {
  const normalized = normalizeHost(host)

  if (normalized === "localhost" || normalized === "127.0.0.1") {
    return `http://${normalized}:3000`
  }

  if (normalized.endsWith(".vercel.app")) {
    return `https://${normalized}`
  }

  return `https://${APP_HOST}`
}

export function buildAppUrl(
  pathname: string,
  options?: {
    host?: string | null | undefined
    search?: string
  },
) {
  const origin = getAppOrigin(options?.host)
  const search = options?.search ?? ""
  return `${origin}${pathname}${search}`
}
