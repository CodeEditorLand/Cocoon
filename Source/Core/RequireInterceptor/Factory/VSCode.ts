/**
 * @module VSCodeNodeModuleFactory (RequireInterceptor/Factory)
 * @description A factory that creates the `vscode` API object when an extension
 * calls `require('vscode')`.
 */

import type * as VSCode from "vscode";

import type APIFactoryService from "../../../Core/APIFactory/Service.js";
import type ExtensionPathService from "../../../Core/ExtensionPath/Service.js";
import type LogService from "../../../Service/Log/Service.js";
import type INodeModuleFactory from "./Interface.js";

export default class implements INodeModuleFactory {
	constructor(
		private readonly APIFactory: APIFactoryService,
		private readonly ExtensionPath: ExtensionPathService,
		private readonly Log: LogService,
	) {}

	public Load(
		_Request: "vscode",
		ParentURI: VSCode.Uri,
		_OriginalRequire: (request: string) => any,
	): any {
		const Extension = this.ExtensionPath.FindSubstr(ParentURI);

		if (Extension) {
			// Found the extension that's requiring 'vscode', so create its sandboxed API.
			return this.APIFactory.CreateAPI(Extension);
		}

		// This is a critical failure case. It means `require('vscode')` was called
		// from a file that we couldn't map back to a known extension. We must
		// throw an error to prevent undefined behavior.
		this.Log.Error(
			`FATAL: require('vscode') was called from an unknown location: ${ParentURI.fsPath}. Could not determine extension owner.`,
		);
		throw new Error(
			"[Cocoon] `require('vscode')` may only be called from an extension.",
		);
	}
}
