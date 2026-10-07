import { describe, expect, it } from 'vitest'
import { nameFromEmail } from '../use-pending-settings-sync'

describe('nameFromEmail', () => {
  it('tidies the local part into a starting name', () => {
    expect(nameFromEmail('bj.vicks@example.com')).toBe('bj vicks')
    expect(nameFromEmail('jaco_p+bass@example.com')).toBe('jaco p bass')
  })

  it('falls back to "Player" with no usable email', () => {
    expect(nameFromEmail(null)).toBe('Player')
    expect(nameFromEmail('...@example.com')).toBe('Player')
  })

  it('stays within the name limit', () => {
    expect(nameFromEmail(`${'a'.repeat(80)}@example.com`)).toHaveLength(50)
  })
})
