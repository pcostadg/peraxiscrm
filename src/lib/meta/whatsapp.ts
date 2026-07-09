import "server-only"

export async function sendWhatsAppText(to: string, body: string) {
  const token = process.env.META_ACCESS_TOKEN
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID
  const version = process.env.META_GRAPH_API_VERSION
  if (!token || !phoneNumberId || !version) throw new Error("Configure o canal do WhatsApp nas variáveis de ambiente.")

  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: to.replace(/\D/g, ""), type: "text", text: { preview_url: false, body } }),
    cache: "no-store",
  })
  const result = await response.json()
  if (!response.ok) throw new Error("A Meta recusou o envio da mensagem.")
  return result as { messages?: Array<{ id: string }> }
}
