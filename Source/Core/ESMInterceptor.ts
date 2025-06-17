/*
 * File: Cocoon/Source/Core/ESMInterceptor.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:54 UTC
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
