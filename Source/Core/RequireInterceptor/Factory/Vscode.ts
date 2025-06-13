/**
 * @module Vscode (RequireInterceptor/Factory)
 * @description The factory responsible for creating the sandboxed `vscode` API
 * module when an extension calls `require('vscode')`.
 */

import type { URI } from "vs/base/common/uri.js";
import { nullExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type { Log } from "../../../Service/Log.js";
import type { APIFactory } from "../../APIFactory.js";
import type { ExtensionPath } from "../../ExtensionPath.js";
import type { Interface as INodeModuleFactory } from "./Interface.js";

/**
 * A factory that creates a sandboxed `vscode` API object for each extension.
 * It ensures that each extension receives an API instance tailored to its
 * own identity and permissions.
 */
export class VscodeNodeModuleFactory implements INodeModuleFactory {
	public readonly NodeModuleName = "vscode";
	private readonly APIImplementationCache = new Map<string, typeof VSCode>();

	constructor(
		private readonly APIFactoryService: APIFactory.Interface,
		private readonly ExtensionPathService: ExtensionPath.Interface,
		private readonly LogService: Log.Interface,
	) {}

	public Load(_Request: string, ParentURI: URI): any {
		const Extension = this.ExtensionPathService.FindSubstr(ParentURI);

		if (Extension) {
			const extensionId = Extension.identifier.value;
			let APIImplementation =
				this.APIImplementationCache.get(extensionId);
			if (!APIImplementation) {
				this.LogService.Trace(
					`Creating new vscode API for extension: ${extensionId}`,
				);
				APIImplementation = this.APIFactoryService.CreateAPI(Extension);
				this.APIImplementationCache.set(extensionId, APIImplementation);
			}
			return APIImplementation;
		}

		// Fallback for unidentified callers (e.g., code running from a bare script, or tests).
		// This provides a default, non-functional API object to prevent crashes.
		this.LogService.Warn(
			`Could not identify extension for 'vscode' require call from ${ParentURI.fsPath}. Providing a default API object.`,
		);
		return this.APIFactoryService.CreateAPI(nullExtensionDescription);
	}
}
