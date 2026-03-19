/**
 * @module Services/Window
 * @description
 * Barrel export for Window service atomic modules.
 * Following Wind Effect-TS atomic module pattern.
 */

// Error types
export * as WindowErrors from "./Errors.js";

// Type definitions
export * as WindowTypes from "./Types.js";

// State management
export * from "./State.js";

// Dialog operations
export * from "./Dialog.js";

// Service interfaces and layers will be added as modules are completed
// QuickInput operations - Future: implement Source/Services/Window/QuickInput.ts
// FileDialog operations - Future: implement Source/Services/Window/FileDialog.ts
// StatusBar operations - Future: implement Source/Services/Window/StatusBar.ts
// OutputChannel operations - Future: integrated in main Window service
// WebviewPanel operations - Future: implement in WebviewPanel module
// Progress operations - Future: implement Source/Services/Window/Progress.ts
// TextDocument operations - Future: integrate with DocumentService
