import { useEffect, useState, type JSX, type MouseEvent as ReactMouseEvent } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { MousePointer2 } from 'lucide-react'
import { ScrollArea } from '@/components/ScrollArea'
import { SetupGate } from '@/components/SetupGate'
import { Row, Section, Segmented, Slider, Switch, ToastProvider } from '@/components/ui'
import { api } from '@/lib/api'
import { cn, formatNumber } from '@/lib/utils'
import {
  ClickerConfig,
  DEFAULT_CONFIG,
  DEFAULT_ENGINE_STATE,
  EngineState,
  HOTKEY_DISPLAY,
  SetupStatus,
  ToastPayload
} from '@/types'

export default function App(): JSX.Element {
  const [config, setConfig] = useState<ClickerConfig>(DEFAULT_CONFIG)
  const [engine, setEngine] = useState<EngineState>(DEFAULT_ENGINE_STATE)
  const [setup, setSetup] = useState<SetupStatus>({
    accessibilityGranted: false,
    ready: false
  })
  const [toasts, setToasts] = useState<ToastPayload[]>([])
  const [booting, setBooting] = useState(true)

  const locked = engine.status !== 'idle'
  const isHold = config.mode === 'hold'
  const isRunning = engine.status === 'running' || engine.status === 'countdown'

  useEffect(() => {
    let mounted = true
    const unsubs: Array<() => void> = []

    const boot = async (): Promise<void> => {
      const [status, cfg, state] = await Promise.all([
        api.getSetupStatus(),
        api.getConfig(),
        api.getEngineState()
      ])
      if (!mounted) return
      setSetup(status)
      setConfig(cfg)
      setEngine(state)
      setBooting(false)

      unsubs.push(await api.onEngineState(setEngine))
      unsubs.push(await api.onSetupChanged(setSetup))
      unsubs.push(
        await api.onToast((toast) => setToasts((prev) => [...prev, toast]))
      )
    }

    void boot()
    return () => {
      mounted = false
      unsubs.forEach((u) => u())
    }
  }, [])

  const pushConfig = async (next: ClickerConfig): Promise<void> => {
    setConfig(next)
    await api.setConfig(next)
  }

  const update = <K extends keyof ClickerConfig>(key: K, value: ClickerConfig[K]): void => {
    const next = { ...config, [key]: value }
    if (key === 'mode' && value === 'hold') {
      next.button = 'left'
      next.stopAfterClicksEnabled = false
    }
    void pushConfig(next)
  }

  const toggleRun = async (): Promise<void> => {
    if (locked) {
      await api.stop()
      return
    }
    try {
      await api.start()
    } catch (err) {
      setToasts((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          title: 'Cannot start',
          description: err instanceof Error ? err.message : String(err),
          variant: 'destructive'
        }
      ])
    }
  }

  if (booting) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  const statusLabel =
    engine.status === 'countdown'
      ? 'Countdown'
      : engine.status === 'running'
        ? 'Clicking'
        : 'Idle'

  return (
    <ToastProvider toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))}>
      <div className="flex h-full flex-col bg-background">
        <header
          data-tauri-drag-region
          className="titlebar-drag relative z-10 flex h-12 shrink-0 items-center justify-center px-4"
          onMouseDown={(e: ReactMouseEvent<HTMLElement>) => {
            // Explicit startDragging — data-tauri-drag-region alone fails without the ACL permission
            if (e.button !== 0) return
            if ((e.target as HTMLElement).closest('[data-no-drag]')) return
            void getCurrentWindow().startDragging()
          }}
        >
          <h1 className="pointer-events-none text-[13px] font-medium tracking-tight text-white/90">
            AutoClicker Pro
          </h1>
          <div
            data-no-drag
            className="titlebar-no-drag absolute right-3 top-1/2 -translate-y-1/2"
          >
            <StatusPill label={statusLabel} active={isRunning} />
          </div>
        </header>

        <ScrollArea className="titlebar-no-drag">
          <div className="mx-auto flex max-w-[420px] flex-col gap-5 px-5 pb-8">
            <SetupGate setup={setup} onSetupChange={setSetup} />

            <div className="pt-2 text-center">
              <p className="text-[56px] font-semibold leading-none tracking-tight tabular-nums">
                {isHold && engine.status === 'running'
                  ? formatElapsedShort(engine.elapsedMs)
                  : engine.status === 'countdown'
                    ? engine.countdownRemaining
                    : formatNumber(engine.clickCount)}
              </p>
              <p className="mt-2 text-[13px] text-muted-foreground">
                {engine.status === 'countdown'
                  ? 'starting in'
                  : isHold && engine.status === 'running'
                    ? 'hold time'
                    : 'total clicks'}
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={!locked && !setup.ready}
                onClick={() => void toggleRun()}
                className={cn(
                  'flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[17px] font-semibold transition-colors',
                  'disabled:opacity-40',
                  isRunning
                    ? 'bg-destructive text-white hover:bg-destructive-hover'
                    : 'bg-brand text-white hover:bg-brand-hover active:bg-brand-active'
                )}
              >
                {!isRunning ? <MousePointer2 className="h-[18px] w-[18px]" /> : null}
                {engine.status === 'countdown'
                  ? 'Cancel'
                  : engine.status === 'running'
                    ? 'Stop'
                    : 'Start'}
              </button>
              <p className="text-center text-[12px] text-muted-foreground">
                or press {HOTKEY_DISPLAY}
              </p>
            </div>

            <Section title="Mode">
              <Row>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px]">Click mode</span>
                  <Segmented
                    value={config.mode}
                    disabled={locked}
                    onChange={(mode) => update('mode', mode)}
                    options={[
                      { value: 'spam', label: 'Spam' },
                      { value: 'hold', label: 'Hold' }
                    ]}
                  />
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                  Spam repeats clicks; Hold presses and holds.
                </p>
              </Row>

              {!isHold ? (
                <Row last>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[15px]">Speed</span>
                    <div className="flex h-7 min-w-[40px] items-center justify-center rounded-md bg-card-elevated px-2 text-[13px] font-medium tabular-nums">
                      {config.speed}
                    </div>
                  </div>
                  <div className="mt-3">
                    <Slider
                      value={config.speed}
                      disabled={locked}
                      onChange={(speed) => update('speed', speed)}
                    />
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                    Clicks per second. Max speed may be less than 100 CPS due to hardware
                    limitations.
                  </p>
                </Row>
              ) : (
                <Row last>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    Holds the left mouse button until stopped. Duration stop is supported;
                    click-count stop is not.
                  </p>
                </Row>
              )}
            </Section>

            {!isHold ? (
              <Section title="Click">
                <Row>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[15px]">Button</span>
                    <Segmented
                      value={config.button}
                      disabled={locked}
                      onChange={(button) => update('button', button)}
                      options={[
                        { value: 'left', label: 'Left' },
                        { value: 'right', label: 'Right' }
                      ]}
                    />
                  </div>
                </Row>
                <Row last>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[15px]">Type</span>
                    <Segmented
                      value={config.clickType}
                      disabled={locked}
                      onChange={(clickType) => update('clickType', clickType)}
                      options={[
                        { value: 'single', label: 'Single' },
                        { value: 'double', label: 'Double' }
                      ]}
                    />
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                    {config.button === 'right' && config.clickType === 'double'
                      ? 'Right double-click is simulated as two rapid right clicks.'
                      : 'Double sends two rapid clicks.'}
                  </p>
                </Row>
              </Section>
            ) : null}

            <Section title="Stop conditions">
              {!isHold ? (
                <LimitToggle
                  label="Stop after clicks"
                  enabled={config.stopAfterClicksEnabled}
                  disabled={locked}
                  value={config.stopAfterClicks}
                  suffix=""
                  onEnabledChange={(v) => update('stopAfterClicksEnabled', v)}
                  onValueChange={(v) => update('stopAfterClicks', v)}
                  last={false}
                />
              ) : null}
              <LimitToggle
                label="Stop after time"
                enabled={config.stopAfterDurationEnabled}
                disabled={locked}
                value={config.stopAfterDurationSec}
                suffix="s"
                onEnabledChange={(v) => update('stopAfterDurationEnabled', v)}
                onValueChange={(v) => update('stopAfterDurationSec', v)}
                last
              />
            </Section>

            <Section title="Options">
              <Row last>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px]">Start countdown</span>
                  <div className="flex items-center gap-1 rounded-lg bg-card-elevated px-2 py-1">
                    <input
                      type="number"
                      min={0}
                      max={60}
                      disabled={locked}
                      value={config.countdownSec}
                      onChange={(e) => {
                        const n = Number(e.target.value)
                        update(
                          'countdownSec',
                          Number.isFinite(n) ? Math.max(0, Math.min(60, Math.floor(n))) : 0
                        )
                      }}
                      className="w-10 bg-transparent text-right text-[15px] tabular-nums outline-none disabled:opacity-45"
                    />
                    <span className="text-[13px] text-muted-foreground">s</span>
                  </div>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                  Delay before clicking begins.
                </p>
              </Row>
            </Section>
          </div>
        </ScrollArea>
      </div>
    </ToastProvider>
  )
}

