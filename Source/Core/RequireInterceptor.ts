/*
 * File: Cocoon/Source/Core/RequireInterceptor.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ./RequireInterceptor/Live.js, ./RequireInterceptor/Service.js
 * Export: Live, Service
 */

/**
 * @module RequireInterceptor (Core)
 * @description The main module for the RequireInterceptor service, which patches
 * Node.js's `require` to provide sandboxed APIs to extensions.
 */

import Live from "./RequireInterceptor/Live.js";
import Service from "./RequireInterceptor/Service.js";

export { Service, Live };
