import type { Metadata } from "next"
import { InstitutionalPage } from "@/components/marketing/institutional-page"

export const metadata: Metadata = {
  title: "Sistemas sob demanda para empresas",
  description:
    "A Peraxis desenvolve sistemas personalizados, plataformas empresariais e automações sob demanda para empresas que precisam de tecnologia alinhada ao próprio negócio.",
  alternates: {
    canonical: "https://www.peraxis.com.br",
  },
}

export default async function HomePage() {
  return <InstitutionalPage />
}
