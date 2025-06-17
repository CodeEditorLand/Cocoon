/*
 * File: Cocoon/Source/Service/StoragePath/Service.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:12 UTC
 * Dependency: effect, vs/platform/extensions/common/extensions.js, vscode
 * Export: StoragePathService
 */

/**
 * @module Service (StoragePath)
 * @description Defines the interface and Context.Tag for the StoragePath service.
 * This service resolves filesystem URIs for extension-specific storage locations.
 */

import { Context } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Uri } from "vscode";

/**
 * The `Context.Tag` for the StoragePath service.
 */
export default class StoragePathService extends Context.Tag(
	"Service/StoragePath",
)<
	StoragePathService,
	{
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
>() {}
