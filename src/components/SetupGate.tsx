import { useEffect, type JSX } from 'react'
import { MousePointer2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { SetupStatus } from '@/types'

let promptStarted = false

export function SetupGate({
  setup,
  onSetupChange
}: {
  setup: SetupStatus
  onSetupChange: (status: SetupStatus) => void
}): JSX.Element | null {
  useEffect(() => {
    if (setup.ready || promptStarted) return
    const timer = window.setTimeout(() => {
      if (promptStarted) return
      promptStarted = true
      void api.promptAccessibility().then(onSetupChange)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [setup.ready, onSetupChange])

  if (setup.ready) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-prompt-title"
      className="titlebar-no-drag absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-6"
    >
      <div className="w-full max-w-[320px] rounded-2xl bg-card px-6 py-7 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-card-elevated">
          <MousePointer2 className="h-6 w-6" />
        </div>
        <h2 id="accessibility-prompt-title" className="mt-4 text-[17px] font-semibold">
          Enable Accessibility
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Turn on AutoClicker Pro under Accessibility. If the switch is already on and this stays
          up, macOS is still remembering an older copy of the app.
        </p>
        <button
          type="button"
          onClick={() => void api.openAccessibility().then(onSetupChange)}
          className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-brand text-[15px] font-semibold text-white hover:bg-brand-hover active:bg-brand-active"
        >
          Open System Settings
        </button>
        <button
          type="button"
          onClick={() => void api.resetAccessibility()}
          className="mt-3 text-[13px] font-medium text-muted-foreground hover:text-white"
        >
          Reset and ask again
        </button>
      </div>
    </div>
  )
}
