"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { ArrowLeft, ImagePlus, PackagePlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ROUTES } from "@/config/routes"
import { ModuleHeader, PanelCard } from "@/modules/shared/components"
import { defaultTesterProducts, testersStorageKey, type TesterProduct } from "@/modules/testers/testers-data"

type ProductFormState = {
  nome: string
  descricao: string
  foto: string
}

const emptyProductForm: ProductFormState = {
  nome: "",
  descricao: "",
  foto: "",
}

function loadStoredProducts() {
  if (typeof window === "undefined") return defaultTesterProducts

  const savedProducts = window.localStorage.getItem(testersStorageKey)
  if (!savedProducts) return defaultTesterProducts

  try {
    const parsed = JSON.parse(savedProducts) as TesterProduct[]
    if (Array.isArray(parsed) && parsed.length) {
      return parsed
    }
  } catch {
    window.localStorage.removeItem(testersStorageKey)
  }

  return defaultTesterProducts
}

export function TestersCadastrosView() {
  const [form, setForm] = useState<ProductFormState>(emptyProductForm)
  const [products, setProducts] = useState<TesterProduct[]>(loadStoredProducts)

  function persistProducts(nextProducts: TesterProduct[]) {
    setProducts(nextProducts)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(testersStorageKey, JSON.stringify(nextProducts))
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        foto: typeof reader.result === "string" ? reader.result : "",
      }))
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.nome.trim() || !form.descricao.trim() || !form.foto.trim()) {
      toast.error("Preencha foto, nome do produto e descricao para cadastrar.")
      return
    }

    const nextProduct: TesterProduct = {
      id: `tester-produto-${Date.now()}`,
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      foto: form.foto.trim(),
    }

    persistProducts([nextProduct, ...products])
    setForm(emptyProductForm)
    toast.success("Produto cadastrado com sucesso.")
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={PackagePlus}
        title="Cadastros de produtos"
        action={
          <Button asChild variant="outline" className="h-11 rounded-xl px-4 text-sm font-semibold">
            <Link href={ROUTES.TESTERS}>
              <ArrowLeft size={16} />
              Voltar para Testers
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <PanelCard className="rounded-[28px] p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Foto do produto</span>
              <label className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/60">
                {form.foto ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={form.foto}
                    alt="Preview do produto"
                    className="h-52 w-full rounded-[20px] object-cover"
                  />
                ) : (
                  <>
                    <ImagePlus size={28} className="text-blue-600" />
                    <p className="mt-3 text-sm font-semibold text-slate-900">
                      Clique para selecionar a foto do produto
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      JPG, PNG ou WEBP para exibicao na aba Testers
                    </p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleImageChange}
                />
              </label>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Nome do produto</span>
              <Input
                value={form.nome}
                onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                className="h-11 rounded-xl border-slate-200 px-3"
                placeholder="Digite o nome do produto"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Descricao</span>
              <Textarea
                value={form.descricao}
                onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
                className="min-h-32 rounded-xl border-slate-200 px-3 py-3"
                placeholder="Descreva o produto que sera disponibilizado para solicitacao"
                required
              />
            </label>

            <Button type="submit" className="h-11 rounded-xl px-5 text-sm font-semibold">
              Cadastrar produto
            </Button>
          </form>
        </PanelCard>

        <div className="space-y-4">
          {products.map((product) => (
            <Card
              key={product.id}
              className="rounded-[24px] border border-slate-200/80 bg-white/95 py-0 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]"
            >
              <div className="aspect-[16/9] overflow-hidden rounded-t-[24px] bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.foto}
                  alt={product.nome}
                  className="h-full w-full object-cover"
                />
              </div>
              <CardContent className="space-y-2 px-5 py-5">
                <h3 className="text-base font-bold text-slate-950">{product.nome}</h3>
                <p className="text-sm text-slate-600">{product.descricao}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
