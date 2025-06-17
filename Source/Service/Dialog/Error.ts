/*
 * File: Cocoon/Source/Service/Dialog/Error.ts
 * Responsibility: Defines a custom DialogError class for the Cocoon sidecar's Dialog service, standardizing error handling in dialog-related operations to ensure consistent error reporting across the IPC layer (Vine) between Cocoon and Mountain.
 * Modified: 2025-06-17 10:32:39 UTC
 * Export: default
 */

/**
 * @module Error (Dialog)
 * @description Exports custom, tagged errors for the Dialog service.
 */

export { default as DialogError } from "./Error/DialogError.js";
