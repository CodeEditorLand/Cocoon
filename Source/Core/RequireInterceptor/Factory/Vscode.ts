/**
 * @module VscodeNodeModuleFactory
 * @description The factory for creating the `vscode` API module.
 */

import type { URI } from "vs/base/common/uri.js";
import { nullExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as Vscode from "vscode";

import type { Log } from "../../../Service/Log.js";
import type { ApiFactory } from "../../ApiFactory.js";
import type { ExtensionPaths } from "../../ExtensionPath.js";
import type { INodeModuleFactory } from "./Interface.js";

/**
 * A factory that creates a sandboxed `vscode` API object for each extension.
 */
export class VscodeNodeModuleFactory implements INodeModuleFactory {
	public readonly NodeModuleName = "vscode";
	private readonly ApiImplCache = new Map<string, typeof Vscode>();

	constructor(
		private readonly ApiFactoryService: ApiFactory.Interface,
		private readonly ExtensionPathsService: ExtensionPaths.Interface,
		private readonly LogService: Log.Interface,
	) {}

	public Load(_Request: string, ParentUri: URI): any {
		const Extension = this.ExtensionPathsService.FindSubstr(ParentUri);

		if (Extension) {
			let ApiImpl = this.ApiImplCache.get(Extension.identifier.value);
			if (!ApiImpl) {
				ApiImpl = this.ApiFactoryService.CreateApi(Extension);
				this.ApiImplCache.set(Extension.identifier.value, ApiImpl);
			}
			return ApiImpl;
		}

		// Fallback for unidentified callers (e.g., code running from a bare script)
		this.LogService.Warn(
			`Could not identify extension for 'vscode' require call from ${ParentUri.fsPath}`,
		);
		return this.ApiFactoryService.CreateApi(nullExtensionDescription);
	}
}
