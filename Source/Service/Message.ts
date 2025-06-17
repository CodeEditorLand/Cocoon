/*
 * File: Cocoon/Source/Service/Message.ts
 * Responsibility: Implements the message service for the Cocoon sidecar, proxying VS Code extension notification requests to the Mountain backend via the Vine IPC layer to display native UI messages in the Sky frontend.
 * Modified: 2025-06-17 10:59:33 UTC
 * Dependency: ./Message/Live.js, ./Message/Service.js, ./Message/Type.js
 * Export: Live, Service, type ExtensionSource
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
