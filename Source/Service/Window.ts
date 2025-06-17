/*
 * File: Cocoon/Source/Service/Window.ts
 * Responsibility: The aggregator module for the Window service.
 * Modified: 2025-06-18
 * Dependency: ./Window/Live.js, ./Window/Service.js
 * Export: Live, Service
 */

/**
 * @module Window
 * @description This module provides the core `vscode.window` API implementation,
 * managing properties like window state and orchestrating calls to sub-services
 * like dialogs, messages, and quick input.
 */

import Live from "./Window/Live.js";
import Service from "./Window/Service.js";

export { Service, Live };
