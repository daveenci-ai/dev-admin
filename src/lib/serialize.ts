/*
  Utilities to make Prisma results JSON-serializable by converting BigInt and Decimal.
*/

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export function serializePrisma<T>(data: T): T extends JsonValue ? T : any {
  return deepTransform(data, (value) => {
    if (typeof value === 'bigint') return value.toString()
    // Prisma.Decimal duck-typing: has toString that returns numeric-like
    if (value && typeof value === 'object' && 'toString' in (value as any) && (value as any).d) {
      try {
        const str = (value as any).toString()
        const num = Number(str)
        return Number.isNaN(num) ? str : num
      } catch {
        return (value as any).toString?.() ?? value
      }
    }
    return value
  }) as any
}

function deepTransform(input: any, transform: (v: any) => any): any {
  const transformed = transform(input)
  if (transformed !== input) return transformed

  if (Array.isArray(input)) return input.map((v) => deepTransform(v, transform))
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(input)) out[k] = deepTransform(v, transform)
    return out
  }
  return input
}


