/**
 * @module Definition (StoragePath)
 * @description The live implementation of the StoragePath service.
 */

import * as Path from "node:path";
import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Uri } from "vscode";

import { InitData } from "../InitData.js";
import { Log } from "../Log.js";
import type { Interface } from "./Service.js";
import { EnsureDirectory } from "./Support/EnsureDirectory.js";

export const Definition = Effect.gen(function* (_) {
	const InitDataService = yield* _(InitData.Tag);
	const LogService = yield* _(Log.Tag);

	const GlobalStorageURI = InitDataService.environment
		.globalStorageHome as any;
	const WorkSpaceStorageURI = InitDataService.environment
		.workspaceStorageHome as any;

	// Ensure the base directories exist on startup.
	yield* _(EnsureDirectory(GlobalStorageURI, "Global"));
	yield* _(EnsureDirectory(WorkSpaceStorageURI, "WorkSpace"));

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

	const ServiceImplementation: Interface = {
		GetWorkSpaceStorageURI: (Extension) =>
			GetPathForExtension(WorkSpaceStorageURI, Extension),

		GetGlobalStorageURI: (Extension) => {
			const uri = GetPathForExtension(GlobalStorageURI, Extension);
			if (!uri) {
				// This is a critical failure. Fallback to a local path to prevent crashes.
				const EmergencyPath = Path.join(
					process.cwd(),
					".cocoon-data/global",
					Extension.identifier.value.toLowerCase(),
				);
				Effect.runSync(
					LogService.Error(
						`FATAL: Could not resolve global storage path for ${Extension.identifier.value}. Falling back to ${EmergencyPath}`,
					),
				);
				return Uri.file(EmergencyPath);
			}
			return uri;
		},
	};

	return ServiceImplementation;
});
