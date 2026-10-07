// Type-level tests: checked by `tsc` (pnpm typecheck), not executed. The
// `.test-d.ts` suffix keeps Vitest's runtime runner from collecting the file.
import type { Prettify } from '../type-utilities'

// Strict identity check: distinguishes `any`, optional vs. `| undefined`, and
// readonly — plain `extends` checks would not. Both sides go through a
// modifier-preserving mapped type first, because the strict comparison would
// otherwise treat Prettify's trailing `& {}` as a different type even though it
// is structurally identical.
type Normalize<T> = { [K in keyof T]: T[K] }
type StrictEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Equal<A, B> = StrictEqual<Normalize<A>, Normalize<B>>
type Expect<T extends true> = T

type Base = { id: string; name: string; readonly createdAt: Date; note?: string }
type Composed = Omit<Base, 'name'> & { title: string }

export type Cases = [
  // Identity on a plain object.
  Expect<Equal<Prettify<Base>, Base>>,
  // Flattens an intersection to the same structural shape.
  Expect<Equal<Prettify<Composed>, Omit<Base, 'name'> & { title: string }>>,
  // Preserves optional and readonly modifiers.
  Expect<
    Equal<
      Prettify<Composed>,
      { id: string; readonly createdAt: Date; note?: string; title: string }
    >
  >,
  Expect<Equal<Prettify<Pick<Base, 'note'>>, { note?: string }>>,
  Expect<Equal<Prettify<Pick<Base, 'createdAt'>>, { readonly createdAt: Date }>>,
]

// Mutual assignment both ways — fails to compile if Prettify ever widens or narrows.
declare const composed: Composed
declare const prettified: Prettify<Composed>
export const forward: Prettify<Composed> = composed
export const backward: Composed = prettified

// Guards the guard: the helper must reject near-misses, or every case above is vacuous.
type Not<T extends false> = T
export type GuardCases = [
  Not<Equal<Prettify<Base>, Omit<Base, 'note'>>>,
  Not<Equal<Prettify<Pick<Base, 'note'>>, { note: string | undefined }>>,
  Not<Equal<Prettify<Pick<Base, 'createdAt'>>, { createdAt: Date }>>,
  // biome-ignore lint/suspicious/noExplicitAny: proving the helper rejects `any` requires naming it.
  Not<Equal<Prettify<Base>, any>>,
]
