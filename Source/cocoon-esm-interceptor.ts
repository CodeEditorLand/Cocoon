// File: src/cocoon-esm-interceptor.ts
// Purpose: Main class for intercepting ESM 'import "vscode"' statements in Node.js.
//
// Description:
// The `CocoonNodeModuleESMInterceptor` class implements a mechanism to intercept
// ECMAScript Module (ESM) `import` statements for the 'vscode' module within
// extensions running in a Node.js environment (e.g., a Cocoon sidecar).
// It ensures that extensions receive an extension-specific instance of the VS Code API.
//
// How it works:
// 1. Registration: It registers a custom Node.js loader hook (defined in
//    `./cocoon-esm-interceptor/hook.ts`) using `node:module.register`. This hook
//    script runs in a separate loader thread.
// 2. Communication: A `MessageChannel` is established for two-way communication
//    between this main interceptor class (running in the main application thread)
//    and the loader hook thread.
// 3. Interception: When an extension's ESM code executes `import ... from 'vscode'`,

//    the loader hook's `resolve` function is triggered in the loader thread.
// 4. Request to Main Thread: The hook sends the `parentURL` (the URL of the module
//    performing the import) to this main interceptor via the `MessagePort`.
// 5. API Generation: This interceptor, upon receiving the request:
//    a. Uses an `IExtensionApiFactory` (provided during initialization) to get or
//       create the `vscode` API instance specific to the extension.
//    b. Generates a unique key for this API instance (caching it).
//    c. Constructs a JavaScript module string using a template (processed by
//       `./cocoon-esm-interceptor/dynamic.ts`). This script, when executed,

//       retrieves its specific API instance by calling a global function
//       (e.g., `_COCOON_RESOLVE_ESM_VSCODE_API`) with the unique key.
//    d. Converts this script into a `data:` URI.
// 6. Response to Loader: The `data:` URI is sent back to the loader hook thread.
// 7. Resolution: The loader hook resolves the `import 'vscode'` to this `data:` URI,

//    instructing Node.js to load it directly as an ES module.
// 8. Global API Access: This interceptor defines the global retrieval function
//    (e.g., `_COCOON_RESOLVE_ESM_VSCODE_API`) on `globalThis` on the main thread,

//    allowing the `data:` URI modules to access their specific API instances.
//
// Dependencies:
// - Node.js >=18.19.0 or >=20.6.0 (for `node:module.register`) or appropriate
//   experimental flags for older versions.
// - `IExtensionApiFactory` for providing extension-specific API instances.
// - Helper modules: `hook.ts` (loader hook logic) and `dynamic.ts` (dynamic
//   module script generation).
//
// Inspired by VS Code's internal `NodeModuleESMInterceptor`.
//

//--------------------------------------------------------------------------------------------*/

import { Buffer } from "node:buffer";
import * as fs from "node:fs";
import nodeModule from "node:module";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { MessageChannel, type MessagePort } from "node:worker_threads";
// VS Code / Base imports
import {
	DisposableStore,
	toDisposable,
	type IDisposable,
} from "vs/base/common/lifecycle";
import { BidirectionalMap } from "vs/base/common/map";
import { URI } from "vs/base/common/uri";
import { generateUuid } from "vs/base/common/uuid";
import { IInstantiationService } from "vs/platform/instantiation/common/instantiation.js";
import { ILogService } from "vs/platform/log/common/log.js";
// Assuming path
import type { IExtensionApiFactory } from "vs/workbench/api/common/extHost.api.impl";
import type * as vscode from "vscode";

// Cocoon-specific helper modules
// Note on import paths: These assume esbuild (or your bundler/tsc setup)
// correctly resolves and outputs these files. The `.js` extension is typical
// for importing compiled ESM JavaScript.
import { createDynamicVscodeModuleScript } from "./cocoon-esm-interceptor/dynamic.js";

/**
 * Context object provided to the `CocoonNodeModuleESMInterceptor` during its instantiation.
 * It allows access to essential services and factories needed for the interceptor's operation.
 */
export interface CocoonESMInterceptorContext {
	/**
	 * The factory responsible for creating or retrieving an extension-specific
	 * instance of the `vscode` API. This factory is invoked with the URI of the
	 * module importing 'vscode'.
	 */
	apiFactory: IExtensionApiFactory;
}

/**
 * The name of the global function defined on `globalThis` by this interceptor.
 * Dynamically created `data:` URI modules (representing the 'vscode' API for an
 * extension) will call this function with a unique key to retrieve their specific
 * `vscode` API instance.
 * This constant is also used by esbuild's `define` feature to inject this exact
 * name into the dynamic module template (`dynamic.template.ts`) at build time.
 */
