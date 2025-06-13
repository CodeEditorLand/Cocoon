/**
 * @module Service (StoragePath)
 * @description Defines the interface and Context.Tag for the StoragePath service.
 * This service resolves filesystem URIs for extension-specific storage locations.
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
	 * This location is private to the extension and the current workspace.
	 * @returns A `URI` or `undefined` if no workspace is open.
	 */
	readonly GetWorkSpaceStorageURI: (
		Extension: IExtensionDescription,
	) => Uri | undefined;

	/**
	 * Returns the URI for an extension's global storage.
	 * This location is private to the extension and shared across all workspaces.
	 * @returns A `URI`.
	 */
	readonly GetGlobalStorageURI: (Extension: IExtensionDescription) => Uri;
}

export const Tag = Context.Tag<Interface>("Service/StoragePath");
