import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  ChartColumnBig,
  CreditCard,
  Layers3,
  MessageCircle,
  MonitorSmartphone,
  Sparkles,
  Workflow,
} from "lucide-react"

const whatsappHref =
  "https://wa.me/5511978140022?text=Ol%C3%A1%2C%20acabei%20de%20ver%20o%20site%20de%20voc%C3%AAs%20e%20gostaria%20de%20um%20or%C3%A7amento!"

const servicesTicker = [
  "Software sob demanda",
  "CRM",
  "ERP",
  "Automação",
  "Web App",
  "Portal do cliente",
  "Dashboard",
  "Integrações",
]

const partnerLogos = [
  {
    src: "/brands/clean/vision-marketing-digital.png",
    alt: "Vision Marketing Digital",
    width: 188,
    height: 188,
  },
  {
    src: "/brands/clean/iannalog.png",
    alt: "Iannalog Transporte Executivo",
    width: 185,
    height: 76,
  },
  {
    src: "/brands/clean/connecta-telecom.png",
    alt: "Connecta Telecom",
    width: 220,
    height: 94,
  },
  {
    src: "/brands/clean/marinho-rodrigues.png",
    alt: "Marinho e Rodrigues",
    width: 230,
    height: 66,
  },
  {
    src: "/brands/clean/dental-prompt.png",
    alt: "Dental Prompt",
    width: 176,
    height: 54,
  },
  {
    src: "/brands/clean/fortixseg.png",
    alt: "FortixSeg",
    width: 210,
    height: 90,
  },
]

const serviceCards = [
  {
    icon: Workflow,
    title: "Software sob demanda",
    items: ["CRMs", "ERPs", "Plataformas internas", "Sistemas operacionais", "Dashboards"],
    description:
      "Projetamos sistemas personalizados para empresas com processos próprios, metas claras e necessidade real de escala.",
  },
  {
    icon: MonitorSmartphone,
    title: "Produtos digitais",
    items: ["Web apps", "Portais", "Áreas de membros", "Plataformas EAD", "Aplicações SaaS"],
    description:
      "Criamos produtos digitais do zero, combinando arquitetura, experiência e performance para crescer com consistência.",
  },
  {
    icon: ChartColumnBig,
    title: "Experiência e performance",
    items: ["UX/UI", "Responsividade", "Integrações", "SEO técnico", "Tomada de decisão"],
    description:
      "Mais do que interface bonita, entregamos clareza operacional, velocidade e uma experiência que faz sentido no dia a dia.",
  },
]

const methodology = [
  {
    step: "01",
    title: "Descoberta",
    description:
      "Entendemos a operação, as dores, os gargalos e as prioridades estratégicas antes de desenhar qualquer solução.",
  },
  {
    step: "02",
    title: "Definição",
    description:
      "Estruturamos escopo, fluxos, entregas e objetivos para transformar complexidade em clareza de execução.",
  },
  {
    step: "03",
    title: "Desenvolvimento",
    description:
      "Construímos a plataforma com foco em usabilidade, robustez, performance e aderência ao processo real do cliente.",
  },
  {
    step: "04",
    title: "Entrega e evolução",
    description:
      "Publicamos com segurança e continuamos evoluindo o sistema para acompanhar o crescimento da empresa.",
  },
]

const reviews = [
  {
    company: "Grupo Nexus Tecnologia",
    author: "Ariana Costa • Diretora Comercial",
    content:
      "Precisávamos de um sistema que se adaptasse ao nosso processo comercial, e não o contrário. O resultado superou nossas expectativas.",
  },
  {
    company: "Delta Advocacia",
    author: "Ricardo Martins • CEO",
    content:
      "A Peraxis conseguiu transformar uma ideia que estava apenas no papel em um sistema completo e extremamente intuitivo.",
  },
  {
    company: "Instituto Prime Educação",
    author: "Carlos Henrique Souza • Empresário",
    content:
      "A integração com WhatsApp Oficial trouxe muito mais agilidade para nossa operação comercial. O tempo de atendimento reduziu consideravelmente.",
  },
  {
    company: "Connect Hub Negócios",
    author: "André Ribeiro • Diretor Operacional",
    content:
      "Hoje conseguimos acompanhar vendas, atendimento, projetos e desempenho da equipe em um único ambiente.",
  },
  {
    company: "Vision Marketing Digital",
    author: "Operação",
    content:
      "A organização do financeiro e dos processos internos aumentou significativamente após a implementação do sistema personalizado.",
  },
  {
    company: "Fortex Engenharia",
    author: "Patrícia Almeida • Gestora Comercial",
    content:
      "A equipe conseguiu se adaptar ao sistema rapidamente. A interface é moderna, intuitiva e extremamente responsiva.",
  },
]

