import { useCallback, useState } from 'react'
import { Button, Input, InputNumber, Popover, Select } from '@/components/ui-kit'
import { Icon } from '@/components/ui-kit/icons'
import {
  COLUMN_FILTER_OPERATOR_OPTIONS,
  TEXT_COLUMN_FILTER_OPERATOR_OPTIONS,
  isValidColumnFilterValue,
  normalizeColumnFilterValue,
  type ColumnFilterOperator,
  type ColumnFilterValue,
  type TextColumnFilterOperator,
} from '@/lib/drilldownColumnFilters'

export type { ColumnFilterValue, ColumnFilterOperator }

const DEFAULT_NUMERIC_OPERATOR: ColumnFilterOperator = '>='
const DEFAULT_TEXT_OPERATOR: TextColumnFilterOperator = 'contains'

interface DataTableColumnFilterContentProps {
  filterKind: ColumnFilterValue['kind']
  initialValue: ColumnFilterValue | undefined
  onApply: (value: ColumnFilterValue) => void
  onClear: () => void
  onClose: () => void
}

function DataTableColumnFilterContent({
  filterKind,
  initialValue,
  onApply,
  onClear,
  onClose,
}: DataTableColumnFilterContentProps) {
  const normalizedInitial = normalizeColumnFilterValue(initialValue, filterKind)
  const [operator, setOperator] = useState(
    filterKind === 'text'
      ? (normalizedInitial?.kind === 'text' ? normalizedInitial.operator : DEFAULT_TEXT_OPERATOR)
      : (normalizedInitial?.kind === 'numeric' ? normalizedInitial.operator : DEFAULT_NUMERIC_OPERATOR),
  )
  const [amount, setAmount] = useState(normalizedInitial?.value ?? '')

  const handleNumericOperatorChange = useCallback((next: ColumnFilterOperator) => {
    setOperator(next)
  }, [])

  const handleTextOperatorChange = useCallback((next: TextColumnFilterOperator) => {
    setOperator(next)
  }, [])

  const handleAmountChange = useCallback((next: string | number | null) => {
    setAmount(next == null ? '' : String(next))
  }, [])

  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(event.target.value)
  }, [])

  const handleApplyClick = useCallback(() => {
    const draft: ColumnFilterValue =
      filterKind === 'text'
        ? { kind: 'text', operator: operator as TextColumnFilterOperator, value: amount }
        : { kind: 'numeric', operator: operator as ColumnFilterOperator, value: amount }
    if (!isValidColumnFilterValue(draft)) {
      return
    }
    onApply(draft)
    onClose()
  }, [amount, filterKind, onApply, onClose, operator])

  const handleClearClick = useCallback(() => {
    onClear()
    onClose()
  }, [onClear, onClose])

  const draft: ColumnFilterValue =
    filterKind === 'text'
      ? { kind: 'text', operator: operator as TextColumnFilterOperator, value: amount }
      : { kind: 'numeric', operator: operator as ColumnFilterOperator, value: amount }
  const canApply = isValidColumnFilterValue(draft)

  return (
    <div className="dt-column-filter-popover">
      <div className="dt-column-filter-popover__row">
        {filterKind === 'text' ? (
          <Select
            value={operator as TextColumnFilterOperator}
            onChange={handleTextOperatorChange}
            size="sm"
            className="dt-column-filter-popover__operator"
            options={[...TEXT_COLUMN_FILTER_OPERATOR_OPTIONS]}
          />
        ) : (
          <Select
            value={operator as ColumnFilterOperator}
            onChange={handleNumericOperatorChange}
            size="sm"
            className="dt-column-filter-popover__operator"
            options={[...COLUMN_FILTER_OPERATOR_OPTIONS]}
          />
        )}
        {filterKind === 'text' ? (
          <Input
            value={amount}
            onChange={handleTextChange}
            size="sm"
            className="dt-column-filter-popover__value"
            placeholder="Text"
          />
        ) : (
          <InputNumber
            value={amount === '' ? null : Number(amount)}
            onChange={handleAmountChange}
            className="dt-column-filter-popover__value"
            placeholder="Value"
          />
        )}
      </div>
      <div className="dt-column-filter-popover__actions">
        <Button type="text" size="sm" onClick={handleClearClick}>
          Clear
        </Button>
        <Button type="primary" size="sm" onClick={handleApplyClick} disabled={!canApply}>
          Apply
        </Button>
      </div>
    </div>
  )
}

function stopHeaderPointerEvent(event: React.MouseEvent | React.PointerEvent) {
  event.stopPropagation()
}

function stopHeaderDragEvent(event: React.DragEvent) {
  event.stopPropagation()
}

export interface DataTableColumnFilterTriggerProps {
  columnId: string
  filterKind: ColumnFilterValue['kind']
  active: boolean
  value: ColumnFilterValue | undefined
  onChange: (columnId: string, value: ColumnFilterValue | null) => void
}

export function DataTableColumnFilterTrigger({
  columnId,
  filterKind,
  active,
  value,
  onChange,
}: DataTableColumnFilterTriggerProps) {
  const [open, setOpen] = useState(false)
  const [contentKey, setContentKey] = useState(0)

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      setContentKey((previous) => previous + 1)
    }
    setOpen(nextOpen)
  }, [])

  const handleApply = useCallback(
    (nextValue: ColumnFilterValue) => {
      onChange(columnId, nextValue)
    },
    [columnId, onChange],
  )

  const handleClear = useCallback(() => {
    onChange(columnId, null)
  }, [columnId, onChange])

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      trigger="click"
      placement="bottom"
      overlayInnerStyle={{ padding: 8 }}
      content={
        <DataTableColumnFilterContent
          key={contentKey}
          filterKind={filterKind}
          initialValue={value}
          onApply={handleApply}
          onClear={handleClear}
          onClose={handleClose}
        />
      }
    >
      <button
        type="button"
        draggable={false}
        className={`dt-filter-icon${active ? ' dt-filter-icon--active' : ''}`}
        aria-label="Filter column"
        onClick={stopHeaderPointerEvent}
        onPointerDown={stopHeaderPointerEvent}
        onDragStart={stopHeaderDragEvent}
      >
        <Icon name="filter" size="sm" />
      </button>
    </Popover>
  )
}
