/*
 * File: Cocoon/Source/Service/WorkSpace.ts
 * Responsibility: The aggregator module for the WorkSpace service.
 * Modified: 2025-06-18
 * Dependency: ./WorkSpace/Live.js, ./WorkSpace/Service.js, vscode
 * Export: Live, Service, WorkspaceFolder
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
