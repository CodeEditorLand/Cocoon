/*---------------------------------------------------------------------------------------------
 * Cocoon Node.js ESM Interceptor (cocoon-esm-interceptor.ts)
 * --------------------------------------------------------------------------------------------
 * Implements an interceptor for ECMAScript Module (ESM) `import` statements within
 * extensions running in the Cocoon Node.js sidecar. Specifically, it targets
 * `import ... from 'vscode'` to provide the correct, extension-specific instance
 * of the VS Code API.
 *
 * This mechanism is crucial for supporting modern VS Code extensions that use ESM.
 * It leverages Node.js's experimental loader hooks (`module.register`) and
 * inter-thread communication (via `MessageChannel`) to dynamically resolve the
 * 'vscode' module specifier to a dynamically generated `data:` URI. This `data:`
 * URI contains a script that exports the API object tailored for the importing
 * extension.
 *
 * Responsibilities:
 * - Registering a custom Node.js loader hook.
 * - Communicating with the main Cocoon thread (via `MessageChannel`) when an
 *   `import 'vscode'` is encountered by an extension:
 *     - Loader thread sends the `parentURL` (importing module's path) to the main thread.
 *     - Main thread uses an API factory to get/create the `vscode` API instance for
 *       that extension.
 *     - Main thread generates a unique key for this API instance and a JavaScript
 *       module string (as a `data:` URI) that exports this instance.
 *     - Main thread sends the `data:` URI back to the loader thread.
 * - The loader hook resolves `import 'vscode'` to this dynamic `data:` URI.
 * - Defining a global function (`_COCOON_IMPORT_VSCODE_API`) that the dynamic
 *   `data:` URI module calls to retrieve its specific API instance.
 *
 * Key Interactions:
 * - Instantiated and installed by `Cocoon/index.ts`.
 * - Uses `node:module.register` (requires compatible Node.js version/flags).
 * - Uses `node:worker_threads.MessageChannel` for communication with the loader hook.
 * - Relies on an `IExtensionApiFactory` (provided by `index.ts`) to obtain
 *   extension-specific `vscode` API instances.
 * - Inspired by and adapted from VS Code's internal `NodeModuleESMInterceptor`
 *   (found in `vs/workbench/api/node/extHostExtensionService.ts`).
 *--------------------------------------------------------------------------------------------*/

// For Buffer.from for data URI
import { Buffer } from "node:buffer";
// Node.js specific modules
// For nodeModule.register
import nodeModule from "node:module";
// For MessageChannel
import { MessageChannel, type MessagePort } from "node:worker_threads";
import {
	DisposableStore,
	type IDisposable,
	toDisposable,
} from "vs/base/common/lifecycle";
import { BidirectionalMap } from "vs/base/common/map";
// VS Code's URI
import { URI } from "vs/base/common/uri";
import { generateUuid } from "vs/base/common/uuid";
import { IInstantiationService } from "vs/platform/instantiation/common/instantiation.js";
import { ILogService } from "vs/platform/log/common/log.js";
// For the typeof vscode type
import type * as vscode from "vscode";

// Types from your existing setup or VS Code
// Assuming your INodeModuleFactory is here or compatible
import { INodeModuleFactory } from "./node-module-shim-factory";

// This interface would be similar to what the original RequireInterceptor takes,

// allowing access to the API factory.
interface CocoonInterceptorContext {
	// The factory you create in index.ts
	apiFactory: IExtensionApiFactory;

	// Potentially other services if needed by the factories when `load` is called
}

export class CocoonNodeModuleESMInterceptor implements IDisposable {
	private readonly _store = new DisposableStore();

	private _isInstalled = false;

	private _logService: ILogService;

	// Static parts similar to the original
	// Unique global name
	private static readonly _vscodeImportFnName = `_COCOON_IMPORT_VSCODE_API`;

	private static _createDataUri(scriptContent: string): string {
		return `data:text/javascript;base64,${Buffer.from(scriptContent).toString("base64")}`;
	}

