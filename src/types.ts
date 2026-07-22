export type ClickMode = 'spam' | 'hold'
export type MouseButton = 'left' | 'right'
export type ClickType = 'single' | 'double'

export interface ClickerConfig {
  mode: ClickMode
  speed: number
  button: MouseButton
  clickType: ClickType
  stopAfterClicksEnabled: boolean
  stopAfterClicks: number
  stopAfterDurationEnabled: boolean
  stopAfterDurationSec: number
  countdownSec: number
}

export type EngineStatus = 'idle' | 'countdown' | 'running'

export interface EngineState {
  status: EngineStatus
  clickCount: number
  elapsedMs: number
  countdownRemaining: number
}

export interface SetupStatus {
  accessibilityGranted: boolean
  ready: boolean
}

export interface ToastPayload {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export const DEFAULT_CONFIG: ClickerConfig = {
  mode: 'spam',
  speed: 10,
  button: 'left',
  clickType: 'single',
  stopAfterClicksEnabled: false,
  stopAfterClicks: 100,
  stopAfterDurationEnabled: false,
  stopAfterDurationSec: 30,
  countdownSec: 5
}

export const DEFAULT_ENGINE_STATE: EngineState = {
  status: 'idle',
  clickCount: 0,
  elapsedMs: 0,
  countdownRemaining: 0
}

export const HOTKEY_DISPLAY = '⌘ ⌥ C'
