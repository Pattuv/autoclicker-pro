import type { JSX } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import type { SetupStatus } from '@/types'

export function SetupGate({
  setup,
  onSetupChange
}: {
  setup: SetupStatus
  onSetupChange: (status: SetupStatus) => void
  onToast?: (toast: { id: string; title: string; description?: string; variant?: 'default' | 'destructive' }) => void
}): JSX.Element | null {
  if (setup.ready) return null

  return (
    <div className="space-y-3 rounded-xl bg-card p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Accessibility required</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            AutoClicker Pro needs Accessibility access to synthesize mouse clicks.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg bg-card-elevated px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {setup.accessibilityGranted ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium">Accessibility</p>
            <p className="text-xs text-muted-foreground">
              {setup.accessibilityGranted
                ? 'Permission granted'
                : 'Required to control the mouse'}
            </p>
          </div>
        </div>
        {!setup.accessibilityGranted ? (
          <button
            type="button"
            onClick={() => void api.openAccessibility().then(onSetupChange)}
            className="titlebar-no-drag inline-flex h-8 items-center gap-1.5 rounded-full bg-segment-active px-3 text-xs font-medium text-white"
          >
            Open Settings
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
