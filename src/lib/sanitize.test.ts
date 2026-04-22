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
})
