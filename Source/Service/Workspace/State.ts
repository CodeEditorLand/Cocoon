/**
 * @module State (Workspace)
 * @description Defines the internal state representation for the workspace.
 */
import type { Uri, WorkspaceFolder } from "vscode";

export class InternalWorkspace {
	constructor(
		public readonly Id: string,
		public readonly Name: string,
		public readonly Folders: readonly WorkspaceFolder[],
		public readonly Configuration: Uri | undefined,
	) {}
}
