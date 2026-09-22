export const SUPPORT_WHATSAPP_NUMBER = '5514982325360';

export function supportWhatsAppUrl(message = 'Olá! Quero saber mais sobre o Listas para celebrar.'): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
