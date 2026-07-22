use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use tauri::{AppHandle, Emitter};
use tokio::sync::watch;

use crate::mouse;
use crate::types::{ClickMode, ClickerConfig, EngineState, EngineStatus, MouseButton, ToastPayload};

pub struct ClickEngine {
    inner: Arc<Mutex<Inner>>,
}

struct Inner {
    config: ClickerConfig,
    state: EngineState,
    cancel_tx: Option<watch::Sender<bool>>,
    hold_active: bool,
    run_task: Option<tokio::task::JoinHandle<()>>,
}

impl ClickEngine {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(Inner {
                config: ClickerConfig::default(),
                state: EngineState::default(),
                cancel_tx: None,
                hold_active: false,
                run_task: None,
            })),
        }
    }

    pub fn get_state(&self) -> EngineState {
        self.inner.lock().state.clone()
    }

    pub fn get_config(&self) -> ClickerConfig {
        self.inner.lock().config.clone()
    }

    pub fn set_config(&self, mut config: ClickerConfig) {
        if config.mode == ClickMode::Hold {
            config.button = MouseButton::Left;
            config.stop_after_clicks_enabled = false;
        }
        config.speed = config.speed.clamp(1, 100);
        self.inner.lock().config = config;
    }

    pub fn is_busy(&self) -> bool {
        self.inner.lock().state.status != EngineStatus::Idle
    }

    pub fn force_release_on_quit(&self) {
        let mut inner = self.inner.lock();
        if let Some(tx) = inner.cancel_tx.take() {
            let _ = tx.send(true);
        }
        if inner.hold_active {
            let _ = mouse::mouse_up(MouseButton::Left);
            inner.hold_active = false;
        }
    }

    pub async fn stop(&self, app: &AppHandle) {
        let handle = {
            let mut inner = self.inner.lock();
            if let Some(tx) = inner.cancel_tx.take() {
                let _ = tx.send(true);
            }
            if inner.hold_active {
                let _ = mouse::mouse_up(MouseButton::Left);
                inner.hold_active = false;
            }
            inner.run_task.take()
        };

        if let Some(handle) = handle {
            let _ = handle.await;
        }

        self.set_idle(app);
    }

    pub fn start(&self, app: AppHandle, skip_countdown: bool) {
        if self.is_busy() {
            return;
        }

        let (cancel_tx, cancel_rx) = watch::channel(false);
        let mut config = self.inner.lock().config.clone();
        if skip_countdown {
            config.countdown_sec = 0;
        }

        {
            let mut inner = self.inner.lock();
            inner.cancel_tx = Some(cancel_tx);
            let countdown = config.countdown_sec;
            inner.state = EngineState {
                status: if countdown > 0 {
                    EngineStatus::Countdown
                } else {
                    EngineStatus::Running
                },
                click_count: 0,
                elapsed_ms: 0,
                countdown_remaining: countdown,
            };
        }
        emit_state(&app, &self.get_state());

        let engine = self.inner.clone();
        let handle = tokio::spawn(async move {
            run_session(engine, app, config, cancel_rx).await;
        });
        self.inner.lock().run_task = Some(handle);
    }

    fn set_idle(&self, app: &AppHandle) {
        {
            let mut inner = self.inner.lock();
            inner.state.status = EngineStatus::Idle;
            inner.state.countdown_remaining = 0;
            inner.cancel_tx = None;
            inner.run_task = None;
        }
        emit_state(app, &self.get_state());
    }
}

async fn run_session(
    engine: Arc<Mutex<Inner>>,
    app: AppHandle,
    config: ClickerConfig,
    mut cancel_rx: watch::Receiver<bool>,
) {
    let countdown = config.countdown_sec;
    if countdown > 0 {
        let mut remaining = countdown;
        while remaining > 0 {
            if *cancel_rx.borrow() {
                finish_idle(&engine, &app);
                return;
            }
            {
                let mut inner = engine.lock();
                inner.state.countdown_remaining = remaining;
                inner.state.status = EngineStatus::Countdown;
            }
            emit_state(&app, &engine.lock().state);
            sleep_interruptible(1000, &mut cancel_rx).await;
            if *cancel_rx.borrow() {
                finish_idle(&engine, &app);
                return;
            }
            remaining -= 1;
        }
    }

    if *cancel_rx.borrow() {
        finish_idle(&engine, &app);
        return;
    }

    let started = Instant::now();
    {
        let mut inner = engine.lock();
        inner.state.status = EngineStatus::Running;
        inner.state.countdown_remaining = 0;
        inner.state.elapsed_ms = 0;
    }
    emit_state(&app, &engine.lock().state);

    let stats_engine = engine.clone();
    let stats_app = app.clone();
    let mut stats_rx = cancel_rx.clone();
    let stats_task = tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = stats_rx.changed() => {
                    if *stats_rx.borrow() { break; }
                }
                _ = tokio::time::sleep(Duration::from_millis(100)) => {
                    let mut inner = stats_engine.lock();
                    if inner.state.status == EngineStatus::Running {
                        inner.state.elapsed_ms = started.elapsed().as_millis() as u64;
                        let state = inner.state.clone();
                        drop(inner);
                        emit_state(&stats_app, &state);
                    }
                }
            }
        }
    });

    let result = if config.mode == ClickMode::Hold {
        run_hold(&engine, &config, &mut cancel_rx, started).await
    } else {
        run_spam(&engine, &app, &config, &mut cancel_rx, started).await
    };

    stats_task.abort();

    if let Err(err) = result {
        if !*cancel_rx.borrow() {
            emit_toast(&app, "Error", &format!("Click engine error: {err}"));
        }
    }

    {
        let mut inner = engine.lock();
        if inner.hold_active {
            let _ = mouse::mouse_up(MouseButton::Left);
            inner.hold_active = false;
        }
        inner.state.elapsed_ms = started.elapsed().as_millis() as u64;
    }

    finish_idle(&engine, &app);
}

