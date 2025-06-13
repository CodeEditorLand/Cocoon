/**
 * @module State (WorkSpace)
 * @description Defines the internal state representation for the workspace.
 */
import type { Uri, WorkSpaceFolder } from "vscode";

export class InternalWorkSpace {
	constructor(
		public readonly Id: string,
		public readonly Name: string,
		public readonly Folders: readonly WorkSpaceFolder[],
		public readonly Configuration: Uri | undefined,
	) {}
}
