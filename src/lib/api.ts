import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { ClickerConfig, EngineState, SetupStatus, ToastPayload } from '@/types'

export const api = {
  getSetupStatus: () => invoke<SetupStatus>('get_setup_status'),
  openAccessibility: () => invoke<SetupStatus>('open_accessibility'),
  refreshSetup: () => invoke<SetupStatus>('refresh_setup'),
  getConfig: () => invoke<ClickerConfig>('get_config'),
  setConfig: (config: ClickerConfig) => invoke<ClickerConfig>('set_config', { config }),
  getEngineState: () => invoke<EngineState>('get_engine_state'),
  start: () => invoke<void>('start_engine'),
  stop: () => invoke<EngineState>('stop_engine'),
  onEngineState: async (cb: (state: EngineState) => void): Promise<UnlistenFn> =>
    listen<EngineState>('engine:state', (e) => cb(e.payload)),
  onSetupChanged: async (cb: (status: SetupStatus) => void): Promise<UnlistenFn> =>
    listen<SetupStatus>('setup:changed', (e) => cb(e.payload)),
  onToast: async (cb: (toast: ToastPayload) => void): Promise<UnlistenFn> =>
    listen<ToastPayload>('toast', (e) => cb(e.payload))
}
