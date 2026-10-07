/**
 * Flattens a composed object type so hovers and compiler errors show the
 * resolved fields instead of `Omit<Foo, 'x'> & { y: string }`.
 *
 * Identity at runtime and structurally identical to `T`. Use it on exported
 * types built from several pieces; a plain object literal type gains nothing.
 */
// The trailing `& {}` is what forces TS to eagerly resolve the mapped type for
// display — without it, hovers can still show the unevaluated alias.
export type Prettify<T> = { [K in keyof T]: T[K] } & {}
