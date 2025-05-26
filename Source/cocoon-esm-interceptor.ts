/*---------------------------------------------------------------------------------------------
 * Cocoon Node.js ESM Interceptor (cocoon-esm-interceptor.ts)
 * --------------------------------------------------------------------------------------------
 * Implements an interceptor for ECMAScript Module (ESM) `import` statements within
 * extensions running in the Cocoon Node.js sidecar. Specifically, it targets
 * `import ... from 'vscode'` to provide the correct, extension-specific instance
 * of the VS Code API.
 *
 * This mechanism is crucial for supporting modern VS Code extensions that utilize ESM.
 * It leverages Node.js's experimental loader hooks (via `module.register`) and
 * inter-thread communication (using `MessageChannel`) to dynamically resolve the
 * 'vscode' module specifier. When an extension imports 'vscode', this interceptor
 * communicates with the main Cocoon thread to obtain a dynamically generated `data:` URI.
 * This `data:` URI contains a script that exports the `vscode` API object tailored for
 * the importing extension.
 *
 * Responsibilities:
 * - Registering a custom Node.js loader hook using `node:module.register`.
 * - Establishing a `MessageChannel` for communication between the loader hook thread
 *   and the main Cocoon application thread.
 * - When an `import 'vscode'` is encountered by an extension:
 *     - The loader hook (running in a separate thread) sends the `parentURL` (path of the
 *       importing module) to the main Cocoon thread via the `MessageChannel`.
 *     - The main Cocoon thread uses an `IExtensionApiFactory` (provided during
 *       initialization) to get or create the `vscode` API instance specific to that extension.
 *     - The main thread generates a unique key for this API instance and a JavaScript
 *       module string (exported as a `data:` URI). This `data:` URI module will, when
 *       executed, retrieve its specific API instance using the unique key.
 *     - The main thread sends this `data:` URI back to the loader hook thread.
 * - The loader hook's `resolve` function then resolves `import 'vscode'` to this
 *   dynamically generated `data:` URI.
 * - Defining a global function (e.g., `_COCOON_IMPORT_VSCODE_API`) on `globalThis` that
 *   the script within the `data:` URI module calls to retrieve its specific API instance,
 * 
 *   using the unique key.
 *
 * Key Interactions:
 * - Instantiated and its `install()` method is called by `Cocoon/index.ts`.
 * - Uses `node:module.register` (requires Node.js >= 18.19.0 or >= 20.6.0, or
 *   appropriate experimental flags for older versions like `--experimental-loader`).
 * - Uses `node:worker_threads.MessageChannel` for robust inter-thread communication.
 * - Relies on an `IExtensionApiFactory` (provided by `Cocoon/index.ts` via the
 *   `CocoonInterceptorContext`) to obtain extension-specific `vscode` API instances.
 * - The design is inspired by and adapted from VS Code's internal
 *   `NodeModuleESMInterceptor` (found in `vs/workbench/api/node/extHostExtensionService.ts`).
 *

 *--------------------------------------------------------------------------------------------*/

// For Buffer.from, used in creating data URIs.
import { Buffer } from "node:buffer";
// Node.js specific module for loader registration.
import nodeModule from "node:module";
// Node.js specific module for inter-thread communication.
import { MessageChannel, type MessagePort } from "node:worker_threads";
// VS Code common utilities
import {
	DisposableStore,
	toDisposable,
	type IDisposable,
} from "vs/base/common/lifecycle";
import { BidirectionalMap } from "vs/base/common/map";
// VS Code's URI implementation
import { URI } from "vs/base/common/uri";
import { generateUuid } from "vs/base/common/uuid";
// VS Code platform services (used for type annotations and DI)
import { IInstantiationService } from "vs/platform/instantiation/common/instantiation.js";
import { ILogService } from "vs/platform/log/common/log.js";
// Type definition for the API factory provided by Cocoon's main setup.
// This factory is responsible for creating or retrieving the `vscode` API instance
// tailored for a specific extension.
import type { IExtensionApiFactory } from "vs/workbench/api/common/extHost.api.impl";
// Type definition for the `vscode` API object.
import type * as vscode from "vscode";

