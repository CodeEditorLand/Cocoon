/**
 * @module Definition (StoragePath)
 * @description The live implementation of the StoragePath service.
 */

import * as Path from "node:path";
import { Context, Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Uri } from "vscode";

import InitDataService from "../InitData/Service.js";
import LogService from "../Log/Service.js";
import EnsureDirectory from "./Support/EnsureDirectory.js";

export default Effect.gen(function* (_) {
	const InitData = yield* _(InitDataService);
	const Log = yield* _(LogService);

	const GlobalStorageURI = InitData.environment.globalStorageHome as any;
	const WorkSpaceStorageURI = InitData.environment
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

	const ServiceImplementation: Context.Tag.Service<any> = {
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
					Log.Error(
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
