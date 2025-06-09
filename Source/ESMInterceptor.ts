/*
 * File: Cocoon/Source/ESMInterceptor.ts
 * Responsibility: Implements a Node.js loader hook in the Cocoon sidecar to intercept and provide extension-specific shimmed instances of the VS Code API during ESM imports, enabling VS Code extension compatibility by leveraging Vine IPC for communication with the Mountain backend.
 * Modified: 2025-06-07 05:37:44 UTC
 * Dependency: ./cocoon-esm-interceptor/dynamic-module-script-generator.js, node:buffer, node:fs, node:module, node:path, node:url, vs/base/common/map, vs/base/common/uri, vs/base/common/uuid, vs/platform/instantiation/common/instantiation, vs/platform/log/common/log, vs/workbench/api/common/extHost.api.impl, vscode
 * Export: COCOON_ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME, CocoonESMInterceptorContext, CocoonNodeModuleESMInterceptor
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon ESM Interceptor
 * --------------------------------------------------------------------------------------------
 * This module provides the `CocoonNodeModuleESMInterceptor` class, which implements a
 * mechanism to intercept ECMAScript Module (ESM) `import` statements for 'vscode' (and
 * its aliases like 'land') within extensions running in the Cocoon Node.js environment.
 * The primary goal is to ensure that when an extension uses ESM to import the VS Code API
 * (e.g., `import * as vscode from 'vscode';` or `import { Uri } from 'vscode';`),
 * it receives an extension-specific instance of the API, correctly shimmed by Cocoon.
 *
 * How it Works:
 * 1. Registration of a Node.js Loader Hook:
 *    - During its `install()` method, this interceptor registers a custom Node.js loader
 *      hook. This hook script (defined in `./cocoon-esm-interceptor/hook.ts` or similar)
 *      runs in a separate "loader thread" managed by Node.js.
 *    - The content of the hook script is loaded, converted to a `data:` URI,
 *      and then registered using `node:module.register()`.
 *
 * 2. Inter-Thread Communication via MessageChannel:
 *    - A `MessageChannel` is established for two-way communication between this main
 *      interceptor class and the loader hook script.
 *
 * 3. Interception by the Loader Hook:
 *    - When an extension's ESM code executes an `import` for a targeted module ('vscode', 'land'),
 *      the loader hook's `resolve` function is triggered.
 *
 * 4. Request from Loader Hook to This Main Interceptor:
 *    - The hook sends the `parentURL` and `requestedSpecifier` to this main interceptor.
 *
 * 5. API Instance Generation by This Main Interceptor:
 *    - This interceptor uses an `IExtensionApiFactory` to get/create the `vscode` API instance
 *      tailored for the extension identified by `parentURL`.
 *    - It generates a unique API key, caches the instance against this key, and constructs
 *      the JavaScript source for a dynamic ESM module using a helper function. This script
 *      includes the API key.
 *    - The generated script is converted into a `data:` URI.
 *
 * 6. Response from This Main Interceptor to the Loader Hook:
 *    - The `data:` URI is sent back to the loader hook.
 *
 * 7. Resolution by the Loader Hook:
 *    - The hook returns this `data:` URI to Node.js, which loads and executes it.
 *
 * 8. Global API Access Function for Dynamic Modules:
 *    - This interceptor defines a global function. The dynamic module calls this function
 *      with its embedded API key to retrieve the correct `vscode` API instance. The name
 *      of this global function is injected into the dynamic module template at build time.
 *
 * Dependencies and Environment:
 * - Node.js Version: Requires support for `node:module.register()` (e.g., Node.js >=18.19.0 or >=20.6.0).
 * - `IExtensionApiFactory`: For generating extension-specific `vscode` API instances.
 * - Helper Modules: For the loader hook logic and dynamic module script generation.
 *
 * Inspiration:
 * - Adapts patterns from VS Code's internal `NodeModuleESMInterceptor`.
 *
 * Last Reviewed/Updated: [Date of Merge or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import { Buffer } from "node:buffer";
import * as fs from "node:fs";
import nodeModuleSystem from "node:module";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
	MessageChannel,
	type MessagePort as NodeJsMessagePortFromWorkerThreads,
} from "node:worker_threads";
import {
	DisposableStore,
	toDisposable,
	type IDisposable,
} from "vs/base/common/lifecycle";
import { BidirectionalMap } from "vs/base/common/map";
import { URI } from "vs/base/common/uri";
import { generateUuid } from "vs/base/common/uuid";
import { IInstantiationService } from "vs/platform/instantiation/common/instantiation";
import { ILogService } from "vs/platform/log/common/log";
import type { IExtensionApiFactory } from "vs/workbench/api/common/extHost.api.impl";
import type * as vscode from "vscode"; // For vscode namespace type

// Assuming helper modules are in a subdirectory and compiled to .js
import { createDynamicVscodeModuleScript } from "./cocoon-esm-interceptor/dynamic-module-script-generator.js";

export interface CocoonESMInterceptorContext {
	apiFactory: IExtensionApiFactory;
}

export const COCOON_ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME = `_COCOON_RESOLVE_ESM_VSCODE_API_INSTANCE_`;

export class CocoonNodeModuleESMInterceptor implements IDisposable {
	private readonly _instanceDisposables = new DisposableStore();
	private _isInterceptorHookInstalled = false;
	private readonly _logService: ILogService;

	private static readonly _VSCODE_API_GLOBAL_RETRIEVAL_FUNCTION_NAME_INTERNAL_CONST =
		COCOON_ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME;

	private static readonly _LOADER_HOOK_SCRIPT_COMPILED_FILENAME =
		"cocoon-esm-interceptor/hook.js"; // Relative to this file's compiled location

	private static _createDataUriFromScriptContent(
		scriptContentString: string,
	): string {
		return `data:text/javascript;base64,${Buffer.from(scriptContentString).toString("base64")}`;
	}

	private static _loadLoaderHookScriptFileContent(): string {
		try {
			const currentInterceptorModuleFileURL = import.meta.url;
			if (!currentInterceptorModuleFileURL.startsWith("file:")) {
				const errorMessage = `[CocoonNodeModuleESMInterceptor] CRITICAL FAILURE: Cannot determine filesystem path for loader hook. import.meta.url ('${currentInterceptorModuleFileURL}') is not a 'file:' URL.`;
				console.error(errorMessage);
				throw new Error(errorMessage);
			}

			const currentInterceptorModulePath = fileURLToPath(
				currentInterceptorModuleFileURL,
			);
			const loaderHookScriptPath = path.resolve(
				path.dirname(currentInterceptorModulePath),
				CocoonNodeModuleESMInterceptor._LOADER_HOOK_SCRIPT_COMPILED_FILENAME,
			);

			if (!fs.existsSync(loaderHookScriptPath)) {
				const errorMessage = `[CocoonNodeModuleESMInterceptor] CRITICAL FAILURE: Loader hook script not found at: '${loaderHookScriptPath}'. Derived from: '${currentInterceptorModuleFileURL}'. Ensure '${CocoonNodeModuleESMInterceptor._LOADER_HOOK_SCRIPT_COMPILED_FILENAME}' is correctly placed.`;
				console.error(errorMessage);
				throw new Error(errorMessage);
			}
			return fs.readFileSync(loaderHookScriptPath, "utf8");
		} catch (errorReadingHookFile: any) {
			const errorMessageDetail =
				errorReadingHookFile instanceof Error
					? errorReadingHookFile.message
					: String(errorReadingHookFile);
			console.error(
				`[CocoonNodeModuleESMInterceptor] CRITICAL FAILURE: Failed to read loader hook script. Error: ${errorMessageDetail}`,
			);
			throw new Error(
				`Failed to load ESM loader hook script: ${errorMessageDetail}`,
			);
		}
	}

	constructor(
		private readonly _interceptorContextObject: CocoonESMInterceptorContext,
		@IInstantiationService
		private readonly _instantiationServiceInstance: IInstantiationService,
	) {
		this._logService = this._instantiationServiceInstance.get(ILogService);
		this._logService.trace(
			"[CocoonNodeModuleESMInterceptor] Instance created.",
		);
	}

	public dispose(): void {
		if (this._isInterceptorHookInstalled) {
			this._logService.warn(
				"[CocoonNodeModuleESMInterceptor] Disposing. Node.js loader hooks cannot be fully unregistered from current process. Cleaning up Cocoon's communication and global function.",
			);
		}
		this._instanceDisposables.dispose();
		this._logService.trace(
			"[CocoonNodeModuleESMInterceptor] Disposed internal resources.",
		);
	}

	public async install(): Promise<void> {
		if (this._isInterceptorHookInstalled) {
			this._logService.warn(
				"[CocoonNodeModuleESMInterceptor] Interceptor hook already installed. Skipping.",
			);
			return;
		}

		if (typeof nodeModuleSystem.register !== "function") {
			this._logService.error(
				'[CocoonNodeModuleESMInterceptor] CRITICAL FAILURE: `node:module.register` not available. ESM `import "vscode"` will NOT be intercepted. Check Node.js version (>=18.19.0 or >=20.6.0) or experimental flags.',
			);
			return;
		}

		this._logService.info(
			"[CocoonNodeModuleESMInterceptor] Installing ESM interceptor via `node:module.register`...",
		);

		let loaderHookScriptContentString: string;
		try {
			loaderHookScriptContentString =
				CocoonNodeModuleESMInterceptor._loadLoaderHookScriptFileContent();
		} catch (errorLoadingHookScriptFile: any) {
			this._logService.error(
				`[CocoonNodeModuleESMInterceptor] CRITICAL FAILURE: Failed to load loader hook script content. Interceptor cannot be installed. Error: ${errorLoadingHookScriptFile.message}`,
				errorLoadingHookScriptFile,
			);
			return;
		}

		const vscodeApiInstanceToApiKeyCache = new BidirectionalMap<
			typeof vscode,
			string
		>();
		const apiKeyToDynamicModuleDataUriCache = new Map<string, string>();
		const globalApiRetrievalFunctionName =
			CocoonNodeModuleESMInterceptor._VSCODE_API_GLOBAL_RETRIEVAL_FUNCTION_NAME_INTERNAL_CONST;

		if ((globalThis as any)[globalApiRetrievalFunctionName]) {
			this._logService.warn(
				`[CocoonNodeModuleESMInterceptor] Global function '${globalApiRetrievalFunctionName}' already exists. Overwriting.`,
			);
		}

		Object.defineProperty(globalThis, globalApiRetrievalFunctionName, {
			value: (
				apiKeyReceivedFromDynamicModule: string,
			): typeof vscode | undefined => {
				const vscodeApiInstanceForThisKey =
					vscodeApiInstanceToApiKeyCache.getKey(
						apiKeyReceivedFromDynamicModule,
					);
				if (!vscodeApiInstanceForThisKey) {
					console.error(
						`[${globalApiRetrievalFunctionName}] CRITICAL ERROR: No 'vscode' API instance found for API key: "${apiKeyReceivedFromDynamicModule}". ESM import will likely fail.`,
					);
				}
				return vscodeApiInstanceForThisKey;
			},
			enumerable: false,
			configurable: true,
			writable: false,
		});
		this._instanceDisposables.add(
			toDisposable(() => {
				delete (globalThis as any)[globalApiRetrievalFunctionName];
				this._logService.trace(
					`[CocoonNodeModuleESMInterceptor] Removed global API retrieval function: ${globalApiRetrievalFunctionName}.`,
				);
			}),
		);

		const { port1: mainThreadMessagePort, port2: loaderHookMessagePort } =
			new MessageChannel();
		this._instanceDisposables.add(
			toDisposable(() => {
				mainThreadMessagePort.close();
				loaderHookMessagePort.close();
				this._logService.trace(
					"[CocoonNodeModuleESMInterceptor] Closed MessageChannel ports.",
				);
			}),
		);

		const mainThreadNodeJsStylePort: NodeJsMessagePortFromWorkerThreads =
			mainThreadMessagePort as any;

		mainThreadNodeJsStylePort.on(
			"message",
			async (eventDataFromLoaderThread: {
				id: number;
				importingModuleUrl: string;
				requestedSpecifier: string;
			}) => {
				const {
					id: requestIdFromLoader,
					importingModuleUrl: importingModuleUrlString,
					requestedSpecifier,
				} = eventDataFromLoaderThread;
				try {
					const parentModuleUri = URI.parse(importingModuleUrlString);
					const vscodeApiInstanceForExtension =
						this._interceptorContextObject.apiFactory(
							parentModuleUri,
							undefined,
							undefined,
						);

					if (!vscodeApiInstanceForExtension) {
						const errorMessage = `API factory returned undefined 'vscode' instance for ${parentModuleUri.toString()}. Cannot resolve import of "${requestedSpecifier}".`;
						this._logService.error(
							`[CocoonNodeModuleESMInterceptor] ${errorMessage}`,
						);
						mainThreadMessagePort.postMessage({
							data: {
								id: requestIdFromLoader,
								error: { message: errorMessage },
							},
						});
						return;
					}

					let apiKeyForThisInstance =
						vscodeApiInstanceToApiKeyCache.get(
							vscodeApiInstanceForExtension,
						);
					if (!apiKeyForThisInstance) {
						apiKeyForThisInstance = generateUuid();
						vscodeApiInstanceToApiKeyCache.set(
							vscodeApiInstanceForExtension,
							apiKeyForThisInstance,
						);
					}

					let dynamicModuleDataUriForApiKey =
						apiKeyToDynamicModuleDataUriCache.get(
							apiKeyForThisInstance,
						);
					if (!dynamicModuleDataUriForApiKey) {
						const dynamicModuleScriptContentString =
							createDynamicVscodeModuleScript(
								apiKeyForThisInstance,
								vscodeApiInstanceForExtension,
							);
						dynamicModuleDataUriForApiKey =
							CocoonNodeModuleESMInterceptor._createDataUriFromScriptContent(
								dynamicModuleScriptContentString,
							);
						apiKeyToDynamicModuleDataUriCache.set(
							apiKeyForThisInstance,
							dynamicModuleDataUriForApiKey,
						);
					}
					mainThreadMessagePort.postMessage({
						data: {
							id: requestIdFromLoader,
							url: dynamicModuleDataUriForApiKey,
						},
					});
				} catch (errorProcessingRequestOnMainThread: any) {
					const errorMessageDetail = `Error on main thread processing ESM request for "${requestedSpecifier}" (from ${importingModuleUrlString}): ${errorProcessingRequestOnMainThread.message}`;
					this._logService.error(
						`[CocoonNodeModuleESMInterceptor] ${errorMessageDetail}`,
						errorProcessingRequestOnMainThread,
					);
					mainThreadMessagePort.postMessage({
						data: {
							id: requestIdFromLoader,
							error: {
								message: errorMessageDetail,
								stack: errorProcessingRequestOnMainThread.stack,
							},
						},
					});
				}
			},
		);

		mainThreadNodeJsStylePort.on("close", () => {
			this._logService.info(
				"[CocoonNodeModuleESMInterceptor] Main thread MessagePort closed. Communication with loader hook severed.",
			);
		});

		try {
			nodeModuleSystem.register(
				CocoonNodeModuleESMInterceptor._createDataUriFromScriptContent(
					loaderHookScriptContentString,
				),
				{
					parentURL: import.meta.url,
					data: { port: loaderHookMessagePort },
					transferList: [loaderHookMessagePort],
				},
			);
			this._isInterceptorHookInstalled = true;
			this._logService.info(
				"[CocoonNodeModuleESMInterceptor] ESM interceptor hook successfully registered. `import 'vscode'` will be intercepted.",
			);
		} catch (errorRegisteringHookWithNode: any) {
			this._logService.error(
				"[CocoonNodeModuleESMInterceptor] CRITICAL FAILURE: Failed to register ESM interceptor hook with Node.js. Error details:",
				errorRegisteringHookWithNode,
			);
			this.dispose(); // Attempt cleanup
		}
	}
}
