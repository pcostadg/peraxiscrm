import "server-only"

type SendTextInput = {
  phoneNumberId: string
  token: string
  to: string
  message: string
}

export async function sendMetaTextMessage(input: SendTextInput) {
  const version = process.env.META_GRAPH_API_VERSION || "v20.0"
  const response = await fetch(`https://graph.facebook.com/${version}/${input.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      type: "text",
      text: { body: input.message },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || "Meta recusou o envio.")
  }

  return response.json() as Promise<{ messages?: Array<{ id: string }> }>
}
