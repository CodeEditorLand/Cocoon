/*
 * File: Cocoon/Source/Service/Extension.ts
 * Responsibility: The aggregator module for the Extension service.
 * Modified: 2025-06-18
 * Dependency: ./Extension/Live.js, ./Extension/Service.js
 * Export: Live, Service
 */

/**
 * @module Extension
 * @description This module provides the `vscode.extensions` API implementation,
 * allowing extensions to introspect and activate other extensions.
 */

import Live from "./Extension/Live.js";
import Service from "./Extension/Service.js";

export { Service, Live };
