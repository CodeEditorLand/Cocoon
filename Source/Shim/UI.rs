// File: Cocoon/Source/Shim/UI.rs
// Responsibility: Responsibility could not be determined.
// Modified: 2025-06-07 05:37:34 UTC

#![allow(non_snake_case, non_camel_case_types)]

use log::{debug, warn};
use serde_json::Value;
use tauri::{Runtime, Window};

/// Handles basic `showMessage` calls. This entire module is deprecated.
/// Modern implementations should use the `UiProvider` effect or the
/// `MainThreadMessageHandler` shim.
pub async fn HandleShowMessageBasic<R:Runtime>(Window:Window<R>, Parameters:Value) -> Result<Value, String> {
	let SeverityNumber = Parameters.get("severity").and_then(|v| v.as_u64()).unwrap_or(2); // Default to Info
	let MessageString = Parameters.get("message").and_then(|v| v.as_str()).unwrap_or("").to_string();
	let OptionsValue = Parameters.get("options");

	warn!(
		"[UiHandler Deprecated] HandleShowMessageBasic called. This handler is obsolete and its usage indicates \
		 legacy code."
	);
	debug!(
		"[UiHandler Deprecated] Message: severity_num={}, message='{}...'",
		SeverityNumber,
		MessageString.chars().take(50).collect::<String>()
	);

	if OptionsValue.is_some() && !OptionsValue.unwrap().as_object().map_or(true, |o| o.is_empty()) {
		warn!(
			"[UiHandler Deprecated] Received message options, but this basic handler ignores them. Options: {:?}",
			OptionsValue
		);
	}

	let TitlePrefix = match SeverityNumber {
		3 => "Error",   // Corresponds to MessageSeverity::Error
		2 => "Warning", // Corresponds to MessageSeverity::Warning
		_ => "Info",    // Default for Info and others
	};
	let DialogTitle = format!("Land Editor - {}", TitlePrefix);

	let WindowClone = Window.clone();
	tauri::api::dialog::message(Some(&WindowClone), DialogTitle, MessageString);

	info!("[UiHandler Deprecated] Native dialog displayed via obsolete handler.");
	Ok(Value::Null)
}
