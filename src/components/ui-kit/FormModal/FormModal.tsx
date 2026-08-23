import type { CSSProperties, FormHTMLAttributes, ReactNode } from 'react'
import { createContext, useCallback, useContext, type MouseEvent } from 'react'
import { Button } from '@/components/ui-kit/Button'
import { Modal, type ModalProps } from '@/components/ui-kit/Modal'
import { cn } from '@/lib/utils'

/** Maximum dialog width for asset create/edit modals. */
const FORM_MODAL_MAX_WIDTH_PX = 700

const VIEWPORT_SAFE_WIDTH = 'calc(100vw - 1rem)'

type FormModalCancelEvent = Parameters<NonNullable<ModalProps['onCancel']>>[0]

const FormModalContext = createContext<{
  onCancel?: (event?: FormModalCancelEvent) => void
  isDirty?: boolean
}>({})

function useFormModalContext() {
  return useContext(FormModalContext)
}

function resolveFormModalWidth(width: ModalProps['width'] | undefined): ModalProps['width'] {
  const defaultWidth = `min(${FORM_MODAL_MAX_WIDTH_PX}px, ${VIEWPORT_SAFE_WIDTH})`
  if (width == null) return defaultWidth

  if (typeof width === 'number') {
    const capped = Math.min(width, FORM_MODAL_MAX_WIDTH_PX)
    return `min(${capped}px, ${VIEWPORT_SAFE_WIDTH})`
  }

  return width
}

const DIRTY_FORM_CONFIRM_MESSAGE = 'You have unsaved changes. Are you sure you want to close this form?'


function canCloseDirtyForm(isDirty: boolean): boolean {
  if (!isDirty) return true
  if (typeof globalThis.confirm !== 'function') return true
  return globalThis.confirm(DIRTY_FORM_CONFIRM_MESSAGE)
}

export type FormModalProps = Omit<ModalProps, 'title' | 'footer' | 'layoutVariant' | 'scrollBody'> & {
  /** Horizontal inset for header/body/footer content. Defaults to clamp(1rem, 4vw, 1.5rem). */
  padding?: string
  /** Prevent accidental dismissal while the form contains unsaved changes. */
  isDirty?: boolean
  /** Alias for `isDirty`, retained for callers that use the shorter name. */
  dirty?: boolean
  children: ReactNode
}

export function FormModal({
  padding = 'clamp(1rem, 4vw, 1.5rem)',
  width,
  children,
  classNames,
  styles,
  centered = true,
  onCancel,
  closable = false,
  isDirty = false,
  dirty = false,
  ...rest
}: FormModalProps) {
  const isFormDirty = isDirty || dirty
  const guardedOnCancel = useCallback(
    (event?: FormModalCancelEvent) => {
      if (!canCloseDirtyForm(isFormDirty)) return
      if (event && onCancel) {
        onCancel(event)
      } else if (onCancel) {
        onCancel(event as FormModalCancelEvent)
      }
    },
    [isFormDirty, onCancel],
  )
  const effectiveOnCancel = onCancel ? guardedOnCancel : undefined

  const classNamesObj = typeof classNames === 'object' && classNames
    ? (classNames as Record<string, string | undefined>)
    : {}

  const stylesObj = asStylesObject(styles)

  const rootStyle = {
    '--ff-modal-px': padding,
  } as CSSProperties

  const containerStyle = {
    ...stylesObj.container,
    padding: 0,
    '--ff-modal-px': padding,
  } as CSSProperties

  return (
    <FormModalContext.Provider value={{ onCancel: effectiveOnCancel, isDirty: isFormDirty }}>
      <Modal
        {...rest}
        centered={centered}
        closable={closable}
        onCancel={effectiveOnCancel}
        title={null}
        footer={null}
        layoutVariant="form"
        width={resolveFormModalWidth(width)}
        classNames={{
          ...classNamesObj,
          root: cn('ff-form-modal', classNamesObj.root),
          header: cn('!hidden', classNamesObj.header),
        }}
        styles={{
          ...stylesObj,
          wrapper: {
            paddingInline: 'max(0.5rem, env(safe-area-inset-left, 0px))',
            ...stylesObj.wrapper,
          },
          container: {
            maxWidth: FORM_MODAL_MAX_WIDTH_PX,
            width: '100%',
            margin: '0 auto',
            maxHeight: `min(calc(100dvh - 1rem), ${FORM_MODAL_MAX_WIDTH_PX + 120}px)`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            ...containerStyle,
          },
          body: {
            maxHeight: 'min(calc(100dvh - 6rem), 720px)',
            flex: 1,
            minHeight: 0,
            padding: 0,
            ...stylesObj.body,
          },
          header: { display: 'none', margin: 0, padding: 0, ...stylesObj.header },
        }}
      >
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          style={rootStyle}
        >
          {children}
        </div>
      </Modal>
    </FormModalContext.Provider>
  )
}

