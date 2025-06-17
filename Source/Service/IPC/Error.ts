/*
 * File: Cocoon/Source/Service/IPC/Error.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:32 UTC
 * Export: default
 */

/**
 * @module Error (IPC)
 * @description Re-exports all custom error types for the IPC module.
 */

export { default as gRPCConnectionError } from "./Error/gRPCConnectionError.js";
export { default as IPCError } from "./Error/IPCError.js";
export * from "./ProtoConverter/Error.js";
