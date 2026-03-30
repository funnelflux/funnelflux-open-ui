import { useEffect, useState } from 'react'
import { Input } from 'antd'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className }: SearchInputProps) {
  const [internal, setInternal] = useState(value)

  useEffect(() => {
    setInternal(value)
  }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (internal !== value) onChange(internal)
    }, 300)
    return () => clearTimeout(timer)
  }, [internal, value, onChange])

  return (
    <Input.Search
      value={internal}
      onChange={(e) => setInternal(e.target.value)}
      placeholder={placeholder}
      className={className}
      allowClear
      size="middle"
    />
  )
}
