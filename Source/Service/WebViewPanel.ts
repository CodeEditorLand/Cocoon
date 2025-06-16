/*
 * File: Cocoon/Source/Service/WebViewPanel.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:16:46 UTC
 * Dependency: ./WebViewPanel/Live.js, ./WebViewPanel/Service.js
 * Export: Live, Service
 */

/**
 * @module WebViewPanel
 * @description This module provides the `vscode.window.createWebViewPanel` API,
 * allowing extensions to create and manage webview-based UI panels.
 */

import Live from "./WebViewPanel/Live.js";
import Service from "./WebViewPanel/Service.js";

export { Service, Live };
