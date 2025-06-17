/*
 * File: Cocoon/Source/Service/FileSystem.ts
 * Responsibility: Implements the vscode.workspace.fs API proxy for the Cocoon sidecar, forwarding filesystem operations to the Mountain backend via the Vine IPC layer to enable VS Code extension compatibility while using native Rust file handling (River/Sun).
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ./FileSystem/Error.js, ./FileSystem/Live.js, ./FileSystem/Service.js
 * Export: FileSystemError, Live, MapToVSCodeError, Service
 */

/**
 * @module FileSystem
 * @description This module provides the `vscode.workspace.fs` API implementation,
 * proxying all filesystem operations to the Mountain host.
 */

import { FileSystemError, MapToVSCodeError } from "./FileSystem/Error.js";
import Live from "./FileSystem/Live.js";
import Service from "./FileSystem/Service.js";

export { Service, Live, FileSystemError, MapToVSCodeError };