export const COCOON_ESM_INTERCEPTOR_GLOBAL_API_FN_NAME = `_COCOON_RESOLVE_ESM_VSCODE_API`;

/**
 * Implements an interceptor for ESM `import 'vscode'` statements to provide
 * extension-specific instances of the VS Code API, leveraging Node.js loader hooks.
 */
export class CocoonNodeModuleESMInterceptor implements IDisposable {
	private readonly _disposables = new DisposableStore();

	private _isInstalled = false;

	private readonly _logService: ILogService;

	/**
	 * The internal name used for the global API retrieval function.
	 * It references the exported constant `COCOON_ESM_INTERCEPTOR_GLOBAL_API_FN_NAME`.
	 */
	private static readonly _VSCODE_API_GLOBAL_FUNCTION_NAME =
		COCOON_ESM_INTERCEPTOR_GLOBAL_API_FN_NAME;

	/**
	 * The filename of the compiled Node.js loader hook script.
	 * This script (originally `hook.ts`) is expected to be present in the same
	 * output directory as the compiled version of this interceptor class.
	 */
	private static readonly _LOADER_HOOK_SCRIPT_FILENAME =
		// Adjusted path
		"cocoon-esm-interceptor/hook.js";

	/**
	 * Creates a `data:` URI from a given JavaScript script content.
	 * The script is Base64 encoded for embedding in the URI.
	 * @param scriptContent The JavaScript content for the data URI.
	 * @returns A `data:` URI string (e.g., "data:text/javascript;base64,...").
	 */
	private static _createDataUri(scriptContent: string): string {
		return `data:text/javascript;base64,${Buffer.from(scriptContent).toString("base64")}`;
	}

	/**
	 * Loads the content of the Node.js loader hook script from its compiled JavaScript file.
	 * This script (`hook.js`) runs in a separate loader thread.
	 * @returns The string content of the loader hook script.
	 * @throws Error if the script file cannot be found or read, which is critical.
	 */
	private static _loadLoaderHookScriptContent(): string {
		try {
			// URL of this interceptor module itself
			const currentModuleFileURL = import.meta.url;

			if (!currentModuleFileURL.startsWith("file:")) {
				const errMsg = `[CocoonNodeModuleESMInterceptor] CRITICAL: Cannot determine loader hook script path. import.meta.url ('${currentModuleFileURL}') is not a file URL. Ensure this module is loaded as a local file.`;

				// Log to console as logService might not be initialized if this static method is called very early.
				console.error(errMsg);

				throw new Error(errMsg);
			}

			const currentModulePath = fileURLToPath(currentModuleFileURL);

			// The compiled hook script is expected to be relative to the compiled interceptor.
			// e.g., if interceptor is in `dist/cocoon-esm-interceptor.js`, hook is `dist/cocoon-esm-interceptor/hook.js`
			const hookScriptPath = path.resolve(
				// Use path.resolve for robustness
				path.dirname(currentModulePath),

				CocoonNodeModuleESMInterceptor._LOADER_HOOK_SCRIPT_FILENAME,
			);

			if (!fs.existsSync(hookScriptPath)) {
				const errMsg = `[CocoonNodeModuleESMInterceptor] CRITICAL: Loader hook script not found at expected path: ${hookScriptPath}. This path was derived from import.meta.url: ${currentModuleFileURL}. Ensure '${CocoonNodeModuleESMInterceptor._LOADER_HOOK_SCRIPT_FILENAME}' (compiled from 'hook.ts') is present in the output directory structure.`;

				console.error(errMsg);

				throw new Error(errMsg);
			}

			return fs.readFileSync(hookScriptPath, "utf8");
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			console.error(
				`[CocoonNodeModuleESMInterceptor] CRITICAL: Failed to read loader hook script. Error: ${errorMessage}`,
			);

			// Re-throw to ensure the installation process is aware of the critical failure.
			throw new Error(
				`Failed to load ESM loader hook script: ${errorMessage}`,
			);
		}
	}

	/**
	 * Creates an instance of CocoonNodeModuleESMInterceptor.
	 * @param _interceptorContext Context providing the `IExtensionApiFactory`.
	 * @param _instantiationService VS Code's instantiation service, used to get `ILogService`.
	 */
	constructor(
		private readonly _interceptorContext: CocoonESMInterceptorContext,

		@IInstantiationService
		private readonly _instantiationService: IInstantiationService,
	) {
		this._logService = this._instantiationService.get(ILogService);

		this._logService.trace(
			"[CocoonNodeModuleESMInterceptor] Instance created.",
		);
	}

