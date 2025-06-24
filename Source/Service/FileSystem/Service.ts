/*
 * File: Cocoon/Source/Service/FileSystem/Service.ts
 * Role: Defines the service interface and Effect.Service for the FileSystem service.
 * Responsibilities:
 *   - Declare the contract for the service that implements the `vscode.workspace.fs` API.
 *   - Provide the `Effect.Service` class that acts as the dependency injection tag.
 */

import { Effect } from "effect";
import type { Event, FileChangeEvent, FileSystem } from "vscode";

/**
 * A service interface that combines the standard `vscode.FileSystem` methods
 * with the `onDidChangeFile` event for a complete file system abstraction.
 */
export interface FileSystemServiceType extends FileSystem {
	readonly onDidChangeFile: Event<readonly FileChangeEvent[]>;
}

/**
 * The `Effect.Service` for the `vscode.workspace.fs` API service.
 */
export class FileSystem extends Effect.Service<FileSystem>(
	"Service/FileSystem",
)<FileSystemService, FileSystemServiceType>() {}
