export type TesterProduct = {
  id: string
  nome: string
  descricao: string
  foto: string
}

export const testersStorageKey = "peraxis:testers-products"

export const defaultTesterProducts: TesterProduct[] = [
  {
    id: "tester-produto-1",
    nome: "Kit Capsulas Energia+",
    descricao: "Suplemento para rotina diaria com envio gratuito para avaliacao de usabilidade e embalagem.",
    foto:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "tester-produto-2",
    nome: "Creme Facial Hydra Skin",
    descricao: "Linha de skincare para teste de textura, fragrancia e experiencia de uso no dia a dia.",
    foto:
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "tester-produto-3",
    nome: "Garrafa Termica Move",
    descricao: "Produto pensado para validar ergonomia, acabamento e conservacao termica durante a semana.",
    foto:
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80",
  },
]

export function getInitialTesterProducts() {
  return defaultTesterProducts
}