	/**
	 * Disposes of resources held by the interceptor.
	 * This involves closing the `MessageChannel` and removing the global API retrieval function.
	 * Note: Node.js loader hooks, once registered, generally cannot be "unregistered"
	 * for the lifetime of the process. This method cleans up Cocoon's side.
	 */
	public dispose(): void {
		if (this._isInstalled) {
			this._logService.warn(
				'[CocoonNodeModuleESMInterceptor] Disposing. Note: Node.js loader hooks cannot be cleanly "unregistered". ' +
					"The communication channel and global API function will be removed, rendering the hook ineffective for new 'vscode' imports.",
			);
		}

		// Closes MessageChannel ports, removes global function.
		this._disposables.dispose();

		this._logService.trace(
			"[CocoonNodeModuleESMInterceptor] Disposed of internal resources.",
		);
	}

	/**
	 * Installs the ESM interceptor by registering the custom Node.js loader hook.
	 * This method should be called once during application initialization.
	 * It is asynchronous due to the nature of some setup steps.
	 */
	public async install(): Promise<void> {
		if (this._isInstalled) {
			this._logService.warn(
				"[CocoonNodeModuleESMInterceptor] Interceptor is already installed. Skipping re-installation.",
			);

			return;
		}

		if (typeof nodeModule.register !== "function") {
			this._logService.error(
				"[CocoonNodeModuleESMInterceptor] `node:module.register` is not available. " +
					'ESM "vscode" imports will NOT be intercepted. ' +
					"Ensure Node.js version is >= 18.19.0 or >= 20.6.0, or appropriate experimental flags are used.",
			);

			return;
		}

		this._logService.info(
			"[CocoonNodeModuleESMInterceptor] Installing ESM interceptor via node:module.register...",
		);

		let loaderHookScriptContent: string;

		try {
			loaderHookScriptContent =
				CocoonNodeModuleESMInterceptor._loadLoaderHookScriptContent();
		} catch (e: any) {
			this._logService.error(
				`[CocoonNodeModuleESMInterceptor] CRITICAL: Failed to load the loader hook script. The interceptor cannot be installed. Error: ${e.message}`,

				e,
			);

			// Installation cannot proceed without the hook script.
			return;
		}

		// Cache for `vscode` API instances to their unique keys.
		const apiInstanceToKeyCache = new BidirectionalMap<
			typeof vscode,
			string
		>();

		// Cache for unique API keys to their corresponding `data:` URI ESM module strings.
		const apiKeyToDataUriCache = new Map<string, string>();

		const globalApiFunctionName =
			CocoonNodeModuleESMInterceptor._VSCODE_API_GLOBAL_FUNCTION_NAME;

		if ((globalThis as any)[globalApiFunctionName]) {
			this._logService.warn(
				`[CocoonNodeModuleESMInterceptor] Global function '${globalApiFunctionName}' already exists on globalThis. It will be overwritten. This might indicate a re-installation without proper cleanup or a name collision.`,
			);
		}

		// Define the global function that data: URI modules will call.
		Object.defineProperty(globalThis, globalApiFunctionName, {
			value: (apiKey: string): typeof vscode | undefined => {
				const apiInstance = apiInstanceToKeyCache.getKey(apiKey);

				if (!apiInstance) {
					// This console.error is critical as it runs in the context of the dynamic module.
					console.error(
						`[${globalApiFunctionName}] CRITICAL: No 'vscode' API instance found for key "${apiKey}". ` +
							"This indicates a severe issue in the ESM interceptor's API caching or key generation. " +
							'ESM import of "vscode" will likely fail for the calling extension.',
					);
				}

				return apiInstance;
			},

			// Hide from `for...in` loops on `globalThis`.
			enumerable: false,

			// Allow re-definition for testing or re-installation.
			configurable: true,

			// Make the function itself read-only.
			writable: false,
		});

		this._disposables.add(
			toDisposable(() => {
				delete (globalThis as any)[globalApiFunctionName];

				this._logService.trace(
					`[CocoonNodeModuleESMInterceptor] Cleaned up global API function: ${globalApiFunctionName}`,
				);
			}),
		);

		// Setup MessageChannel for communication with the loader hook thread.
		const { port1: mainThreadPort, port2: loaderHookPort } =
			new MessageChannel();

		this._disposables.add(
			toDisposable(() => {
				mainThreadPort.close();

				// loaderHookPort is transferred, but closing mainThreadPort should signal the loader thread.
				// Explicitly closing loaderHookPort here is mostly for completeness if its reference were kept.
				loaderHookPort.close();

				this._logService.trace(
					"[CocoonNodeModuleESMInterceptor] MessageChannel ports closed.",
				);
			}),
		);

		// Type assertion for Node.js MessagePort compatibility.
		const mainThreadNodeJsPort: MessagePort = mainThreadPort as any;

		// Handle messages from the loader hook thread (requests for 'vscode' API).
		mainThreadNodeJsPort.on(
			"message",

			async (eventFromLoader: {
				id: number;

				importingModuleUrl: string;
			}) => {
				const { id: requestId, importingModuleUrl } = eventFromLoader;

				// For debugging:
				// this._logService.trace(`[Cocoon Main Thread] Received request (ID ${requestId}) from loader for 'vscode' import from: ${importingModuleUrl}`);

				try {
					const parentUri = URI.parse(importingModuleUrl);

					const apiInstance = this._interceptorContext.apiFactory(
						parentUri,

						// IExtensionRegistries - apiFactory must handle if needed for ESM.
						undefined,

						// ExtHostConfigProvider - apiFactory must handle if needed for ESM.
						undefined,
					);

					if (!apiInstance) {
						const errorMsg = `API factory returned undefined for importing module URI: ${parentUri.toString()}`;

						this._logService.error(
							`[CocoonNodeModuleESMInterceptor] ${errorMsg}`,
						);

						mainThreadPort.postMessage({
							id: requestId,

							error: { message: errorMsg },
						});

						return;
					}

					let apiKey = apiInstanceToKeyCache.get(apiInstance);

					if (!apiKey) {
						apiKey = generateUuid();

						apiInstanceToKeyCache.set(apiInstance, apiKey);
					}

					let dynamicModuleDataUri = apiKeyToDataUriCache.get(apiKey);

					if (!dynamicModuleDataUri) {
						// Generate the script for the dynamic 'vscode' module.
						// The globalApiFunctionName is injected into the template by esbuild.
						const moduleScriptContent =
							createDynamicVscodeModuleScript(
								apiKey,

								apiInstance,
							);

						dynamicModuleDataUri =
							CocoonNodeModuleESMInterceptor._createDataUri(
								moduleScriptContent,
							);

						apiKeyToDataUriCache.set(apiKey, dynamicModuleDataUri);

						// For debugging:
						// this._logService.trace(`[Cocoon Main Thread] Created dynamic data: URI for API key ${apiKey} (for ${parentUri.fsPath}). Preview: ${dynamicModuleDataUri.substring(0,150)}...`);
					}

					mainThreadPort.postMessage({
						id: requestId,

						url: dynamicModuleDataUri,
					});
				} catch (error: any) {
					const errorMsg = `Error in mainThreadPort.onmessage handler for "vscode" import from ${importingModuleUrl}: ${error.message}`;

					this._logService.error(
						`[CocoonNodeModuleESMInterceptor] ${errorMsg}`,

						error,
					);

					mainThreadPort.postMessage({
						id: requestId,

						error: { message: errorMsg, stack: error.stack },
					});
				}
			},
		);

		mainThreadNodeJsPort.on("close", () => {
			this._logService.info(
				"[CocoonNodeModuleESMInterceptor] MessagePort on main thread closed. " +
					"The loader hook thread will no longer be able to resolve 'vscode' imports.",
			);
		});

		try {
			// Register the loader hook script with Node.js.
			nodeModule.register(
				CocoonNodeModuleESMInterceptor._createDataUri(
					loaderHookScriptContent,
				),

				{
					// URL of this interceptor module itself.
					parentURL: import.meta.url,

					// Pass the loader hook's end of the MessageChannel.
					data: { port: loaderHookPort },

					// Transfer ownership of the port to the loader thread.
					transferList: [loaderHookPort],
				},
			);

			this._isInstalled = true;

			this._logService.info(
				"[CocoonNodeModuleESMInterceptor] ESM interceptor successfully registered with Node.js. " +
					"Future ESM `import 'vscode'` statements by extensions will be intercepted.",
			);
		} catch (err: any) {
			this._logService.error(
				"[CocoonNodeModuleESMInterceptor] CRITICAL: Failed to register ESM interceptor with Node.js. " +
					'ESM "vscode" imports will likely fail or use standard Node.js resolution.',

				err,
			);

			// Attempt to clean up partially initialized resources if registration fails.
			this.dispose();
		}
	}
}
