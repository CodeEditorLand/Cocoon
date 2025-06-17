/*
 * File: Cocoon/Source/Service/Clipboard.ts
 * Responsibility: Implements the clipboard service for the Cocoon sidecar by proxying read/write operations to the Mountain backend via the Vine IPC layer, enabling VS Code extensions to interact with the system clipboard.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ./Clipboard/Live.js, ./Clipboard/Service.js
 * Export: Live, Service
 */

/**
 * @module Clipboard
 * @description This module provides the `vscode.env.clipboard` API implementation,
 * proxying all clipboard operations to the Mountain host.
 */

import Live from "./Clipboard/Live.js";
import Service from "./Clipboard/Service.js";

export { Service, Live };
