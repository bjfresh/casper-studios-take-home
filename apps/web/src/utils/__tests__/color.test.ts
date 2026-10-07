import { describe, expect, it } from 'vitest'
import { contrastRatio, readableTextColor, rgbOf } from '../color'

describe('color', () => {
  it('measures WCAG contrast', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5)
    expect(contrastRatio([255, 255, 255], [255, 255, 255])).toBe(1)
  })

  it('picks the more readable of black and white, by contrast not step', () => {
    expect(readableTextColor(rgbOf('#ffc300'))).toBe('#000000') // amber 500: light
    expect(readableTextColor(rgbOf('#ac2bd4'))).toBe('#ffffff') // orchid 500: dark
    expect(readableTextColor(rgbOf('#fbebe9'))).toBe('#000000')
    expect(readableTextColor(rgbOf('#001924'))).toBe('#ffffff')
  })

  it('resolves any CSS colour the browser understands', () => {
    expect(rgbOf('rgb(1, 2, 3)')).toEqual([1, 2, 3])
    expect(rgbOf('#ffffff')).toEqual([255, 255, 255])
  })
})
