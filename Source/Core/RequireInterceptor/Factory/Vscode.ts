/**
 * @module VSCodeNodeModuleFactory
 * @description The factory for creating the `vscode` API module.
 */

import type { URI } from "vs/base/common/uri.js";
import { nullExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type { Log } from "../../../Service/Log.js";
import type { APIFactory } from "../../APIFactory.js";
import type { ExtensionPaths } from "../../ExtensionPath.js";
import type { INodeModuleFactory } from "./Interface.js";

/**
 * A factory that creates a sandboxed `vscode` API object for each extension.
 */
export class VSCodeNodeModuleFactory implements INodeModuleFactory {
	public readonly NodeModuleName = "vscode";
	private readonly APIImplCache = new Map<string, typeof VSCode>();

	constructor(
		private readonly APIFactoryService: APIFactory.Interface,
		private readonly ExtensionPathsService: ExtensionPaths.Interface,
		private readonly LogService: Log.Interface,
	) {}

	public Load(_Request: string, ParentUri: URI): any {
		const Extension = this.ExtensionPathsService.FindSubstr(ParentUri);

		if (Extension) {
			let APIImpl = this.APIImplCache.get(Extension.identifier.value);
			if (!APIImpl) {
				APIImpl = this.APIFactoryService.CreateAPI(Extension);
				this.APIImplCache.set(Extension.identifier.value, APIImpl);
			}
			return APIImpl;
		}

		// Fallback for unidentified callers (e.g., code running from a bare script)
		this.LogService.Warn(
			`Could not identify extension for 'vscode' require call from ${ParentUri.fsPath}`,
		);
		return this.APIFactoryService.CreateAPI(nullExtensionDescription);
	}
}
