/**
 * Sign-in methods, in display order. This list can only NARROW what the Privy
 * dashboard enables, so removing a method means disabling it in both places.
 *
 * Each OAuth provider needs setup outside this repo:
 * - google: OAuth credentials in Google Cloud Console with Privy's redirect URI
 *   added, then enable Google in the Privy dashboard.
 * - apple (DISABLED: not offered until set up; to re-enable, add 'apple' below
 *   and its label): an Apple Developer account with a Services ID, a key and
 *   a return URL configured, then enable Apple in the Privy dashboard. Apple is stricter
 *   than Google about exact redirect URIs. It returns the user's name only on
 *   the FIRST authorization, so persist it then if it's ever needed. It may
 *   also give a private-relay email: treat that as an identifier, not a
 *   contact guarantee.
 *
 * Wallet login is deliberately absent: this app has no on-chain features, and
 * listing it would show crypto UI to people with no reason to see it.
 */
export const PRIVY_LOGIN_METHODS = ['email', 'google'] as const

export type LoginMethod = (typeof PRIVY_LOGIN_METHODS)[number]

export const LOGIN_METHOD_LABELS = {
  email: 'Email',
  google: 'Google',
} as const satisfies Record<LoginMethod, string>
