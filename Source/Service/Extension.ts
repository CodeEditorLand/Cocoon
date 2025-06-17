/*
 * File: Cocoon/Source/Service/Extension.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:59:13 UTC
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
