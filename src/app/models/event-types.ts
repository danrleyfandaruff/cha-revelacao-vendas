export type EventType = 'revelacao' | 'bebe' | 'casamento' | 'panela' | 'casa_nova' | 'aniversario';
export type BabySex = 'menino' | 'menina';

export const EVENT_TYPES: { id: EventType; label: string; nameLabel: string; placeholder: string }[] = [
  { id: 'revelacao', label: 'Chá revelação', nameLabel: 'Quais são os dois nomes possíveis?', placeholder: 'Nome 1' },
  { id: 'bebe', label: 'Chá de bebê', nameLabel: 'Qual o nome do bebê?', placeholder: 'Nome do bebê' },
  { id: 'casamento', label: 'Casamento', nameLabel: 'Quais são os nomes do casal?', placeholder: 'Ex.: Ana e Pedro' },
  { id: 'panela', label: 'Chá de panela', nameLabel: 'Para quem é o chá?', placeholder: 'Ex.: Ana ou Ana e Pedro' },
  { id: 'casa_nova', label: 'Casa nova', nameLabel: 'De quem é a casa nova?', placeholder: 'Ex.: Ana e Pedro' },
  { id: 'aniversario', label: 'Aniversário', nameLabel: 'Quem faz aniversário?', placeholder: 'Nome do aniversariante' },
];

export function isEventType(value: unknown): value is EventType {
  return EVENT_TYPES.some(type => type.id === value);
}

export function eventDefinition(type: EventType) {
  return EVENT_TYPES.find(option => option.id === type)!;
}

export function isBabyEvent(type: EventType): boolean {
  return type === 'bebe' || type === 'revelacao';
}

// Older events did not persist their type; keep their original name convention.
export function resolveEventType(event: { event_type?: EventType | null; baby_name_1: string; baby_name_2: string }): EventType {
  return isEventType(event.event_type) ? event.event_type
    : event.baby_name_1 === event.baby_name_2 ? 'bebe' : 'revelacao';
}

export function eventNames(event: { event_type?: EventType | null; baby_name_1: string; baby_name_2: string }): string {
  return resolveEventType(event) === 'revelacao'
    ? `${event.baby_name_1} ou ${event.baby_name_2}` : event.baby_name_1;
}

export function isEventExpired(event: { expires_at: string | null; archived_at?: string | null } | null, now = Date.now()): boolean {
  return !!event && (!!event.archived_at || (!!event.expires_at && Date.parse(event.expires_at) <= now));
}

export function giftSuggestions(type: EventType): { name: string; emoji: string; qty: number }[] {
  const names = type === 'aniversario'
    ? ['Livro', 'Jogo de tabuleiro', 'Mochila', 'Fone de ouvido', 'Camiseta', 'Vale-presente']
    : type === 'panela'
      ? ['Jogo de panelas', 'Assadeira', 'Jogo de copos', 'Talheres', 'Panos de prato', 'Utensílios de cozinha']
      : ['Jogo de jantar', 'Jogo de panelas', 'Jogo de cama', 'Toalhas de banho', 'Cafeteira', 'Liquidificador', 'Jogo de copos', 'Talheres'];
  return names.map(name => ({ name, emoji: '🎁', qty: 1 }));
}
