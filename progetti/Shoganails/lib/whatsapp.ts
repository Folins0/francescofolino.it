/** Converte un numero di telefono in formato libero (es. "079 123 45 67")
 * nel formato atteso da wa.me: solo cifre, con prefisso internazionale.
 * I numeri locali (che iniziano con 0) sono assunti svizzeri (+41). */
export function numeroWhatsapp(telefono: string): string {
  const pulito = telefono.replace(/[^\d+]/g, "");
  if (pulito.startsWith("+")) return pulito.slice(1);
  if (pulito.startsWith("00")) return pulito.slice(2);
  if (pulito.startsWith("0")) return `41${pulito.slice(1)}`;
  return pulito;
}

/** Link che apre WhatsApp (app o web) con una chat già pronta e il testo precompilato. */
export function linkWhatsapp(telefono: string, testo: string): string {
  return `https://wa.me/${numeroWhatsapp(telefono)}?text=${encodeURIComponent(testo)}`;
}
