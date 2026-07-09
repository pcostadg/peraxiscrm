export function normalizePhone(value: string) {
  return value.replace(/\D/g, "")
}

export function isValidBrazilianWhatsApp(value: string) {
  const normalized = normalizePhone(value)
  return /^55\d{10,11}$/.test(normalized)
}

export function parsePhoneList(input: string) {
  return input
    .split(/\r?\n|,|;/)
    .map((item) => normalizePhone(item))
    .filter(Boolean)
    .map((phone) => ({ phone, valid: isValidBrazilianWhatsApp(phone) }))
}
