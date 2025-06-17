/*
 * File: Cocoon/Source/Core/ExtensionPath.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ./ExtensionPath/Live.js, ./ExtensionPath/Service.js
 * Export: Live, Service
 */

/**
 * @module ExtensionPath (Core)
 * @description The main module for the ExtensionPath service, which maps file URIs
 * to their owner extension.
 */

import Live from "./ExtensionPath/Live.js";
import Service from "./ExtensionPath/Service.js";

export { Service, Live };
