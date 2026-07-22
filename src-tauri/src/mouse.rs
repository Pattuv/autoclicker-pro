//! Native macOS mouse synthesis via CoreGraphics CGEvent.
//! Posts events on the current cursor position — no subprocess, no overlapping click streams.

use crate::types::{ClickType, MouseButton};

#[cfg(target_os = "macos")]
mod sys {
    use std::ffi::c_void;

    #[repr(C)]
    #[derive(Clone, Copy)]
    pub struct CGPoint {
        pub x: f64,
        pub y: f64,
    }

    pub type CGEventRef = *mut c_void;
    pub type CGEventSourceRef = *mut c_void;

    pub const K_CG_EVENT_LEFT_MOUSE_DOWN: u32 = 1;
    pub const K_CG_EVENT_LEFT_MOUSE_UP: u32 = 2;
    pub const K_CG_EVENT_RIGHT_MOUSE_DOWN: u32 = 3;
    pub const K_CG_EVENT_RIGHT_MOUSE_UP: u32 = 4;
    pub const K_CG_MOUSE_BUTTON_LEFT: u32 = 0;
    pub const K_CG_MOUSE_BUTTON_RIGHT: u32 = 1;
    pub const K_CG_HID_EVENT_TAP: u32 = 0;
    pub const K_CG_EVENT_SOURCE_STATE_HID_SYSTEM_STATE: u32 = 1;
    pub const K_CG_MOUSE_EVENT_CLICK_STATE: u32 = 1;

    #[link(name = "CoreGraphics", kind = "framework")]
    unsafe extern "C" {
        pub fn CGEventSourceCreate(state_id: u32) -> CGEventSourceRef;
        pub fn CGEventCreate(source: CGEventSourceRef) -> CGEventRef;
        pub fn CGEventGetLocation(event: CGEventRef) -> CGPoint;
        pub fn CGEventCreateMouseEvent(
            source: CGEventSourceRef,
            mouse_type: u32,
            mouse_cursor_position: CGPoint,
            mouse_button: u32,
        ) -> CGEventRef;
        pub fn CGEventSetIntegerValueField(event: CGEventRef, field: u32, value: i64);
        pub fn CGEventPost(tap: u32, event: CGEventRef);
        pub fn CFRelease(cf: *mut c_void);
    }
}

#[cfg(target_os = "macos")]
fn current_mouse_location() -> Option<sys::CGPoint> {
    unsafe {
        let source = sys::CGEventSourceCreate(sys::K_CG_EVENT_SOURCE_STATE_HID_SYSTEM_STATE);
        if source.is_null() {
            return None;
        }
        let event = sys::CGEventCreate(source);
        sys::CFRelease(source);
        if event.is_null() {
            return None;
        }
        let loc = sys::CGEventGetLocation(event);
        sys::CFRelease(event);
        Some(loc)
    }
}

#[cfg(target_os = "macos")]
fn post_button_event(
    source: sys::CGEventSourceRef,
    loc: sys::CGPoint,
    down: bool,
    button: MouseButton,
    click_state: i64,
) -> Result<(), String> {
    use sys::*;
    let (event_type, mouse_button) = match (button, down) {
        (MouseButton::Left, true) => (K_CG_EVENT_LEFT_MOUSE_DOWN, K_CG_MOUSE_BUTTON_LEFT),
        (MouseButton::Left, false) => (K_CG_EVENT_LEFT_MOUSE_UP, K_CG_MOUSE_BUTTON_LEFT),
        (MouseButton::Right, true) => (K_CG_EVENT_RIGHT_MOUSE_DOWN, K_CG_MOUSE_BUTTON_RIGHT),
        (MouseButton::Right, false) => (K_CG_EVENT_RIGHT_MOUSE_UP, K_CG_MOUSE_BUTTON_RIGHT),
    };

    unsafe {
        let event = CGEventCreateMouseEvent(source, event_type, loc, mouse_button);
        if event.is_null() {
            return Err("Failed to create mouse event".into());
        }
        CGEventSetIntegerValueField(event, K_CG_MOUSE_EVENT_CLICK_STATE, click_state);
        CGEventPost(K_CG_HID_EVENT_TAP, event);
        CFRelease(event);
    }
    Ok(())
}

/// One complete click (or double-click) at the current cursor position.
#[cfg(target_os = "macos")]
pub fn click_at_cursor(button: MouseButton, click_type: ClickType) -> Result<(), String> {
    use sys::*;
    let loc = current_mouse_location().ok_or("Failed to read cursor position")?;
    let source = unsafe { CGEventSourceCreate(K_CG_EVENT_SOURCE_STATE_HID_SYSTEM_STATE) };
    if source.is_null() {
        return Err("Failed to create event source".into());
    }

    let result = (|| {
        // First click
        post_button_event(source, loc, true, button, 1)?;
        post_button_event(source, loc, false, button, 1)?;

        if click_type == ClickType::Double {
            // Second down/up with clickState=2 — no sleep (keeps high CPS accurate)
            let loc2 = current_mouse_location().unwrap_or(loc);
            post_button_event(source, loc2, true, button, 2)?;
            post_button_event(source, loc2, false, button, 2)?;
        }
        Ok(())
    })();

    unsafe { CFRelease(source) };
    result
}

#[cfg(target_os = "macos")]
pub fn mouse_down(button: MouseButton) -> Result<(), String> {
    use sys::*;
    let loc = current_mouse_location().ok_or("Failed to read cursor position")?;
    let source = unsafe { CGEventSourceCreate(K_CG_EVENT_SOURCE_STATE_HID_SYSTEM_STATE) };
    if source.is_null() {
        return Err("Failed to create event source".into());
    }
    let result = post_button_event(source, loc, true, button, 1);
    unsafe { CFRelease(source) };
    result
}

#[cfg(target_os = "macos")]
pub fn mouse_up(button: MouseButton) -> Result<(), String> {
    use sys::*;
    let loc = current_mouse_location().ok_or("Failed to read cursor position")?;
    let source = unsafe { CGEventSourceCreate(K_CG_EVENT_SOURCE_STATE_HID_SYSTEM_STATE) };
    if source.is_null() {
        return Err("Failed to create event source".into());
    }
    let result = post_button_event(source, loc, false, button, 1);
    unsafe { CFRelease(source) };
    result
}

#[cfg(not(target_os = "macos"))]
pub fn click_at_cursor(_button: MouseButton, _click_type: ClickType) -> Result<(), String> {
    Err("Mouse synthesis is only supported on macOS".into())
}

#[cfg(not(target_os = "macos"))]
pub fn mouse_down(_button: MouseButton) -> Result<(), String> {
    Err("Mouse synthesis is only supported on macOS".into())
}

#[cfg(not(target_os = "macos"))]
pub fn mouse_up(_button: MouseButton) -> Result<(), String> {
    Err("Mouse synthesis is only supported on macOS".into())
}
