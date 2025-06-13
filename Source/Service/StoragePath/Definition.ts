/**
 * @module Definition (StoragePaths)
 * @description The live implementation of the StoragePaths service.
 */

import * as Path from "node:path";
import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Uri } from "vscode";

import { InitDataService } from "../InitData.js";
import { LogProvider } from "../Log.js";
import type { Interface } from "./Service.js";
import { EnsureDirectory } from "./Support/EnsureDirectory.js";

export const Definition = Effect.gen(function* (_) {
	const InitData = yield* _(InitDataService);
	const Log = yield* _(LogProvider.Tag);

	const GlobalStorageUri = InitData.environment.globalStorageHome;
	const WorkSpaceStorageUri = InitData.environment.workspaceStorageHome;

	// Ensure the base directories exist on startup.
	yield* _(EnsureDirectory(GlobalStorageUri, "Global"));
	yield* _(EnsureDirectory(WorkSpaceStorageUri, "WorkSpace"));

	const GetPathForExtension = (
		BaseUri: Uri | undefined,
		Extension: IExtensionDescription,
	): Uri | undefined => {
		if (!BaseUri || !Extension?.identifier?.value) {
			return undefined;
		}
		// Sanitize the extension ID to be a valid path segment.
		const ExtensionSubdir = Extension.identifier.value
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, "_");
		return Uri.joinPath(BaseUri, ExtensionSubdir);
	};

	const ServiceImplementation: Interface = {
		GetWorkSpaceStorageUri: (Extension) =>
			GetPathForExtension(WorkSpaceStorageUri, Extension),

		GetGlobalStorageUri: (Extension) => {
			const uri = GetPathForExtension(GlobalStorageUri, Extension);
			if (!uri) {
				// This is a critical failure. Fallback to a local path.
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
