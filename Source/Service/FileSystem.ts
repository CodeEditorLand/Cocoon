/*
 * File: Cocoon/Source/Service/FileSystem.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:05 UTC
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
