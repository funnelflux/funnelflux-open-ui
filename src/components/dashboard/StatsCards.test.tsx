import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatsCards } from '@/components/dashboard/StatsCards'

describe('StatsCards', () => {
  it('uses normalized ROI values when applying the loss card tone', () => {
    render(
      <StatsCards
        isLoading={false}
        stats={{ roi: '-1,200%', revenue: 0, cost: 0 }}
      />,
    )

    expect(screen.getByText('-1,200%').closest('.ff-stat-card')).toHaveClass(
      'ff-stat-card--loss',
    )
  })
})
