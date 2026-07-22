import * as SliderPrimitive from '@radix-ui/react-slider'
import * as SwitchPrimitives from '@radix-ui/react-switch'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import type { JSX, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { ToastPayload } from '@/types'

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
}): JSX.Element {
  return (
    <div
      className={cn(
        'inline-flex rounded-full bg-segment p-0.5',
        disabled && 'pointer-events-none opacity-45'
      )}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-w-[72px] rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors',
              selected ? 'bg-segment-active text-white' : 'text-muted-foreground hover:text-white/80'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Slider({
  value,
  onChange,
  min = 1,
  max = 100,
  disabled
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
}): JSX.Element {
  return (
    <SliderPrimitive.Root
      className={cn(
        'relative flex w-full touch-none select-none items-center',
        disabled && 'pointer-events-none opacity-45'
      )}
      min={min}
      max={max}
      step={1}
      value={[value]}
      disabled={disabled}
      onValueChange={([v]) => onChange(v)}
    >
      <SliderPrimitive.Track className="relative h-[4px] w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-slider" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-[18px] w-[18px] rounded-full bg-white shadow-sm focus-visible:outline-none" />
    </SliderPrimitive.Root>
  )
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
}): JSX.Element {
  return (
    <SwitchPrimitives.Root
      id={id}
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      className={cn(
        'peer inline-flex h-[28px] w-[48px] shrink-0 cursor-pointer items-center rounded-full transition-colors',
        'focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45',
        checked ? 'bg-switch-on' : 'bg-muted'
      )}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          'pointer-events-none block h-[24px] w-[24px] rounded-full bg-white shadow transition-transform',
          'data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px]'
        )}
      />
    </SwitchPrimitives.Root>
  )
}

export function Section({
  title,
  children
}: {
  title: string
  children: ReactNode
}): JSX.Element {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[13px] font-medium text-section">{title}</h2>
      <div className="overflow-hidden rounded-xl bg-card">{children}</div>
    </section>
  )
}

export function Row({
  children,
  className,
  last
}: {
  children: ReactNode
  className?: string
  last?: boolean
}): JSX.Element {
  return (
    <div
      className={cn(
        'px-4 py-3',
        !last && 'border-b border-white/[0.06]',
        className
      )}
    >
      {children}
    </div>
  )
}

export function ToastProvider({
  toasts,
  onDismiss,
  children
}: {
  toasts: ToastPayload[]
  onDismiss: (id: string) => void
  children: ReactNode
}): JSX.Element {
  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={4500}>
      {children}
      {toasts.map((toast) => (
        <ToastPrimitive.Root
          key={toast.id}
          open
          onOpenChange={(open) => {
            if (!open) onDismiss(toast.id)
          }}
          className="pointer-events-auto relative flex w-full items-start gap-3 rounded-xl border border-white/10 bg-card p-4 shadow-lg"
        >
          <div className="flex-1 space-y-1">
            <ToastPrimitive.Title
              className={cn(
                'text-sm font-semibold',
                toast.variant === 'destructive' && 'text-destructive'
              )}
            >
              {toast.title}
            </ToastPrimitive.Title>
            {toast.description ? (
              <ToastPrimitive.Description className="text-xs leading-relaxed text-muted-foreground">
                {toast.description}
              </ToastPrimitive.Description>
            ) : null}
          </div>
          <ToastPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-white">
            <X className="h-4 w-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-50 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
    </ToastPrimitive.Provider>
  )
}
