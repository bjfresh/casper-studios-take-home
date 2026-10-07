// The boundary shape is defined once in @repo/shared so web and api can't
// drift; contracts re-export rather than redefine it.
export { type HealthStatus, healthStatusSchema } from '@repo/shared'
