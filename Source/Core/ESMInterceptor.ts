/*
 * File: Cocoon/Source/Core/ESMInterceptor.ts
 * Responsibility: Implements a Node.js module loader hook to intercept 'vscode' module imports, redirecting them to Land's compatibility layer in the Cocoon sidecar to enable VS Code extension support while maintaining backend communication via the Vine IPC layer.
 * Modified: 2025-06-15 19:17:26 UTC
 * Dependency: ./ESMInterceptor/Live.js, ./ESMInterceptor/Service.js
 * Export: Live, Service
 */

/**
 * @module ESMInterceptor (Core)
 * @description The main module for the ESMInterceptor service, which installs a
 * Node.js loader hook to intercept `import 'vscode'` statements.
 */

import Live from "./ESMInterceptor/Live.js";
import Service from "./ESMInterceptor/Service.js";

export { Service, Live };