// The context expected by this interceptor, containing the API factory.
// This is slightly different from INodeModuleFactory context for CJS.

/**
 * Context object provided to the `CocoonNodeModuleESMInterceptor` during its instantiation.
 * It allows access to essential services and factories needed for the interceptor's operation.
 */
export interface CocoonESMInterceptorContext {
	/**
	 * The factory responsible for creating or retrieving an extension-specific
	 * instance of the `vscode` API.
	 */
	apiFactory: IExtensionApiFactory;

	// TODO: Consider adding other services if the apiFactory or interceptor logic requires more context,

	// e.g., IExtHostExtensionService for resolving extension descriptions if the apiFactory needs it directly
	// and cannot get it from the parentURL alone.
	// For example:
	// extensionService?: IExtHostExtensionService;

	// configurationService?: IExtHostConfiguration;

	// If context needs its own logger different from DI one.
	// logService?: ILogService;
}

/**
 * Implements an interceptor for ESM `import 'vscode'` statements to provide
 * extension-specific instances of the VS Code API.
 */
export class CocoonNodeModuleESMInterceptor implements IDisposable {
	// Renamed from _store for clarity
	private readonly _disposables = new DisposableStore();

	private _isInstalled = false;

	private readonly _logService: ILogService;

	/**
	 * A unique name for the global function that dynamically created `data:` URI modules
	 * will call to retrieve their specific `vscode` API instance.
	 * This name should be unique enough to avoid collisions in the global scope.
	 */
	private static readonly _VSCODE_API_GLOBAL_FUNCTION_NAME = `_COCOON_GET_EXTENSION_SPECIFIC_VSCODE_API`;

	/**
	 * Creates a `data:` URI from a given JavaScript script content.
	 * The script is Base64 encoded.
	 * @param scriptContent The JavaScript content for the data URI.
	 * @returns A `data:` URI string.
	 */
	private static _createDataUri(scriptContent: string): string {
		return `data:text/javascript;base64,${Buffer.from(scriptContent).toString("base64")}`;
	}

