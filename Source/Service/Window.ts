/*
 * File: Cocoon/Source/Service/Window.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:59:54 UTC
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
