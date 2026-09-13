/* Позиции накладной в форме, в которой их отдаёт WMS: тот же набор полей, что
   в приёмке, чтобы стенд мерил тот самый экран, а не абстрактные строки. */

export interface InvoiceItem {
  id: number
  article: string
  brand: string
  name: string
  client: string | null
  price: number
  quantity: number
  receiptedQuantity: number
  blockedQuantity: number
  comment: string | null
  isChznTraceable: boolean
  isChznCodeAvailable: boolean
}

const BRANDS = [
  'BOSCH',
  'MANN-FILTER',
  'SACHS',
  'LEMFÖRDER',
  'NGK',
  'GATES',
  'SKF',
  'TRW',
  'VALEO',
]
const PARTS = [
  'Фильтр масляный',
  'Колодки тормозные передние',
  'Амортизатор задний газомасляный',
  'Свеча зажигания иридиевая',
  'Ремень ГРМ с роликами, комплект',
  'Подшипник ступицы передней',
  'Диск тормозной вентилируемый',
  'Рычаг подвески нижний левый с шаровой опорой и сайлентблоками',
  'Щётка стеклоочистителя бескаркасная',
  'Датчик положения коленвала',
]
const CLIENTS = [
  'ООО «Автодом»',
  'ИП Сергеев',
  'Такси-парк №3',
  null,
  null,
  'СТО Кузовной',
]

/* Своё зерно, а не Math.random: на двух запусках должны получаться те же
   восемьсот пятьдесят семь строк, иначе цифры не сравнить. */
function mulberry(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeItems(count: number, seed = 857): InvoiceItem[] {
  const rnd = mulberry(seed)
  const pick = <T>(list: readonly T[]) => list[Math.floor(rnd() * list.length)]!
  return Array.from({ length: count }, (_, i) => {
    const quantity = 1 + Math.floor(rnd() * 24)
    const receipted = rnd() < 0.3 ? Math.floor(rnd() * (quantity + 1)) : 0
    const blocked =
      receipted === 0 && rnd() < 0.08 ? Math.floor(rnd() * (quantity + 1)) : 0
    const traceable = rnd() < 0.15
    return {
      id: 100_000 + i,
      article: `${Math.floor(rnd() * 9_000_000 + 1_000_000)}${rnd() < 0.3 ? 'A' : ''}`,
      brand: pick(BRANDS),
      name: pick(PARTS),
      client: pick(CLIENTS),
      price: Math.round((rnd() * 18_000 + 120) * 100) / 100,
      quantity,
      receiptedQuantity: receipted,
      blockedQuantity: blocked,
      comment: rnd() < 0.05 ? 'Упаковка вскрыта, пересчитать' : null,
      isChznTraceable: traceable,
      isChznCodeAvailable: traceable && rnd() < 0.7,
    }
  })
}

export const remainingOf = (item: InvoiceItem) =>
  item.quantity - item.receiptedQuantity - item.blockedQuantity
