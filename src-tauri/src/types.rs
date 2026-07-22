use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ClickMode {
    Spam,
    Hold,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum MouseButton {
    Left,
    Right,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ClickType {
    Single,
    Double,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClickerConfig {
    pub mode: ClickMode,
    pub speed: u32,
    pub button: MouseButton,
    pub click_type: ClickType,
    pub stop_after_clicks_enabled: bool,
    pub stop_after_clicks: u64,
    pub stop_after_duration_enabled: bool,
    pub stop_after_duration_sec: u64,
    pub countdown_sec: u32,
}

impl Default for ClickerConfig {
    fn default() -> Self {
        Self {
            mode: ClickMode::Spam,
            speed: 10,
            button: MouseButton::Left,
            click_type: ClickType::Single,
            stop_after_clicks_enabled: false,
            stop_after_clicks: 100,
            stop_after_duration_enabled: false,
            stop_after_duration_sec: 30,
            countdown_sec: 5,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum EngineStatus {
    Idle,
    Countdown,
    Running,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineState {
    pub status: EngineStatus,
    pub click_count: u64,
    pub elapsed_ms: u64,
    pub countdown_remaining: u32,
}

impl Default for EngineState {
    fn default() -> Self {
        Self {
            status: EngineStatus::Idle,
            click_count: 0,
            elapsed_ms: 0,
            countdown_remaining: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetupStatus {
    pub accessibility_granted: bool,
    pub ready: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToastPayload {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub variant: Option<String>,
}
