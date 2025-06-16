/*
 * File: Cocoon/Source/Service/IPC/Error.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:02 UTC
 * Export: default
 */

/**
 * @module Error (IPC)
 * @description Re-exports all custom error types for the IPC module.
 */

export { default as gRPCConnectionError } from "./Error/gRPCConnectionError.js";
export { default as IPCError } from "./Error/IPCError.js";
export * from "./ProtoConverter/Error.js";
