import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from './sanitize'

describe('sanitizeHtml', () => {
  it('allows safe HTML tags', () => {
    const input = '<p>Hello <strong>world</strong></p>'
    expect(sanitizeHtml(input)).toBe(input)
  })

  it('strips script tags', () => {
    const input = '<script>alert("xss")</script><p>safe</p>'
    expect(sanitizeHtml(input)).toBe('<p>safe</p>')
  })

  it('strips event handlers', () => {
    const input = '<p onmouseover="alert(1)">hover</p>'
    expect(sanitizeHtml(input)).toBe('<p>hover</p>')
  })

  it('allows href attributes on links', () => {
    const input = '<a href="https://example.com" target="_blank">link</a>'
    expect(sanitizeHtml(input)).toBe(input)
  })

  it('removes nested SVG and MathML mutation-XSS payloads', () => {
    const input = '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>"></table></mtext></math><p>safe</p>'
    const sanitized = sanitizeHtml(input)
    expect(sanitized).toBe('<p>safe</p>')
    expect(sanitized).not.toMatch(/onerror|<math|<svg|<img/i)
  })

  it('removes templates, forms, clobbering attributes, and scriptable URLs', () => {
    const input = '<template><script>alert(1)</script></template><form id="attributes"><input name="nodeName"></form><a href="javascript:alert(1)">bad</a>'
    const sanitized = sanitizeHtml(input)
    expect(sanitized).toBe('<a>bad</a>')
    expect(sanitized).not.toMatch(/template|form|javascript:|nodeName/i)
  })
})
