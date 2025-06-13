/**
 * @module Service (StoragePaths)
 * @description Defines the interface and Context.Tag for the StoragePaths service.
 */

import { Context, Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Uri } from "vscode";

/**
 * The service interface for providing extension storage paths.
 */
export interface Interface {
	/**
	 * Returns the URI for an extension's workspace-specific storage.
	 * @returns A URI or `undefined` if no workspace is open.
	 */
	readonly GetWorkSpaceStorageUri: (
		Extension: IExtensionDescription,
	) => Uri | undefined;

	/**
	 * Returns the URI for an extension's global storage.
	 */
	readonly GetGlobalStorageUri: (Extension: IExtensionDescription) => Uri;
}

export const Tag = Context.Tag<Interface>("Service/StoragePaths");