	/**
	 * The JavaScript code for the Node.js loader hook. This script runs in a separate
	 * loader thread and communicates with the main Cocoon thread via a `MessageChannel`.
	 *
	 * - `initialize(context)`: Receives the `MessagePort` from the main thread. Sets up
	 *   an `onmessage` handler to receive resolved `data:` URIs from the main thread
	 *   and fulfill pending promises.
	 * - `resolve(specifier, context, nextResolve)`: The core hook.
	 *   - If `specifier` is not 'vscode' or `parentURL` is missing, it delegates to the
	 *     next loader in the chain (`nextResolve`).
	 *   - If 'vscode' is imported, it sends the `parentURL` (importing module's path)
	 *     to the main thread via the port.
	 *   - It then waits for a promise that will be resolved with the `data:` URI
	 *     sent back by the main thread.
	 *   - Returns the `data:` URI with `shortCircuit: true` to indicate that Node.js
	 *     should use this URL directly, bypassing further resolution.
	 */
	private static readonly _LOADER_HOOK_SCRIPT = `
// --- Cocoon ESM Loader Hook Script ---

let portForMainThreadCommunication;

let nextRequestId = 0;

// Maps requestId to { resolve, reject }

const pendingApiRequests = new Map();

// Called by Node.js when this loader is registered.

// The 'context' here is the 'data' object passed to 'module.register()'.

export const initialize = (context) => {
	if (!context || !context.port) {
		console.error(
			"[Cocoon ESM Loader Hook] Initialization failed: MessagePort not received from main thread.",
		);

		return;
	}

	portForMainThreadCommunication = context.port;

	portForMainThreadCommunication.on("message", (event) => {
		// Main thread sends back { id, url } or { id, error }

		const { id, url, error } = event.data;

		const request = pendingApiRequests.get(id);

		if (request) {
			if (error) {
				request.reject(
					new Error(
						error.message ||
							"Failed to resolve vscode API from main thread",
					),
				);
			} else {
				request.resolve(url);
			}

			// Clean up
			pendingApiRequests.delete(id);
		}
	});

	// Optional: Send a confirmation back to the main thread if needed, though console.log is often sufficient for bootstrap.

	// portForMainThreadCommunication.postMessage({ type: 'loaderInitialized' });

	console.log(
		"[Cocoon ESM Loader Hook] Initialized successfully with MessagePort.",
	);
};

// The 'resolve' hook, called by Node.js for each ESM import.

export const resolve = async (specifier, context, nextResolve) => {
	// We only care about 'vscode' imports from valid parent modules.

	if (specifier !== "vscode" || !context.parentURL) {
		// console.debug('[Cocoon ESM Loader Hook] Passing to nextResolve:', specifier, context.parentURL);

		// Delegate to the next loader in the chain.
		return nextResolve(specifier, context);
	}

	if (!portForMainThreadCommunication) {
		console.error(
			'[Cocoon ESM Loader Hook] Cannot resolve "vscode": MessagePort to main thread is not available. Falling back to nextResolve.',
		);

		return nextResolve(specifier, context);
	}

	// console.debug('[Cocoon ESM Loader Hook] Intercepting "vscode" import from:', context.parentURL);

	const currentRequestId = nextRequestId++;

	const apiPromise = new Promise((resolve, reject) => {
		pendingApiRequests.set(currentRequestId, { resolve, reject });
	});

	// Request the 'vscode' API data URI from the main thread.

	portForMainThreadCommunication.postMessage({
		id: currentRequestId,

		// Send the URL of the module that is importing 'vscode'
		importingModuleUrl: context.parentURL,
	});

	try {
		const dynamicApiModuleUrl = await apiPromise;

		// console.debug('[Cocoon ESM Loader Hook] Resolved "vscode" to dynamic data URI (first 100 chars):', String(dynamicApiModuleUrl).substring(0, 100) + '...');

		return {
			// The data: URI provided by the main thread
			url: dynamicApiModuleUrl,

			// Tell Node.js to use this URL directly
			shortCircuit: true,
			// Ensure it's treated as an ES module
			format: "module",
		};
	} catch (error) {
		console.error(
			\`[Cocoon ESM Loader Hook] Error resolving "vscode" for \${context.parentURL}: \${error.message}. Falling back to nextResolve.\`,
		);

		// Clean up failed request
		pendingApiRequests.delete(currentRequestId);

		// Fallback on error
		return nextResolve(specifier, context);
	}
};

console.log(
	"[Cocoon ESM Loader Hook] Loader script itself has been parsed by Node.js.",
);
`;

	/**
	 * Creates an instance of CocoonNodeModuleESMInterceptor.
	 * @param _interceptorContext Context providing the `IExtensionApiFactory`.
	 * @param _instantiationService VS Code's instantiation service, used here to get `ILogService`.
	 */
	constructor(
		private readonly _interceptorContext: CocoonESMInterceptorContext,

		@IInstantiationService
		private readonly _instantiationService: IInstantiationService,
	) {
		this._logService = this._instantiationService.get(ILogService);

		this._logService.trace("[CocoonNodeModuleESMInterceptor] Created.");
	}

	/**
	 * Disposes of resources held by the interceptor, primarily the `MessageChannel`
	 * and the global API retrieval function.
	 * Note: Node.js loader hooks, once registered, cannot be cleanly "unregistered"
	 * for the lifetime of the process. This dispose method cleans up Cocoon's side.
	 */
	public dispose(): void {
		if (this._isInstalled) {
			this._logService.warn(
				'[CocoonNodeModuleESMInterceptor] Disposing. Note: Node.js loader hooks cannot be cleanly "unregistered". Active interception might persist for the process lifetime, though the communication channel and global function will be removed.',
			);
		}

		// This will close ports and delete the global function
		this._disposables.dispose();

		this._logService.trace("[CocoonNodeModuleESMInterceptor] Disposed.");
	}

