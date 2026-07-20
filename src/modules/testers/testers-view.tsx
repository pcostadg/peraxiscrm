"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { ClipboardList, LoaderCircle, MapPinHouse, Package2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ROUTES } from "@/config/routes"
import { ModuleHeader, PanelCard } from "@/modules/shared/components"
import { defaultTesterProducts, testersStorageKey, type TesterProduct } from "@/modules/testers/testers-data"

type RequestFormState = {
  nomeCompleto: string
  cpf: string
  cep: string
  endereco: string
  bairro: string
  cidade: string
  estado: string
  numero: string
  complemento: string
}

const emptyRequestForm: RequestFormState = {
  nomeCompleto: "",
  cpf: "",
  cep: "",
  endereco: "",
  bairro: "",
  cidade: "",
  estado: "",
  numero: "",
  complemento: "",
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

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2")
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  return digits.replace(/^(\d{5})(\d)/, "$1-$2")
}

export function TestersView() {
  const [products] = useState<TesterProduct[]>(loadStoredProducts)
  const [selectedProduct, setSelectedProduct] = useState<TesterProduct | null>(null)
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [requestForm, setRequestForm] = useState<RequestFormState>(emptyRequestForm)
  const [loadingCep, setLoadingCep] = useState(false)

  function openRequestDialog(product: TesterProduct) {
    setSelectedProduct(product)
    setRequestForm(emptyRequestForm)
    setRequestDialogOpen(true)
  }

  function updateField<K extends keyof RequestFormState>(
    field: K,
    value: RequestFormState[K]
  ) {
    setRequestForm((current) => ({ ...current, [field]: value }))
  }

  async function handleCepLookup(event: ChangeEvent<HTMLInputElement>) {
    const formattedCep = formatCep(event.target.value)
    updateField("cep", formattedCep)

    const cepDigits = formattedCep.replace(/\D/g, "")
    if (cepDigits.length !== 8) return

    setLoadingCep(true)

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
      const data = (await response.json()) as {
        erro?: boolean
        logradouro?: string
        bairro?: string
        localidade?: string
        uf?: string
      }

      if (!response.ok || data.erro) {
        throw new Error("CEP nao encontrado.")
      }

      setRequestForm((current) => ({
        ...current,
        cep: formattedCep,
        endereco: data.logradouro ?? "",
        bairro: data.bairro ?? "",
        cidade: data.localidade ?? "",
        estado: data.uf ?? "",
      }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao consultar o CEP.")
    } finally {
      setLoadingCep(false)
    }
  }

  function handleSubmitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedProduct) return

    const hasRequiredFields = [
      requestForm.nomeCompleto,
      requestForm.cpf,
      requestForm.cep,
      requestForm.endereco,
      requestForm.numero,
    ].every((field) => field.trim().length > 0)

    if (!hasRequiredFields) {
      toast.error("Preencha os campos obrigatorios antes de efetuar a solicitacao.")
      return
    }

    setRequestDialogOpen(false)
    setSelectedProduct(null)
    setRequestForm(emptyRequestForm)
    toast.success(
      "Solicitacao efetuada com sucesso em breve o produto sera enviado para o TESTER Cadastrado."
    )
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={Package2}
        title="Testers"
        action={
          <Button asChild className="h-11 rounded-xl px-4 text-sm font-semibold">
            <Link href={ROUTES.TESTERS_CADASTROS}>Cadastros</Link>
          </Button>
        }
      />

      <PanelCard className="border-blue-100 bg-blue-50/70">
        <div className="flex items-start gap-3">
          <ClipboardList className="mt-0.5 text-blue-600" size={18} />
          <div>
            <p className="text-sm font-semibold text-slate-900">Solicite produtos para testers</p>
            <p className="mt-1 text-sm text-slate-600">
              Escolha um produto, clique em solicitar e preencha o formulario com os dados do tester para envio.
            </p>
          </div>
        </div>
      </PanelCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <Card
            key={product.id}
            className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 py-0 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.45)]"
          >
            <div className="aspect-[4/3] overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.foto}
                alt={product.nome}
                className="h-full w-full object-cover"
              />
            </div>
            <CardHeader className="px-5 pt-5">
              <CardTitle className="text-lg font-bold text-slate-950">
                {product.nome}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 text-sm text-slate-600">
              {product.descricao}
            </CardContent>
            <CardFooter className="border-t border-slate-100 bg-slate-50/80 px-5">
              <Button
                type="button"
                className="h-11 w-full rounded-xl text-sm font-semibold"
                onClick={() => openRequestDialog(product)}
              >
                Solicitar
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0">
          <DialogHeader className="border-b border-slate-100 px-6 pt-6 pb-4">
            <DialogTitle className="text-xl font-bold text-slate-950">
              Solicitar produto
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {selectedProduct
                ? `Preencha os dados para solicitar ${selectedProduct.nome}.`
                : "Preencha os dados do tester para envio do produto."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitRequest} className="space-y-5 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Nome completo</span>
                <Input
                  value={requestForm.nomeCompleto}
                  onChange={(event) => updateField("nomeCompleto", event.target.value)}
                  className="h-11 rounded-xl border-slate-200 px-3"
                  placeholder="Digite o nome completo"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">CPF</span>
                <Input
                  value={requestForm.cpf}
                  onChange={(event) => updateField("cpf", formatCpf(event.target.value))}
                  className="h-11 rounded-xl border-slate-200 px-3"
                  placeholder="000.000.000-00"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">CEP</span>
                <div className="relative">
                  <Input
                    value={requestForm.cep}
                    onChange={handleCepLookup}
                    className="h-11 rounded-xl border-slate-200 px-3 pr-10"
                    placeholder="00000-000"
                    required
                  />
                  {loadingCep && (
                    <LoaderCircle className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-slate-400" />
                  )}
                </div>
              </label>

              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Endereco</span>
                <Input
                  value={requestForm.endereco}
                  onChange={(event) => updateField("endereco", event.target.value)}
                  className="h-11 rounded-xl border-slate-200 px-3"
                  placeholder="Rua, avenida ou travessa"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Numero</span>
                <Input
                  value={requestForm.numero}
                  onChange={(event) => updateField("numero", event.target.value)}
                  className="h-11 rounded-xl border-slate-200 px-3"
                  placeholder="Numero"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Complemento</span>
                <Input
                  value={requestForm.complemento}
                  onChange={(event) => updateField("complemento", event.target.value)}
                  className="h-11 rounded-xl border-slate-200 px-3"
                  placeholder="Apartamento, bloco, referencia"
                />
              </label>

              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
                <label className="space-y-2 sm:col-span-1">
                  <span className="text-sm font-semibold text-slate-700">Bairro</span>
                  <Input
                    value={requestForm.bairro}
                    onChange={(event) => updateField("bairro", event.target.value)}
                    className="h-11 rounded-xl border-slate-200 px-3"
                    placeholder="Bairro"
                  />
                </label>

                <label className="space-y-2 sm:col-span-1">
                  <span className="text-sm font-semibold text-slate-700">Cidade</span>
                  <Input
                    value={requestForm.cidade}
                    onChange={(event) => updateField("cidade", event.target.value)}
                    className="h-11 rounded-xl border-slate-200 px-3"
                    placeholder="Cidade"
                  />
                </label>

                <label className="space-y-2 sm:col-span-1">
                  <span className="text-sm font-semibold text-slate-700">UF</span>
                  <Input
                    value={requestForm.estado}
                    onChange={(event) => updateField("estado", event.target.value.toUpperCase().slice(0, 2))}
                    className="h-11 rounded-xl border-slate-200 px-3"
                    placeholder="UF"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <MapPinHouse size={16} className="text-blue-600" />
              O endereco e preenchido automaticamente ao informar um CEP valido.
            </div>

            <DialogFooter className="-mx-6 -mb-5 rounded-b-3xl border-t border-slate-100 bg-slate-50/80 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => setRequestDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="h-11 rounded-xl">
                Efetuar solicitacao
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