	// Loader script remains largely the same, but might use a different global function name if desired
	private static _loaderScript = `
        let lookup;
		
        export const initialize = async (context) => {
            let requestIds = 0;
			
            const { port } = context;
			
            const pendingRequests = new Map();
			
            port.onmessage = (event) => {
                const { id, url } = event.data;
				
                pendingRequests.get(id)?.(url);
				
                 // Clean up
				pendingRequests.delete(id);
				
            };
			
            lookup = url => {
                const myId = requestIds++;
				
                return new Promise((resolve) => {
                    pendingRequests.set(myId, resolve);
					
                    port.postMessage({ id: myId, url });
					
                });
				
            };
			
            console.log('[Cocoon ESM Loader] Initialized with port.');
			
        };
		
        export const resolve = async (specifier, context, nextResolve) => {
            if (specifier !== 'vscode' || !context.parentURL) {
 // console.log('[Cocoon ESM Loader] Passing to nextResolve:', specifier, context.parentURL);
 
			
                return nextResolve(specifier, context);
				
            }
				
				
 // console.log('[Cocoon ESM Loader] Intercepting "vscode" from:', context.parentURL);
 
			
            const otherUrl = await lookup(context.parentURL);
			
 // console.log('[Cocoon ESM Loader] Resolved "vscode" to data URI:', otherUrl.substring(0, 100) + '...');
 
			
            return {
                url: otherUrl,
				
                shortCircuit: true,
				
            };
			
        };
		
        console.log('[Cocoon ESM Loader] Loader script registered.');
		
    `;

	constructor(
		// Provide API factory here
		private readonly _interceptorContext: CocoonInterceptorContext,

		@IInstantiationService
		// For logging
		private readonly _instaService: IInstantiationService,

		// Add other DI services if needed, e.g., ILogService
	) {
		this._logService = this._instaService.get(ILogService);

		this._logService.trace("[CocoonESMInterceptor] Created.");
	}

	public dispose(): void {
		if (this._isInstalled) {
			this._logService.warn(
				'[CocoonESMInterceptor] Disposing, but Node.js loader hooks cannot be cleanly "unregistered". Active interception might persist for the lifetime of the process.',
			);

			// Node.js currently doesn't provide a way to unregister loader hooks.
			// The best we can do is clean up our side.
		}

		this._store.dispose();

		this._logService.trace("[CocoonESMInterceptor] Disposed.");
	}

