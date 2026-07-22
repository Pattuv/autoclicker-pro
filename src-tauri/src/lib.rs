mod engine;
mod mouse;
mod permissions;
mod types;

use engine::ClickEngine;
use permissions::{is_accessibility_granted, open_accessibility_settings, prompt_accessibility};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, RunEvent, State, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use types::{ClickerConfig, EngineState, SetupStatus, ToastPayload};

struct AppState {
    engine: Arc<ClickEngine>,
}

fn setup_status(_engine: &ClickEngine) -> SetupStatus {
    let accessibility_granted = is_accessibility_granted();
    SetupStatus {
        accessibility_granted,
        ready: accessibility_granted,
    }
}

#[tauri::command]
fn get_setup_status(state: State<'_, AppState>) -> SetupStatus {
    setup_status(&state.engine)
}

#[tauri::command]
fn open_accessibility(state: State<'_, AppState>) -> Result<SetupStatus, String> {
    prompt_accessibility();
    open_accessibility_settings()?;
    Ok(setup_status(&state.engine))
}

#[tauri::command]
fn refresh_setup(state: State<'_, AppState>) -> SetupStatus {
    setup_status(&state.engine)
}

#[tauri::command]
fn get_config(state: State<'_, AppState>) -> ClickerConfig {
    state.engine.get_config()
}

#[tauri::command]
fn set_config(state: State<'_, AppState>, config: ClickerConfig) -> ClickerConfig {
    state.engine.set_config(config);
    state.engine.get_config()
}

#[tauri::command]
fn get_engine_state(state: State<'_, AppState>) -> EngineState {
    state.engine.get_state()
}

#[tauri::command]
async fn start_engine(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let setup = setup_status(&state.engine);
    if !setup.ready {
        return Err("Grant Accessibility permission before starting.".to_string());
    }
    state.engine.start(app, false);
    Ok(())
}

#[tauri::command]
async fn stop_engine(app: AppHandle, state: State<'_, AppState>) -> Result<EngineState, String> {
    state.engine.stop(&app).await;
    Ok(state.engine.get_state())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let engine = Arc::new(ClickEngine::new());
    let engine_for_exit = engine.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler({
                    let engine = engine.clone();
                    move |app, shortcut, event| {
                        if event.state != ShortcutState::Pressed {
                            return;
                        }
                        let expected =
                            Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::KeyC);
                        if shortcut != &expected {
                            return;
                        }

                        let app = app.clone();
                        let engine = engine.clone();
                        tauri::async_runtime::spawn(async move {
                            if engine.is_busy() {
                                engine.stop(&app).await;
                                return;
                            }
                            let setup = setup_status(&engine);
                            if !setup.ready {
                                let _ = app.emit(
                                    "toast",
                                    ToastPayload {
                                        id: format!(
                                            "{}",
                                            std::time::SystemTime::now()
                                                .duration_since(std::time::UNIX_EPOCH)
                                                .map(|d| d.as_millis())
                                                .unwrap_or(0)
                                        ),
                                        title: "Setup required".into(),
                                        description: Some(
                                            "Grant Accessibility permission before starting.".into(),
                                        ),
                                        variant: Some("destructive".into()),
                                    },
                                );
                                return;
                            }
                            engine.start(app, true);
                        });
                    }
                })
                .build(),
        )
        .manage(AppState {
            engine: engine.clone(),
        })
        .setup(|app| {
            let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::KeyC);
            app.global_shortcut().register(shortcut)?;

            let handle = app.handle().clone();
            let engine = app.state::<AppState>().engine.clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(2));
                loop {
                    interval.tick().await;
                    let status = setup_status(&engine);
                    let _ = handle.emit("setup:changed", status);
                }
            });

            Ok(())
        })
        // macOS: red traffic-light closes the window but keeps the app running in the Dock
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_setup_status,
            open_accessibility,
            refresh_setup,
            get_config,
            set_config,
            get_engine_state,
            start_engine,
            stop_engine
        ])
        .build(tauri::generate_context!())
        .expect("error while building AutoClicker Pro")
        .run(move |app_handle, event| {
            match event {
                // Dock icon click while window is hidden → show again
                RunEvent::Reopen {
                    has_visible_windows,
                    ..
                } => {
                    if !has_visible_windows {
                        if let Some(win) = app_handle.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                }
                RunEvent::Exit => {
                    engine_for_exit.force_release_on_quit();
                }
                _ => {}
            }
        });
}
