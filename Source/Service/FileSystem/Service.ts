/*
 * File: Cocoon/Source/Service/FileSystem/Service.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:05 UTC
 * Dependency: effect, vscode
 * Export: FileSystemService
 */

/**
 * @module Service (FileSystem)
 * @description Defines the interface and Context.Tag for the FileSystem service,
 * which implements the `vscode.workspace.fs` API.
 */

import { Context } from "effect";
import type { FileSystem } from "vscode";

/**
 * The `Context.Tag` for the `vscode.workspace.fs` API service.
 */
export default class FileSystemService extends Context.Tag(
	"Service/FileSystem",
)<FileSystemService, FileSystem>() {}