function asStylesObject(styles: ModalProps['styles'] | undefined): Record<string, CSSProperties | undefined> {
  return typeof styles === 'object' && styles ? (styles as Record<string, CSSProperties | undefined>) : {}
}

export interface FormModalHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Optional header actions (e.g. template picker). Rendered beside the title on wider screens. */
  actions?: ReactNode
  className?: string
}

export function FormModalHeader({
  title,
  description,
  actions,
  className,
}: FormModalHeaderProps) {
  const { onCancel } = useFormModalContext()

  const handleClose = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onCancel?.(event)
    },
    [onCancel],
  )

  return (
    <div className={cn('shrink-0 border-b border-border bg-background', className)}>
      <div
        className="flex flex-wrap items-center gap-3 py-3"
        style={{ paddingInline: 'var(--ff-modal-px)' }}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-base font-semibold leading-snug text-foreground">
            {title}
          </div>
          {description ? (
            <div className="text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="order-3 min-w-0 w-full sm:order-2 sm:w-auto sm:shrink-0">
            {actions}
          </div>
        ) : null}
        {onCancel ? (
          <Button
            type="text"
            htmlType="button"
            size="md"
            iconName="x"
            aria-label="Close"
            className="order-2 shrink-0 text-foreground/60 hover:bg-muted hover:text-foreground sm:order-3"
            onClick={handleClose}
          />
        ) : null}
      </div>
    </div>
  )
}

export interface FormModalBodyProps {
  children: ReactNode
  className?: string
}

export function FormModalBody({ children, className }: FormModalBodyProps) {
  return (
    <div
      className={cn(
        'min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain pt-4 pb-4',
        '[&_form]:min-w-0',
        className,
      )}
      style={{ paddingInline: 'var(--ff-modal-px)' }}
    >
      {children}
    </div>
  )
}

/** Standard single-column form layout for FormModal bodies. */
export function FormModalForm({
  className,
  children,
  ...rest
}: FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form
      className={cn('grid min-w-0 grid-cols-1 gap-4', className)}
      {...rest}
    >
      {children}
    </form>
  )
}

/** Responsive two-column field grid; stacks on narrow viewports. */
export function FormModalFieldGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start', className)}>
      {children}
    </div>
  )
}

const formModalFooterInnerClass =
  'flex w-full min-w-0 flex-col-reverse gap-2 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end [&_button]:w-full sm:[&_button]:w-auto'

export interface FormModalFooterProps {
  children: ReactNode
  className?: string
}

function FormModalFooter({ children, className }: FormModalFooterProps) {
  return (
    <div className={cn('shrink-0 border-t border-border bg-background', className)}>
      <div
        className={formModalFooterInnerClass}
        style={{ paddingInline: 'var(--ff-modal-px)' }}
      >
        {children}
      </div>
    </div>
  )
}

export interface FormModalFooterSubmitProps {
  onCancel?: () => void
  formId?: string
  submitLabel: ReactNode
  cancelLabel?: ReactNode
  loading?: boolean
  disabled?: boolean
  /** Extra content rendered before the action buttons (e.g. ID preview, "Create & New"). */
  extra?: ReactNode
}

export function FormModalFooterSubmit({
  onCancel,
  formId,
  submitLabel,
  cancelLabel = 'Cancel',
  loading = false,
  disabled = false,
  extra,
}: FormModalFooterSubmitProps) {
  const ctx = useFormModalContext()
  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      ctx.onCancel?.()
    }
  }

  return (
    <FormModalFooter>
      {extra ? (
        <div className="mr-auto flex min-w-0 flex-1 flex-wrap items-center gap-2 max-sm:mr-0 max-sm:w-full">
          {extra}
        </div>
      ) : null}
      <div className="flex w-full min-w-0 flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <Button htmlType="button" onClick={handleCancel} disabled={loading} className="w-full sm:w-auto">
          {cancelLabel}
        </Button>
        <Button
          type="primary"
          htmlType={formId ? 'submit' : 'button'}
          form={formId}
          loading={loading}
          disabled={disabled}
          className="w-full sm:w-auto"
        >
          {submitLabel}
        </Button>
      </div>
    </FormModalFooter>
  )
}

export { FormModalFooter }