function StatusPill({ label, active }: { label: string; active: boolean }): JSX.Element {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-brand' : 'bg-muted-foreground/70'
        )}
      />
      {label}
    </div>
  )
}

function LimitToggle({
  label,
  enabled,
  disabled,
  value,
  suffix,
  onEnabledChange,
  onValueChange,
  last
}: {
  label: string
  enabled: boolean
  disabled?: boolean
  value: number
  suffix: string
  onEnabledChange: (v: boolean) => void
  onValueChange: (v: number) => void
  last?: boolean
}): JSX.Element {
  return (
    <Row last={last}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px]">{label}</span>
        <Switch checked={enabled} disabled={disabled} onCheckedChange={onEnabledChange} />
      </div>
      {enabled ? (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={1}
            disabled={disabled}
            value={value}
            onChange={(e) => {
              const n = Number(e.target.value)
              onValueChange(Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1)
            }}
            className="h-8 w-24 rounded-lg bg-card-elevated px-3 text-[14px] tabular-nums outline-none disabled:opacity-45"
          />
          {suffix ? <span className="text-[13px] text-muted-foreground">{suffix}</span> : null}
        </div>
      ) : null}
    </Row>
  )
}

function formatElapsedShort(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m > 0) return `${m}:${String(s).padStart(2, '0')}`
  return `${s}`
}
