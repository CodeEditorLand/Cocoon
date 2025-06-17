/*
 * File: Cocoon/Source/Service/StoragePath/Definition.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ../InitData/Service.js, ../Log/Service.js, ./Service.js, ./Support/EnsureDirectory.js, effect, node:path, vs/platform/extensions/common/extensions.js, vscode
 */

/**
 * @module Definition (StoragePath)
 * @description The live implementation of the StoragePath service.
 */

import * as Path from "node:path";
import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Uri } from "vscode";

import InitDataService from "../InitData/Service.js";
import LogService from "../Log/Service.js";
import type Service from "./Service.js";
import EnsureDirectory from "./Support/EnsureDirectory.js";

/**
 * An Effect that builds the live implementation of the StoragePath service.
 */
export default Effect.gen(function* () {
	const InitData = yield* InitDataService;
	const Log = yield* LogService;

	const GlobalStorageURI = InitData.environment.globalStorageHome as Uri;
	const WorkSpaceStorageURI = InitData.environment
		.workspaceStorageHome as Uri;

	// Ensure the base directories exist on startup.
	yield* EnsureDirectory(GlobalStorageURI, "Global");
	yield* EnsureDirectory(WorkSpaceStorageURI, "WorkSpace");

	const GetPathForExtension = (
		BaseURI: Uri | undefined,
		Extension: IExtensionDescription,
	): Uri | undefined => {
		if (!BaseURI || !Extension?.identifier?.value) {
			return undefined;
		}
		// Sanitize the extension ID to be a valid path segment.
		const ExtensionSubdirectory = Extension.identifier.value
			.replace(/[^a-z0-9-]/gi, "_")
			.toLowerCase();
		return Uri.joinPath(BaseURI, ExtensionSubdirectory);
	};

	const StoragePathImplementation: Service["Type"] = {
		GetWorkSpaceStorageURI: (Extension) =>
			GetPathForExtension(WorkSpaceStorageURI, Extension),

		GetGlobalStorageURI: (Extension) => {
			const URI = GetPathForExtension(GlobalStorageURI, Extension);
			if (!URI) {
				// This is a critical failure. Fallback to a local path to prevent crashes.
				const EmergencyPath = Path.join(
					process.cwd(),
					".cocoon-data/global",
					Extension.identifier.value.toLowerCase(),
				);
				Effect.runSync(
					Log.Error(
						`FATAL: Could not resolve global storage path for ${Extension.identifier.value}. Falling back to ${EmergencyPath}`,
					),
				);
				return Uri.file(EmergencyPath);
			}
			return URI;
		},
	};

	return StoragePathImplementation;
});