function TickerRow() {
  const items = [...servicesTicker, ...servicesTicker]

  return (
    <div className="overflow-hidden border-y border-white/10 bg-[#0b1628] py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
      <div className="flex w-max items-center gap-10 whitespace-nowrap text-[0.98rem] font-medium tracking-[0.01em] text-slate-200 motion-safe:animate-[brandMarquee_34s_linear_infinite]">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-10">
            <span>{item}</span>
            <span className="text-slate-500">•</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function InstitutionalPage() {
  const doubledLogos = [...partnerLogos, ...partnerLogos]
  const doubledReviews = [...reviews, ...reviews]

  return (
    <main className="overflow-x-hidden bg-[#f4f7fb] text-slate-950">
      <section className="relative overflow-hidden bg-[#081120] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(56,189,248,0.1),transparent_28%)]" />
        <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.18)_1px,transparent_1px)] [background-size:60px_60px]" />

        <div className="relative mx-auto max-w-7xl px-6 pb-18 pt-6 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="Peraxis"
                width={244}
                height={78}
                className="h-auto w-44 brightness-0 invert sm:w-56"
              />
            </Link>

            <Link
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/28 hover:bg-white/12"
            >
              Solicitar orçamento
            </Link>
          </header>

          <div className="grid items-center gap-10 pt-8 lg:grid-cols-[0.94fr_1.06fr] lg:pt-10">
            <div className="max-w-[42rem]">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/8 px-4 py-2 text-sm font-semibold text-sky-100">
                <Sparkles className="h-4 w-4" />
                Da estratégia à entrega
              </div>

              <h1 className="mt-6 max-w-3xl text-[2.2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.85rem] lg:text-[4rem] lg:leading-[0.96]">
                Sistemas sob demanda pensados para organizar, escalar e evoluir sua operação.
              </h1>

              <p className="mt-6 max-w-xl text-[1rem] leading-8 text-slate-300 sm:text-[1.02rem]">
                A Peraxis desenvolve plataformas personalizadas para empresas que precisam de
                processos mais claros, gestão mais madura e tecnologia alinhada ao próprio modelo de
                negócio.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2563eb] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_22px_44px_rgba(37,99,235,0.28)] transition hover:translate-y-[-1px]"
                >
                  Falar com a Peraxis
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#servicos"
                  className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/6 px-6 py-3.5 text-sm font-semibold text-white/90 transition hover:border-white/24 hover:bg-white/10"
                >
                  Conhecer soluções
                </a>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.18),transparent_55%)] blur-3xl" />
              <div className="relative w-full max-w-[35rem]">
                <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl">
                  <div className="rounded-[1.55rem] bg-[linear-gradient(135deg,#0f1b33,#152645)] p-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-200">
                      Operação mais madura
                    </p>
                    <h2 className="mt-4 max-w-lg text-[1.75rem] font-semibold tracking-[-0.04em] text-white sm:text-[1.9rem]">
                      Tecnologia moldada ao seu processo, não o contrário.
                    </h2>
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sky-200">
                          <Layers3 className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-[1.05rem] font-semibold text-white">Processos centralizados</p>
                        <p className="mt-2 text-sm leading-7 text-slate-300">
                          Menos planilhas paralelas, mais clareza operacional.
                        </p>
                      </div>
                      <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sky-200">
                          <ChartColumnBig className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-[1.05rem] font-semibold text-white">Indicadores estratégicos</p>
                        <p className="mt-2 text-sm leading-7 text-slate-300">
                          Dados para decidir com mais segurança e velocidade.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <TickerRow />
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-600">
                O que construímos
              </p>
              <h2 className="mt-4 text-[2.25rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[3.2rem]">
                Soluções digitais para empresas com processos reais e metas ambiciosas.
              </h2>
            </div>

            <div className="flex justify-start lg:justify-end">
              <p className="max-w-xl text-base leading-8 text-slate-600 lg:text-left">
                Unimos visão estratégica, arquitetura de produto e desenvolvimento para entregar
                sistemas que geram organização, produtividade e capacidade de crescimento.
              </p>
            </div>
          </div>

          <div id="servicos" className="mt-14 grid gap-5 lg:grid-cols-3">
            {serviceCards.map((card) => {
              const Icon = card.icon

              return (
                <article
                  key={card.title}
                  className="rounded-[2rem] border border-slate-200 bg-[#f8fbff] p-7 shadow-[0_18px_46px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-[1.7rem] font-semibold tracking-[-0.04em] text-slate-950">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.description}</p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {card.items.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-[#eef4fb] py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-600">
              Contratação facilitada
            </p>
            <h2 className="mt-4 text-[2.15rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[3rem]">
              Projeto sob demanda com parcelamento no PIX.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
              A Peraxis é pioneira em viabilizar a contratação do projeto parcelado no PIX,
              facilitando o investimento para empresas que precisam evoluir com mais previsibilidade.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Mais flexibilidade para tirar projetos estratégicos do papel.",
              "Condição comercial pensada para empresas que precisam investir com inteligência.",
              "Menos atrito na contratação e mais velocidade para começar a execução.",
              "Um diferencial comercial coerente com a proposta de inovação da Peraxis.",
            ].map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <CreditCard className="h-4 w-4" />
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-600">
              Empresas que confiam
            </p>
            <h2 className="mt-4 text-[2.2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[3.05rem]">
              Marcas que escolheram construir tecnologia com mais aderência ao negócio.
            </h2>
          </div>

          <div className="mt-14 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
            <div className="flex w-max items-center gap-10 motion-safe:animate-[brandMarquee_42s_linear_infinite]">
              {doubledLogos.map((logo, index) => (
                <div
                  key={`${logo.alt}-${index}`}
                  className="flex h-16 min-w-[170px] items-center justify-center sm:min-w-[190px]"
                >
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={logo.width}
                    height={logo.height}
                    className="h-auto max-h-12 w-auto object-contain grayscale opacity-55 [filter:grayscale(1)_brightness(0.58)_contrast(0.78)]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#081120] py-24 text-white">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr]">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-300">
                Metodologia
              </p>
              <h2 className="mt-4 text-[2.25rem] font-semibold tracking-[-0.05em] sm:text-[3.1rem]">
                Da concepção à evolução, com processo, clareza e direção.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-300">
                Cada projeto é estruturado para reduzir ruído, alinhar expectativas e transformar
                necessidades complexas em uma solução consistente.
              </p>
            </div>

            <div className="grid gap-4">
              {methodology.map((item) => (
                <article
                  key={item.step}
                  className="rounded-[1.7rem] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl"
                >
                  <div className="flex items-start gap-5">
                    <div className="text-2xl font-semibold tracking-[-0.05em] text-sky-200">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-600">
              Avaliações
            </p>
            <h2 className="mt-4 text-[2.2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[3.05rem]">
              Empresas que buscavam mais controle, mais clareza e uma solução realmente própria.
            </h2>
          </div>

          <div className="mt-14 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
            <div className="flex w-max gap-5 motion-safe:animate-[reviewMarquee_72s_linear_infinite]">
              {doubledReviews.map((review, index) => (
                <article
                  key={`${review.company}-${index}`}
                  className="flex min-h-[250px] w-[320px] flex-col rounded-[1.8rem] border border-slate-200 bg-[#f8fbff] p-6 shadow-[0_14px_38px_rgba(15,23,42,0.04)] sm:w-[350px]"
                >
                  <p className="text-lg font-semibold text-slate-950">{review.company}</p>
                  <p className="mt-2 text-sm tracking-[0.22em] text-amber-500">★★★★★</p>
                  <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">{review.content}</p>
                  <p className="mt-5 text-sm font-semibold text-slate-900">{review.author}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
          <div className="overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#091426_0%,#102447_60%,#1d4ed8_100%)] px-7 py-10 text-white shadow-[0_32px_80px_rgba(15,23,42,0.14)] sm:px-10 sm:py-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-200">
                  Peraxis
                </p>
                <h2 className="mt-4 text-[2.2rem] font-semibold tracking-[-0.05em] sm:text-[3rem]">
                  Se a sua empresa precisa de uma plataforma mais aderente, a próxima etapa pode começar agora.
                </h2>
                <p className="mt-5 text-base leading-8 text-slate-200">
                  Vamos conversar sobre a estrutura do seu negócio e desenhar uma solução sob medida
                  para o momento em que a sua operação está hoje e para onde ela quer chegar.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:translate-y-[-1px]"
                >
                  Solicitar proposta
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Link
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-3 rounded-full bg-[#16a34a] px-5 py-3 text-sm font-semibold text-white shadow-[0_22px_50px_rgba(22,163,74,0.32)] transition hover:scale-[1.02]"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline">Solicitar orçamento</span>
      </Link>
    </main>
  )
}
