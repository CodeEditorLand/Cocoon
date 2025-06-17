/*
 * File: Cocoon/Source/Service/WorkSpace.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 11:00:00 UTC
 * Dependency: ./WorkSpace/Live.js, ./WorkSpace/Service.js, vscode
 * Export: Live, Service, type WorkspaceFolder
 */

/**
 * @module WorkSpace
 * @description This module provides the `vscode.workspace` API implementation,
 * orchestrating other services like Document, FileSystem, and Configuration.
 */

import type { WorkspaceFolder } from "vscode";

import Live from "./WorkSpace/Live.js";
import Service from "./WorkSpace/Service.js";

export { Service, Live, type WorkspaceFolder };
