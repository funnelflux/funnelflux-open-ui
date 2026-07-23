import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormField } from '@/components/ui-kit/FormField'

describe('FormField', () => {
  it('exposes required fields to assistive technology', () => {
    render(
      <FormField label="Name" htmlFor="name" required>
        <input id="name" />
      </FormField>,
    )

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute(
      'aria-required',
      'true',
    )
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true')
  })

  it('preserves an explicit aria-required value', () => {
    render(
      <FormField label="Optional override" htmlFor="override" required>
        <input id="override" aria-required="false" />
      </FormField>,
    )

    expect(screen.getByRole('textbox', { name: 'Optional override' })).toHaveAttribute(
      'aria-required',
      'false',
    )
  })
})
