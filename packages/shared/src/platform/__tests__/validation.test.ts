import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { formatValidationIssues, toValidationIssues } from '../validation'

describe('toValidationIssues', () => {
  it('flattens nested paths to dotted strings', () => {
    const schema = z.object({ profile: z.object({ email: z.email() }), tags: z.array(z.string()) })
    const result = schema.safeParse({ profile: { email: 'nope' }, tags: [1] })
    if (result.success) throw new Error('expected failure')

    const paths = toValidationIssues(result.error).map((issue) => issue.path)
    expect(paths).toEqual(['profile.email', 'tags.0'])
  })

  it('uses an empty path for root-level issues', () => {
    const result = z.string().safeParse(1)
    if (result.success) throw new Error('expected failure')

    expect(toValidationIssues(result.error)[0]?.path).toBe('')
  })
})

describe('formatValidationIssues', () => {
  it('omits the path prefix for root issues', () => {
    expect(
      formatValidationIssues([
        { path: '', message: 'Bad root' },
        { path: 'a.b', message: 'Bad leaf' },
      ]),
    ).toBe('Bad root; a.b: Bad leaf')
  })
})
