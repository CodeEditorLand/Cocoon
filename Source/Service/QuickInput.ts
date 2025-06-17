/*
 * File: Cocoon/Source/Service/QuickInput.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:59:44 UTC
 * Dependency: ./QuickInput/Live.js, ./QuickInput/Service.js
 * Export: Live, Service
 */

/**
 * @module QuickInput
 * @description This module provides the `vscode.window.showQuickPick` and
 * `showInputBox` APIs.
 */

import Live from "./QuickInput/Live.js";
import Service from "./QuickInput/Service.js";

export { Service, Live };