	public async install(): Promise<void> {
		if (this._isInstalled) {
			this._logService.warn("[CocoonESMInterceptor] Already installed.");

			return;
		}

		if (typeof nodeModule.register !== "function") {
			this._logService.error(
				'[CocoonESMInterceptor] nodeModule.register is not available. ESM "vscode" imports will not be intercepted. Ensure Node.js version is >= 18.19.0 or >=20.6.0 or appropriate flags are used.',
			);

			return;
		}

		this._logService.info(
			"[CocoonESMInterceptor] Installing ESM interceptor...",
		);

		// Cache for API instances and their corresponding dynamic module data URIs
		// Maps API object to unique key
		const apiInstances = new BidirectionalMap<typeof vscode, string>();

		// Maps unique key to data: URI
		const apiModuleDataUris = new Map<string, string>();

		// Define the global function that the dynamically generated ESM module will call
		// This function needs to be on globalThis BEFORE the loader hook tries to use it.
		if (
			(globalThis as any)[
				CocoonNodeModuleESMInterceptor._vscodeImportFnName
			]
		) {
			this._logService.warn(
				`[CocoonESMInterceptor] Global function ${CocoonNodeModuleESMInterceptor._vscodeImportFnName} already exists. Overwriting.`,
			);
		}

		Object.defineProperty(
			globalThis,

			CocoonNodeModuleESMInterceptor._vscodeImportFnName,

			{
				enumerable: false,

				// Allow re-definition if re-installing (though unregistering is tricky)
				configurable: true,

				writable: false,

				value: (key: string): typeof vscode | undefined => {
					const api = apiInstances.getKey(key);

					// this._logService.trace(`[CocoonESMInterceptor] Global _COCOON_IMPORT_VSCODE_API called with key "${key}", found API: ${!!api}`);

					return api;
				},
			},
		);

		const { port1, port2 } = new MessageChannel();

		this._store.add(
			toDisposable(() => {
				port1.close();

				port2.close();

				delete (globalThis as any)[
					CocoonNodeModuleESMInterceptor._vscodeImportFnName
					// Clean up global
				];

				this._logService.trace(
					"[CocoonESMInterceptor] Cleaned up MessageChannel and global function.",
				);
			}),
		);

		// Cast for Node.js MessagePort type
		const port1ForNodeJS: MessagePort = port1 as any;

		port1ForNodeJS.on("message", (e: { id: string; url: string }) => {
			try {
				// this._logService.trace(`[CocoonESMInterceptor] Main thread received message from loader: id=${e.id}, url=${e.url}`);

				// URL of the importing module
				const parentUri = URI.parse(e.url);

				// Use the provided apiFactory to get/create the vscode API instance
				// The apiFactory itself uses ExtensionPaths to find the extension for the parentUri
				const apiInstance = this._interceptorContext.apiFactory(
					// The API factory needs to handle URI or IExtensionDescription
					parentUri as any,

					// ExtensionRegistries, might need to pass this from index.ts
					undefined as any,

					// ConfigProvider, might need to pass this from index.ts
					undefined as any,
				);

				// ^-- IMPORTANT: The arguments to apiFactory need to be correctly supplied.
				// The original VSCodeNodeModuleFactory passes (extDescription, extensionRegistries, configProvider).
				// You'll need to adapt this to how your apiFactoryProvider in index.ts expects to be called,

				// or make your CocoonInterceptorContext richer.
				// For simplicity, I'm assuming your apiFactory in index.ts can handle being called like this
				// or you adjust your `this._interceptorContext.apiFactory`.
				// The key is that it must return the correct `typeof vscode` object for the `parentUri`.

				if (!apiInstance) {
					this._logService.error(
						`[CocoonESMInterceptor] API factory returned undefined for ${parentUri.toString()}`,
					);

					port1.postMessage({
						id: e.id,

						url: CocoonNodeModuleESMInterceptor._createDataUri(
							"export default {};",
						),

						// Send empty module on error
					});

					return;
				}

				let key = apiInstances.get(apiInstance);

				if (!key) {
					key = generateUuid();

					apiInstances.set(apiInstance, key);
				}

				let scriptDataUrlSrc = apiModuleDataUris.get(key);

				if (!scriptDataUrlSrc) {
					// Dynamically generate the ESM module content
					const exportStatements = Object.keys(apiInstance)
						.map(
							(name) =>
								`export const ${name} = _vscodeInstance['${name}'];`,
						)
						.join("\n");

					const jsCode = `
                        const _vscodeInstance = globalThis.${CocoonNodeModuleESMInterceptor._vscodeImportFnName}('${key}');
						
                        if (!_vscodeInstance) { throw new Error('Failed to retrieve vscode API instance for ESM module via key ${key}'); }
						
						
 // console.log('[Cocoon ESM vscode Module] Instance retrieved:', !!_vscodeInstance, 'keys:', Object.keys(_vscodeInstance).length);
 
						
                        ${exportStatements}
						
						
                         // Also provide a default export
						export default _vscodeInstance;
						
                    `;

					scriptDataUrlSrc =
						CocoonNodeModuleESMInterceptor._createDataUri(jsCode);

					apiModuleDataUris.set(key, scriptDataUrlSrc);

					// this._logService.trace(`[CocoonESMInterceptor] Created data URI for key ${key}`);
				}

				port1.postMessage({ id: e.id, url: scriptDataUrlSrc });
			} catch (err: any) {
				this._logService.error(
					`[CocoonESMInterceptor] Error in port1.onmessage: ${err.message}`,

					err,
				);

				port1.postMessage({
					id: e.id,

					url: CocoonNodeModuleESMInterceptor._createDataUri(
						"export default {};",
					),

					// Send empty module on error
				});
			}
		});

		try {
			nodeModule.register(
				CocoonNodeModuleESMInterceptor._createDataUri(
					CocoonNodeModuleESMInterceptor._loaderScript,
				),

				{
					// Correctly reference the CJS module's URL
					parentURL: import.meta.url,

					data: { port: port2 },

					transferList: [port2],
				},
			);

			this._isInstalled = true;

			this._logService.info(
				"[CocoonESMInterceptor] ESM interceptor successfully registered with Node.js loader hooks.",
			);
		} catch (err: any) {
			this._logService.error(
				'[CocoonESMInterceptor] Failed to register ESM interceptor with Node.js loader hooks. ESM "vscode" imports will fail.',

				err,
			);

			// Clean up if registration failed
			this._store.dispose();
		}
	}
}