	/**
	 * Installs the ESM interceptor by registering the custom Node.js loader hook.
	 * This method is asynchronous and should be called once during Cocoon initialization.
	 */
	public async install(): Promise<void> {
		if (this._isInstalled) {
			this._logService.warn(
				"[CocoonNodeModuleESMInterceptor] Interceptor already installed. Skipping.",
			);

			return;
		}

		if (typeof nodeModule.register !== "function") {
			this._logService.error(
				'[CocoonNodeModuleESMInterceptor] `node:module.register` is not available. ESM "vscode" imports will NOT be intercepted. Ensure Node.js version is >= 18.19.0 or >= 20.6.0, or that appropriate experimental flags (e.g., --experimental-loader) are used for older versions.',
			);

			return;
		}

		this._logService.info(
			"[CocoonNodeModuleESMInterceptor] Installing ESM interceptor via node:module.register...",
		);

		// Cache for `vscode` API instances and their corresponding dynamic module data URIs.
		// BidirectionalMap: Maps (vscode.API object instance) <-> (unique string key)
		const apiInstanceToKeyCache = new BidirectionalMap<
			typeof vscode,
			string
		>();

		// Map: Maps (unique string key) -> (data: URI string for the ESM module)
		const apiKeyToDataUriCache = new Map<string, string>();

		// Define the global function that dynamically generated ESM `data:` URI modules will call.
		// This function must exist on `globalThis` *before* any loader hook attempts to execute a
		// `data:` URI module that calls it.
		const globalApiFunctionName =
			CocoonNodeModuleESMInterceptor._VSCODE_API_GLOBAL_FUNCTION_NAME;

		if ((globalThis as any)[globalApiFunctionName]) {
			this._logService.warn(
				`[CocoonNodeModuleESMInterceptor] Global function ${globalApiFunctionName} already exists on globalThis. It will be overwritten. This might indicate a re-installation attempt without proper cleanup or a name collision.`,
			);
		}

		Object.defineProperty(globalThis, globalApiFunctionName, {
			enumerable: false,

			// Allow re-definition for testing or re-installation scenarios.
			configurable: true,

			// Make the function itself read-only.
			writable: false,

			value: (apiKey: string): typeof vscode | undefined => {
				const apiInstance = apiInstanceToKeyCache.getKey(apiKey);

				// this._logService.trace(`[CocoonNodeModuleESMInterceptor] Global function ${globalApiFunctionName} called with key "${apiKey}". API instance ${apiInstance ? "found" : "NOT found"}.`);

				if (!apiInstance) {
					console.error(
						`[Cocoon ESM Interceptor Global] CRITICAL: No API instance found for key "${apiKey}". This should not happen if data URIs are generated correctly.`,
					);
				}

				return apiInstance;
			},
		});

		this._disposables.add(
			toDisposable(() => {
				delete (globalThis as any)[globalApiFunctionName];

				this._logService.trace(
					`[CocoonNodeModuleESMInterceptor] Cleaned up global API function: ${globalApiFunctionName}`,
				);
			}),
		);

		// Create a MessageChannel for communication between the main thread and the loader hook thread.
		const { port1: mainThreadPort, port2: loaderHookPort } =
			new MessageChannel();

		this._disposables.add(
			toDisposable(() => {
				mainThreadPort.close();

				loaderHookPort.close();

				this._logService.trace(
					"[CocoonNodeModuleESMInterceptor] MessageChannel ports closed.",
				);
			}),
		);

		// Type assertion for Node.js MessagePort compatibility if TS is strict about WorkerMessagePort vs NodeMessagePort
		const mainThreadNodeJsPort: MessagePort = mainThreadPort as any;

		// Handler for messages received on the main thread from the loader hook.
		mainThreadNodeJsPort.on(
			"message",

			async (eventFromLoader: {
				id: string;

				importingModuleUrl: string;
			}) => {
				const { id: requestId, importingModuleUrl } = eventFromLoader;

				// this._logService.trace(`[CocoonNodeModuleESMInterceptor] Main thread received message from loader: RequestID=${requestId}, ImportingModuleURL=${importingModuleUrl}`);

				try {
					// URL of the module importing 'vscode'
					const parentUri = URI.parse(importingModuleUrl);

					// Use the provided apiFactory to get/create the vscode API instance.
					// The apiFactory itself might use ExtensionPaths or similar to find the extension
					// description associated with the parentUri.
					const apiInstance = this._interceptorContext.apiFactory(
						// The API factory needs to handle being called with a URI
						parentUri,

						// The original VSCodeNodeModuleFactory passed (extDescription, extensionRegistries, configProvider).
						// The apiFactoryProvider in index.ts must be designed to work with just the parentUri if these are not available
						// or if the ESM interceptor context doesn't provide them.
						// For ESM, ExtensionRegistries and ConfigProvider might need to be pre-resolved or globally available
						// to the apiFactory if it strictly requires them beyond what it can infer from parentUri.
						// Placeholder for IExtensionRegistries
						undefined,

						// Placeholder for ExtHostConfigProvider
						undefined,
					);

					if (!apiInstance) {
						this._logService.error(
							`[CocoonNodeModuleESMInterceptor] API factory returned undefined for importing module ${parentUri.toString()}. Responding with empty module.`,
						);

						mainThreadPort.postMessage({
							id: requestId,

							error: {
								message: `API factory failed for ${parentUri.toString()}`,
							},
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
						// Dynamically generate the ESM module content as a string.
						// This module will call the global function to get its specific API instance.
						const exportStatements = Object.keys(apiInstance)
							.map(
								(propName) =>
									`export const ${propName} = __apiInstance['${propName}'];`,
							)
							.join("\n");

						const moduleScriptContent = `
 // --- Cocoon Dynamic 'vscode' API Module ---
						
                        const __apiInstance = globalThis.${globalApiFunctionName}('${apiKey}');
						
						
                        if (!__apiInstance) {
						
                            throw new Error('Cocoon Error: Failed to retrieve vscode API instance for ESM module via key "${apiKey}". Global function ${globalApiFunctionName} might be missing or API key is invalid.');
							
							
                        }
							
 // console.log('[Cocoon ESM vscode Module] API instance retrieved successfully for key "${apiKey}". Exporting ${Object.keys(__apiInstance).length} properties.');
 
						
						
                        ${exportStatements}
						
                         // Provide a default export for "import vscode from 'vscode'"
						export default __apiInstance;
						
                    `;

						dynamicModuleDataUri =
							CocoonNodeModuleESMInterceptor._createDataUri(
								moduleScriptContent,
							);

						apiKeyToDataUriCache.set(apiKey, dynamicModuleDataUri);

						// this._logService.trace(`[CocoonNodeModuleESMInterceptor] Created dynamic data URI for API key ${apiKey}.`);
					}

					mainThreadPort.postMessage({
						id: requestId,

						url: dynamicModuleDataUri,
					});
				} catch (error: any) {
					this._logService.error(
						`[CocoonNodeModuleESMInterceptor] Error in mainThreadPort.onmessage handler: ${error.message}`,

						error,
					);

					mainThreadPort.postMessage({
						id: requestId,

						error: {
							message:
								error.message ||
								"Unknown error processing vscode import.",
						},
					});
				}
			},
		);

		mainThreadNodeJsPort.on("close", () => {
			this._logService.info(
				"[CocoonNodeModuleESMInterceptor] Main thread port closed. Loader hook will no longer be able to communicate.",
			);
		});

		try {
			// Register the loader hook script.
			// `import.meta.url` provides the URL of the current module (cocoon-esm-interceptor.ts),

			// which is a valid requirement for `parentURL` in `module.register`.
			nodeModule.register(
				CocoonNodeModuleESMInterceptor._createDataUri(
					CocoonNodeModuleESMInterceptor._LOADER_HOOK_SCRIPT,
				),

				{
					parentURL: import.meta.url,

					// Pass one end of the MessageChannel to the loader hook.
					data: { port: loaderHookPort },

					// Transfer ownership of the port to the loader thread.
					transferList: [loaderHookPort],
				},
			);

			this._isInstalled = true;

			this._logService.info(
				"[CocoonNodeModuleESMInterceptor] ESM interceptor successfully registered with Node.js loader hooks. `import 'vscode'` will now be intercepted.",
			);
		} catch (err: any) {
			this._logService.error(
				'[CocoonNodeModuleESMInterceptor] CRITICAL: Failed to register ESM interceptor with Node.js loader hooks. ESM "vscode" imports will fail or use standard resolution.',

				err,
			);

			// If registration fails, clean up resources that were set up before the attempt.
			// Call dispose to clean up channel and global function.
			this.dispose();
		}
	}
}
