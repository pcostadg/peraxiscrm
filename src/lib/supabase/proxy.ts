import { NextResponse, type NextRequest } from "next/server"
import { COOKIE_NAME, getDefaultPanelRoute, getUserFromCookieValue } from "@/lib/auth"
import { ROUTES } from "@/config/routes"
import { buildAppUrl, isAppHost } from "@/lib/site-host"

export function updateSession(request: NextRequest) {
  const user = getUserFromCookieValue(request.cookies.get(COOKIE_NAME)?.value)
  const pathname = request.nextUrl.pathname
  const host = request.headers.get("host")
  const isPanel = pathname === "/painel" || pathname.startsWith("/painel/")
  const isLogin = pathname === ROUTES.LOGIN
  const isEquipe = pathname === ROUTES.EQUIPE || pathname.startsWith(`${ROUTES.EQUIPE}/`)

  if (!isAppHost(host) && (isLogin || isPanel)) {
    return NextResponse.redirect(
      buildAppUrl(pathname, {
        search: request.nextUrl.search,
      }),
    )
  }

  if (!user && isPanel) {
    return NextResponse.redirect(new URL(ROUTES.LOGIN, request.url))
  }

  if (user && isLogin) {
    return NextResponse.redirect(new URL(getDefaultPanelRoute(user.role), request.url))
  }

  if (user?.role === "funcionario" && isEquipe) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD, request.url))
  }

  return NextResponse.next({ request })
}
