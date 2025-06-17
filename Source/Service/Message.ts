/*
 * File: Cocoon/Source/Service/Message.ts
 * Responsibility: The aggregator module for the Message service.
 * Modified: 2025-06-18
 * Dependency: ./Message/Live.js, ./Message/Service.js, ./Message/Type.js
 * Export: Live, Service, ExtensionSource
 */

/**
 * @module Message
 * @description This module provides the `vscode.window.show...Message` APIs,
 * proxying requests to the Mountain host to display notifications.
 */

import Live from "./Message/Live.js";
import Service from "./Message/Service.js";
import type ExtensionSource from "./Message/Type.js";

export { Service, Live, type ExtensionSource };
