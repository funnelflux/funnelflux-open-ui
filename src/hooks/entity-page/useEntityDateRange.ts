import { useState } from 'react'
import { subDays } from 'date-fns'

export function useEntityDateRange() {
  const [tz, setTz] = useState('UTC')
  const [dateRange, setDateRange] = useState(() => ({
    from: subDays(new Date(), 365),
    to: new Date(),
  }))

  return {
    tz,
    setTz,
    dateRange,
    setDateRange,
  }
}