async fn run_hold(
    engine: &Arc<Mutex<Inner>>,
    config: &ClickerConfig,
    cancel_rx: &mut watch::Receiver<bool>,
    started: Instant,
) -> Result<(), String> {
    // CGEvent must run off the async runtime's blocking concerns — it's fast sync FFI
    mouse::mouse_down(MouseButton::Left)?;
    if *cancel_rx.borrow() {
        let _ = mouse::mouse_up(MouseButton::Left);
        return Ok(());
    }
    engine.lock().hold_active = true;

    let duration_limit = if config.stop_after_duration_enabled && config.stop_after_duration_sec > 0
    {
        Some(Duration::from_secs(config.stop_after_duration_sec))
    } else {
        None
    };

    while !*cancel_rx.borrow() {
        if let Some(limit) = duration_limit {
            if started.elapsed() >= limit {
                break;
            }
        }
        sleep_interruptible(50, cancel_rx).await;
    }

    if engine.lock().hold_active {
        let _ = mouse::mouse_up(MouseButton::Left);
        engine.lock().hold_active = false;
    }
    Ok(())
}

/// Wall-clock rate accumulator + native CGEvent clicks (no subprocess storm).
async fn run_spam(
    engine: &Arc<Mutex<Inner>>,
    app: &AppHandle,
    config: &ClickerConfig,
    cancel_rx: &mut watch::Receiver<bool>,
    started: Instant,
) -> Result<(), String> {
    let cps = config.speed.clamp(1, 100) as f64;
    let max_backlog = cps; // ~1 second catch-up cap
    let tick_ms = ((1000.0 / cps).round() as u64).clamp(1, 20);

    let mut backlog = 0.0_f64;
    let mut last_tick = Instant::now();
    let mut last_emit = Instant::now();

    while !*cancel_rx.borrow() {
        if should_stop_spam(engine, config, started) {
            break;
        }

        let now = Instant::now();
        let dt_ms = now.duration_since(last_tick).as_secs_f64() * 1000.0;
        last_tick = now;

        backlog += dt_ms * (cps / 1000.0);
        if backlog > max_backlog {
            backlog = max_backlog;
        }

        while backlog >= 1.0 && !*cancel_rx.borrow() {
            if should_stop_spam(engine, config, started) {
                break;
            }
            if config.stop_after_clicks_enabled {
                let current = engine.lock().state.click_count;
                if current >= config.stop_after_clicks {
                    backlog = 0.0;
                    break;
                }
            }

            // Post one real click at the current cursor — microsecond-scale, no fork
            mouse::click_at_cursor(config.button, config.click_type)?;
            backlog -= 1.0;

            {
                let mut inner = engine.lock();
                inner.state.click_count += 1;
                inner.state.elapsed_ms = started.elapsed().as_millis() as u64;
                if last_emit.elapsed() >= Duration::from_millis(50)
                    || (config.stop_after_clicks_enabled
                        && inner.state.click_count >= config.stop_after_clicks)
                {
                    let state = inner.state.clone();
                    drop(inner);
                    emit_state(app, &state);
                    last_emit = Instant::now();
                }
            }
        }

        if should_stop_spam(engine, config, started) {
            break;
        }

        sleep_interruptible(tick_ms, cancel_rx).await;
    }

    {
        let mut inner = engine.lock();
        inner.state.elapsed_ms = started.elapsed().as_millis() as u64;
        let state = inner.state.clone();
        drop(inner);
        emit_state(app, &state);
    }

    Ok(())
}

fn should_stop_spam(engine: &Arc<Mutex<Inner>>, config: &ClickerConfig, started: Instant) -> bool {
    let count = engine.lock().state.click_count;
    if config.stop_after_clicks_enabled && count >= config.stop_after_clicks {
        return true;
    }
    if config.stop_after_duration_enabled
        && config.stop_after_duration_sec > 0
        && started.elapsed() >= Duration::from_secs(config.stop_after_duration_sec)
    {
        return true;
    }
    false
}

async fn sleep_interruptible(ms: u64, cancel: &mut watch::Receiver<bool>) {
    if *cancel.borrow() || ms == 0 {
        return;
    }
    tokio::select! {
        _ = tokio::time::sleep(Duration::from_millis(ms)) => {}
        _ = cancel.changed() => {}
    }
}

fn finish_idle(engine: &Arc<Mutex<Inner>>, app: &AppHandle) {
    {
        let mut inner = engine.lock();
        inner.state.status = EngineStatus::Idle;
        inner.state.countdown_remaining = 0;
        inner.cancel_tx = None;
        inner.run_task = None;
    }
    emit_state(app, &engine.lock().state);
}

fn emit_state(app: &AppHandle, state: &EngineState) {
    let _ = app.emit("engine:state", state);
}

fn emit_toast(app: &AppHandle, title: &str, description: &str) {
    let _ = app.emit(
        "toast",
        ToastPayload {
            id: format!("{}", chrono_like_id()),
            title: title.to_string(),
            description: Some(description.to_string()),
            variant: Some("destructive".to_string()),
        },
    );
}

fn chrono_like_id() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}
