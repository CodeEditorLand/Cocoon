/*
 * File: Cocoon/Source/Service/StatusBar.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ./StatusBar/Live.js, ./StatusBar/Service.js
 * Export: Live, Service
 */

/**
 * @module StatusBar
 * @description This module provides the `vscode.window.createStatusBarItem` API
 * implementation, allowing extensions to add items to the status bar.
 */

import Live from "./StatusBar/Live.js";
import Service from "./StatusBar/Service.js";

export { Service, Live };
