/*
 * File: Cocoon/Source/Service/Clipboard.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:14 UTC
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
