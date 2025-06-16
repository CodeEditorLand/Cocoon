/*
 * File: Cocoon/Source/Service/WorkSpace/State.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:45 UTC
 * Dependency: vscode
 */

/**
 * @module State (WorkSpace)
 * @description Defines the internal state representation for the workspace.
 */
import type { Uri, WorkspaceFolder } from "vscode";

/**
 * A simple class to hold the core properties of the workspace state as
 * received from the host.
 */
export default class {
	constructor(
		public readonly ID: string,
		public readonly Name: string,
		public readonly Folders: readonly WorkspaceFolder[],
		public readonly Configuration: Uri | undefined,
	) {}
}
