/*---------------------------------------------------------------------------------------------
 * Cocoon ESM Interceptor (cocoon-esm-interceptor.ts)
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
 *      hook. This hook script (defined in `./cocoon-esm-interceptor/hook.ts`) runs in a
 *      separate "loader thread" managed by Node.js.
 *    - The content of the hook script is loaded from a file, converted to a `data:` URI,
 *      and then registered using `node:module.register()`. This API is available in
 *      Node.js versions >=18.19.0 or >=20.6.0 (or older versions with appropriate
 *      experimental flags like `--experimental-loader`).
 *
 * 2. Inter-Thread Communication via MessageChannel:
 *    - A `MessageChannel` (from `node:worker_threads`) is established to facilitate
 *      two-way communication between this main interceptor class (running in Cocoon's
 *      main application thread) and the loader hook script (running in the separate
 *      loader thread).
 *    - One `MessagePort` from this channel is transferred to the loader hook thread
 *      during its initialization (via the `data` property of `node:module.register`).
 *
 * 3. Interception by the Loader Hook (`hook.ts`):
 *    - When an extension's ESM code executes an `import` statement (e.g., for 'vscode' or 'land'),
 *      the loader hook's `resolve(specifier, context, nextResolve)` function is triggered
 *      in the loader thread.
 *    - The hook identifies if the `specifier` (the string being imported) is one of the
 *      targeted modules (e.g., 'vscode', 'land').
 *
 * 4. Request from Loader Hook to This Main Interceptor:
 *    - If the import is targeted for interception, the loader hook sends a message (containing
 *      the `parentURL` of the importing module and the `requestedSpecifier`) to this main
 *      interceptor class via the shared `MessagePort`.
 *
 * 5. API Instance Generation by This Main Interceptor:
 *    - This `CocoonNodeModuleESMInterceptor` instance, running on Cocoon's main thread,
 *      receives the resolution request from the loader hook.
 *    - It uses an injected `IExtensionApiFactory` (provided during its construction via
 *      `CocoonESMInterceptorContext`) to get or create the appropriate `vscode` API instance.
 *      This API instance is tailored for the specific extension identified by the `parentURL`.
 *    - It generates a unique API key (UUID) for this specific `vscode` API instance and caches
 *      the instance against this key in a `BidirectionalMap`. This caching is crucial because
 *      the dynamic module eventually loaded by the extension needs a reliable way to retrieve
 *      this exact instance.
 *    - It then calls `createDynamicVscodeModuleScript` (from the helper module
 *      `./cocoon-esm-interceptor/dynamic-module-script-generator.ts`) to construct the
 *      JavaScript source code for a dynamic ESM module. This generated script content will
 *      include the unique API key. When executed, this script will call a global function
 *      (whose name is injected into the template at build time) to retrieve the API instance
 *      using this key.
 *    - The generated JavaScript module string is then converted into a `data:` URI.
 *
 * 6. Response from This Main Interceptor to the Loader Hook:
 *    - The `data:` URI (which represents the dynamically generated 'vscode' module) is sent
 *      back as a response to the loader hook thread via the `MessagePort`.
 *
 * 7. Resolution by the Loader Hook:
 *    - The loader hook's `resolve` function receives this `data:` URI.
 *    - It then returns this `data:` URI to the Node.js module system, along with the flags
 *      `shortCircuit: true` (to bypass other resolvers) and `format: 'module'`.
 *      Node.js then loads and executes the JavaScript content directly from this `data:` URI,
 *      effectively resolving the `import 'vscode'` (or aliased) statement for the extension.
 *
 * 8. Global API Access Function for Dynamic Modules:
 *    - This interceptor defines a global function on `globalThis` (e.g., named by the
 *      constant `COCOON_ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME`). The exact name of this
 *      function is also injected into the dynamic module template (`dynamic.template.js`)
 *      at build time by the build tool (e.g., esbuild's `define` feature).
 *    - When the dynamically generated `data:` URI module (representing the 'vscode' API)
 *      executes in the extension's context, it calls this global function, passing its
 *      embedded unique API key.
 *    - The global function uses this API key to look up and return the correct,
 *      extension-specific `vscode` API instance from the cache managed by this interceptor.
 *
 * Dependencies and Environment:
 * - Node.js Version: Requires a Node.js version that supports `node:module.register()`
 *   for ESM loader hooks (generally Node.js >=18.19.0 or >=20.6.0, though older versions
 *   might support it with experimental flags like `--experimental-loader`).
 * - `IExtensionApiFactory`: A crucial dependency provided via `CocoonESMInterceptorContext`
 *   for generating or retrieving extension-specific `vscode` API instances.
 * - Helper Modules:
 *   - `./cocoon-esm-interceptor/hook.ts`: Contains the logic that runs in the separate
 *     Node.js loader thread.
 *   - `./cocoon-esm-interceptor/dynamic-module-script-generator.ts`: Contains the function
 *     that generates the JavaScript source code for the dynamic 'vscode' modules.
 *
 * Inspiration:
 * - This mechanism is inspired by and adapts patterns from VS Code's internal
 *   `NodeModuleESMInterceptor` (found in `vs/workbench/api/node/extHostExtensionService.ts`),
 *   which handles ESM `import 'vscode'` statements in VS Code's standard Node.js-based
 *   extension host.
 *--------------------------------------------------------------------------------------------*/

// --- Node.js Core Module Imports ---
import { Buffer } from "node:buffer"; // For Base64 encoding used in creating data URIs.
import * as fs from "node:fs"; // For reading the loader hook script file from disk.
import nodeModuleSystem from "node:module"; // For accessing `nodeModuleSystem.register()` to install the loader hook.

// Note: The import is `node:module`, not `node:modules`.
import * as path from "node:path"; // For path manipulation, specifically for resolving the hook script's path.
import { fileURLToPath } from "node:url"; // For converting `import.meta.url` (which is a file URL) to a filesystem path.
import {
	MessageChannel,
	type MessagePort as NodeJsMessagePortFromWorkerThreads,
} from "node:worker_threads"; // For creating a communication channel between this main thread and the loader hook thread.

// --- VS Code / Base Module Imports ---
// These are core utilities from VS Code's `base` and `platform` layers.
import {
	DisposableStore, // Utility class for managing a collection of multiple IDisposable objects.
	toDisposable, // Utility function to create an IDisposable from a cleanup function.
	type IDisposable, // Interface for objects that can be disposed of to release resources.
} from "vs/base/common/lifecycle";
import { BidirectionalMap } from "vs/base/common/map"; // A map that allows lookup by key or by value, useful for caching API instances against unique keys.
import { URI } from "vs/base/common/uri"; // VS Code's URI implementation, used for parsing `parentURL` from the hook.
import { generateUuid } from "vs/base/common/uuid"; // For generating unique API keys for cached API instances.
import { IInstantiationService } from "vs/platform/instantiation/common/instantiation"; // VS Code's Dependency Injection service.
import { ILogService } from "vs/platform/log/common/log"; // VS Code's logging service interface.

// --- VS Code API Related Imports ---
// Type definition for the API factory function that is responsible for creating
// or retrieving an extension-specific instance of the `vscode` API object.
import type { IExtensionApiFactory } from "vs/workbench/api/common/extHost.api.impl";
// Import the `vscode` namespace type. This is used for type checking the API instances
// that are generated by the `apiFactory` and cached by this interceptor.
// This import should resolve to Cocoon's shimmed `vscode` API definition.
import type * as vscode from "vscode";

// --- Cocoon Specific Helper Module Imports ---
// Note on import paths for these helpers: These paths assume that the build process
// (e.g., esbuild or tsc) correctly resolves these relative paths and outputs the
// compiled JavaScript files (typically with a `.js` extension) in the expected
// directory structure relative to this `cocoon-esm-interceptor.ts` file.
// The `.js` extension is used here as it's standard for importing compiled ESM JavaScript modules.
import { createDynamicVscodeModuleScript } from "./cocoon-esm-interceptor/dynamic-module-script-generator.js";

/**
 * Context object provided to the `CocoonNodeModuleESMInterceptor` during its instantiation.
 * This context allows the interceptor to access essential services and factories
 * required for its operation, most importantly the `apiFactory` which is used for
 * generating or retrieving the correct `vscode` API instances for extensions.
 */
export interface CocoonESMInterceptorContext {
	/**
	 * The factory function responsible for creating or retrieving an extension-specific
	 * instance of the `vscode` API object. This factory is invoked by the interceptor
	 * with the URI of the module that is attempting to import 'vscode' (or an alias like 'land').
	 * This URI provides the context needed for the factory to tailor the API instance
	 * appropriately for that specific extension.
	 */
	apiFactory: IExtensionApiFactory;
}

/**
 * The fixed name of the global function that will be defined on `globalThis` by this interceptor.
 * When a dynamically generated `data:` URI module (which represents the 'vscode' API for a
 * specific extension) is loaded and executed by Node.js as a result of an `import` statement,
 * it will call this global function. It passes a unique API key (that was embedded in the
 * `data:` URI module's script) to this global function. The global function then uses this
 * key to look up and return the correct, extension-specific `vscode` API instance from a
 * cache managed by this `CocoonNodeModuleESMInterceptor`.
 *
 * This constant name (`_COCOON_RESOLVE_ESM_VSCODE_API_INSTANCE_`) is also critically important
 * for the build process. It must be used by the build tool (e.g., esbuild's `define` feature)
 * to inject this exact string name into the dynamic module template file (`dynamic.template.js`)
 * at build time. This ensures that the JavaScript code in the template and the runtime global
 * function defined by this interceptor use the same, consistent name for the API retrieval mechanism.
 */
export const COCOON_ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME = `_COCOON_RESOLVE_ESM_VSCODE_API_INSTANCE_`;

/**
 * Implements an interceptor for ECMAScript Module (ESM) `import 'vscode'` statements
 * (and its configured aliases like 'land'). It ensures that extensions running in the Cocoon
 * Node.js environment receive an extension-specific, correctly shimmed instance of the
 * VS Code API when they use ESM imports for the 'vscode' module.
 * This is achieved by leveraging Node.js's modern module customization hooks (ESM loaders).
 */
export class CocoonNodeModuleESMInterceptor implements IDisposable {
	// A `DisposableStore` instance to manage all `IDisposable` resources created by this
	// interceptor (e.g., the MessageChannel ports, the global API retrieval function).
	// This ensures that all these resources are properly cleaned up when the interceptor is disposed.
	private readonly _instanceDisposables = new DisposableStore();

	// A boolean flag to track whether the interceptor's loader hook has been successfully
	// installed with Node.js via `node:module.register()`. This prevents re-installation.
	private _isInterceptorHookInstalled = false;

	// An instance of VS Code's logging service (`ILogService`), obtained via Dependency Injection.
	// Used for logging informational messages, warnings, and errors related to the interceptor's operation.
	private readonly _logService: ILogService;

	/**
	 * The internal constant name used by this class for the global API retrieval function.
	 * This references the exported constant `COCOON_ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME`
	 * for consistency and to ensure it matches the name that is expected to be injected into
	 * the dynamic module template (`dynamic.template.js`) by the build tool at build time.
	 */
	private static readonly _VSCODE_API_GLOBAL_RETRIEVAL_FUNCTION_NAME_INTERNAL_CONST =
		COCOON_ESM_INTERCEPTOR_GLOBAL_API_FUNCTION_NAME;

	/**
	 * The filename of the compiled Node.js loader hook script.
	 * This script (originally authored as `hook.ts`) contains the `initialize` and `resolve`
	 * functions that will be executed by Node.js in a separate loader thread.
	 * It is expected to be located in a subdirectory named `cocoon-esm-interceptor`
	 * relative to the compiled location of this `CocoonNodeModuleESMInterceptor` class file.
	 * For example, if this interceptor class file is compiled to `dist/cocoon-esm-interceptor.js`,
	 * the hook script is expected to be found at `dist/cocoon-esm-interceptor/hook.js`.
	 */
	private static readonly _LOADER_HOOK_SCRIPT_COMPILED_FILENAME =
		"cocoon-esm-interceptor/hook.js";

	/**
	 * Creates a `data:` URI string from a given JavaScript script content string.
	 * The script content is Base64 encoded for safe embedding within the URI.
	 * This method is used to create a `data:` URI for the loader hook script, which can then
	 * be passed to `node:module.register()`. This allows the hook to be registered with
	 * Node.js without needing it to be a separate physical file on the filesystem at runtime,
	 * which can be advantageous for packaging and distribution of Cocoon.
	 *
	 * @param scriptContentString - The JavaScript source code content to be encoded into the data URI.
	 * @returns A `data:` URI string, for example: "data:text/javascript;base64,BASE64_ENCODED_SCRIPT_CONTENT".
	 */
	private static _createDataUriFromScriptContent(
		scriptContentString: string,
	): string {
		return `data:text/javascript;base64,${Buffer.from(scriptContentString).toString("base64")}`;
	}

	/**
	 * Loads the string content of the Node.js loader hook script from its compiled
	 * JavaScript file (e.g., `hook.js`, as specified by `_LOADER_HOOK_SCRIPT_COMPILED_FILENAME`).
	 * This script contains the `initialize` and `resolve` hook functions that will be
	 * executed by Node.js in its separate loader thread.
	 *
	 * @returns The string content of the loader hook script.
	 * @throws An `Error` if the loader hook script file cannot be found at its expected
	 *         location or if there's an error reading its content. This is considered a
	 *         critical failure for the interceptor's installation.
	 */
	private static _loadLoaderHookScriptFileContent(): string {
		try {
			// Get the URL of the current module file (i.e., this `cocoon-esm-interceptor.ts` file itself).
			// `import.meta.url` provides the URL of the current module, which is typically a `file:` URL
			// when running in a Node.js environment from a local file.
			const currentInterceptorModuleFileURL = import.meta.url;

			// Ensure that `import.meta.url` is indeed a `file:` URL, as we need to convert it to a
			// filesystem path to reliably locate the hook script file relative to it.
			if (!currentInterceptorModuleFileURL.startsWith("file:")) {
				const errorMessage =
					`[CocoonNodeModuleESMInterceptor] CRITICAL FAILURE: Cannot determine the filesystem path for the loader hook script. ` +
					`The URL of the current module (import.meta.url = '${currentInterceptorModuleFileURL}') is not a 'file:' URL. ` +
					`This ESM interceptor must be loaded as a local file module to correctly locate its hook script.`;
				// Log to console directly as `this._logService` might not be initialized if this static method
				// is called very early in the process or in an erroneous state.
				console.error(errorMessage);
				throw new Error(errorMessage); // This is a fatal error for the setup process.
			}

			// Convert the `file:` URL of the current interceptor module to an absolute filesystem path.
			const currentInterceptorModulePath = fileURLToPath(
				currentInterceptorModuleFileURL,
			);

			// Resolve the absolute path to the loader hook script file.
			// It's expected to be located relative to this interceptor file, as specified by
			// `_LOADER_HOOK_SCRIPT_COMPILED_FILENAME`. Using `path.resolve` ensures an
			// absolute path and handles platform-specific path separators correctly.
			const loaderHookScriptPath = path.resolve(
				path.dirname(currentInterceptorModulePath), // The directory containing this interceptor file.
				CocoonNodeModuleESMInterceptor._LOADER_HOOK_SCRIPT_COMPILED_FILENAME, // The relative path to `hook.js`.
			);

			// Check if the loader hook script file actually exists at the resolved path.
			if (!fs.existsSync(loaderHookScriptPath)) {
				const errorMessage =
					`[CocoonNodeModuleESMInterceptor] CRITICAL FAILURE: The Node.js loader hook script was not found at its expected path: '${loaderHookScriptPath}'. ` +
					`This path was derived from the current module's URL: '${currentInterceptorModuleFileURL}'. ` +
					`Please ensure that the file '${CocoonNodeModuleESMInterceptor._LOADER_HOOK_SCRIPT_COMPILED_FILENAME}' (which should be the compiled JavaScript output of 'hook.ts') ` +
					`is present in the correct location within the output directory structure relative to this interceptor module.`;
				console.error(errorMessage);
				throw new Error(errorMessage); // This is a fatal error if the hook script is missing.
			}

			// Read the content of the loader hook script file as a UTF-8 encoded string.
			return fs.readFileSync(loaderHookScriptPath, "utf8");
		} catch (errorReadingHookFile) {
			// Catch any errors that occur during file reading or path resolution.
			const errorMessageDetail =
				errorReadingHookFile instanceof Error
					? errorReadingHookFile.message
					: String(errorReadingHookFile);
			console.error(
				`[CocoonNodeModuleESMInterceptor] CRITICAL FAILURE: Failed to read the content of the loader hook script file. Error: ${errorMessageDetail}`,
			);
			// Re-throw as a new error to ensure that the installation process (`install()` method)
			// is clearly aware of this critical failure.
			throw new Error(
				`Failed to load the ESM loader hook script content due to: ${errorMessageDetail}`,
			);
		}
	}

	/**
	 * Creates an instance of `CocoonNodeModuleESMInterceptor`.
	 * @param _interceptorContextObject - An object providing the context needed by the interceptor,
	 *                                    primarily the `apiFactory` (of type `IExtensionApiFactory`)
	 *                                    which is responsible for creating or retrieving extension-specific
	 *                                    instances of the `vscode` API object.
	 * @param _instantiationServiceInstance - VS Code's `IInstantiationService` instance. This is used
	 *                                      by the constructor to obtain an instance of `ILogService`
	 *                                      for logging messages from this interceptor.
	 */
	constructor(
		private readonly _interceptorContextObject: CocoonESMInterceptorContext,
		@IInstantiationService
		private readonly _instantiationServiceInstance: IInstantiationService,
	) {
		// Obtain an instance of the logging service via Dependency Injection.
		this._logService = this._instantiationServiceInstance.get(ILogService);
		this._logService.trace(
			"[CocoonNodeModuleESMInterceptor] Instance created.",
		);
	}

	/**
	 * Disposes of resources held by this interceptor instance.
	 * This primarily involves closing the `MessageChannel` ports that were used for
	 * communication with the loader hook thread, and removing the global API retrieval
	 * function (e.g., `_COCOON_RESOLVE_ESM_VSCODE_API_INSTANCE_`) that was defined on `globalThis`.
	 *
	 * Note on Unregistering Loader Hooks: Node.js loader hooks, once registered via
	 * `node:module.register`, generally cannot be cleanly "unregistered" or removed
	 * from the Node.js runtime for the lifetime of the current Node.js process.
	 * This `dispose` method focuses on cleaning up Cocoon's side of the interaction,
	 * which effectively renders the registered hook non-functional for any new 'vscode'
	 * (or aliased) imports that occur after this disposal. However, the hook itself
	 * might still be technically registered with Node.js.
	 */
	public dispose(): void {
		if (this._isInterceptorHookInstalled) {
			// Log a warning if disposing an installed interceptor, clarifying the limitation about unregistering hooks.
			this._logService.warn(
				"[CocoonNodeModuleESMInterceptor] Disposing the ESM interceptor. " +
					'Note: Node.js loader hooks, once registered with `node:module.register`, cannot be fully "unregistered" ' +
					"from the Node.js runtime for the current process. This dispose action will clean up Cocoon's " +
					"communication channel (MessagePorts) and the global API retrieval function. This will render the " +
					'hook ineffective for any new "vscode" (or aliased) imports that occur after this disposal, but the ' +
					"hook itself may technically remain registered with Node.js until the process exits.",
			);
		}

		// Dispose of all disposables that were added to the `_instanceDisposables` store.
		// This typically includes the `MessageChannel` ports and the cleanup logic for the
		// global API retrieval function.
		this._instanceDisposables.dispose();

		this._logService.trace(
			"[CocoonNodeModuleESMInterceptor] Successfully disposed of internal resources (MessageChannel, global API function).",
		);
	}

	/**
	 * Installs the ESM interceptor by registering the custom Node.js loader hook
	 * (from `hook.ts`) with the Node.js runtime.
	 * This method should typically be called once during the initialization phase of Cocoon.
	 *
	 * The installation process involves:
	 * 1. Checking if the interceptor is already installed or if `node:module.register` is unavailable.
	 * 2. Loading the content of the compiled loader hook script (`hook.js`).
	 * 3. Setting up a global function (e.g., `_COCOON_RESOLVE_ESM_VSCODE_API_INSTANCE_`) on `globalThis`
	 *    that the dynamic `data:` URI modules will call to retrieve their `vscode` API instances.
	 * 4. Creating a `MessageChannel` for communication between this main thread and the loader hook thread.
	 * 5. Registering the loader hook script with Node.js using `node:module.register()`, passing
	 *    one end of the `MessageChannel` (`loaderHookMessagePort`) to the hook's `initialize` function.
	 *
	 * This method is asynchronous because some setup steps (like reading the hook script in
	 * other potential implementations, though `fs.readFileSync` is synchronous here) might
	 * be asynchronous. The registration with `node:module.register` itself is synchronous,
	 * but returning a `Promise` from `install` allows for future flexibility if async setup
	 * steps are needed before registration.
	 */
	public async install(): Promise<void> {
		if (this._isInterceptorHookInstalled) {
			this._logService.warn(
				"[CocoonNodeModuleESMInterceptor] Attempted to install the interceptor hook, but it is already installed. Skipping re-installation.",
			);
			return;
		}

		// Check if the `node:module.register()` API is available in the current Node.js environment.
		// This API is essential for registering ESM loader hooks.
		if (typeof nodeModuleSystem.register !== "function") {
			this._logService.error(
				"[CocoonNodeModuleESMInterceptor] CRITICAL FAILURE: The `node:module.register` function is not available in this Node.js environment. " +
					'ESM `import "vscode"` (and its aliases) will NOT be intercepted by this mechanism. ' +
					"This will likely lead to 'module not found' errors for extensions using ESM imports for 'vscode'. " +
					"Please ensure you are using a Node.js version that supports this API (e.g., Node.js >=18.19.0 or >=20.6.0), " +
					"or that appropriate experimental flags (like `--experimental-loader` for older Node.js versions, if applicable) are correctly set.",
			);
			// Cannot proceed with installation if `node:module.register` is unavailable.
			return;
		}

		this._logService.info(
			"[CocoonNodeModuleESMInterceptor] Starting the installation process for the ESM interceptor using `node:module.register`...",
		);

		let loaderHookScriptContentString: string;
		try {
			// Load the string content of the loader hook script (`hook.js`).
			// This script contains the `initialize` and `resolve` functions for the loader thread.
			loaderHookScriptContentString =
				CocoonNodeModuleESMInterceptor._loadLoaderHookScriptFileContent();
		} catch (errorLoadingHookScriptFile: any) {
			this._logService.error(
				`[CocoonNodeModuleESMInterceptor] CRITICAL FAILURE: Failed to load the content of the loader hook script file. The ESM interceptor cannot be installed. Error details: ${errorLoadingHookScriptFile.message}`,
				errorLoadingHookScriptFile, // Log the full error object for more details.
			);
			// Installation cannot proceed if the hook script content cannot be loaded.
			return;
		}

		// --- Setup for Global API Retrieval Function and Caching Mechanism ---
		// This cache maps a specific `vscode` API instance (object) to its unique string key (a UUID).
		// The key is then embedded in the dynamic module script, which uses it to retrieve this exact API instance.
		// Using a BidirectionalMap allows easy lookup from API instance to key, or from key back to API instance.
		const vscodeApiInstanceToApiKeyCache = new BidirectionalMap<
			typeof vscode,
			string
		>();

		// This cache maps a unique API key to the `data:` URI string of its corresponding dynamically generated module.
		// This avoids regenerating the module script content and the `data:` URI if the same API instance
		// (identified by its API key) is needed again for another import by the same (or potentially different,
		// if API instances are shared, though typically they are per-extension) module.
		const apiKeyToDynamicModuleDataUriCache = new Map<string, string>();

		// Get the predefined name for the global API retrieval function. This name must match
		// what's expected by the dynamic module template (`dynamic.template.js` after build processing).
		const globalApiRetrievalFunctionName =
			CocoonNodeModuleESMInterceptor._VSCODE_API_GLOBAL_RETRIEVAL_FUNCTION_NAME_INTERNAL_CONST;

		// Check if a function with this name already exists on `globalThis`. This is a sanity check.
		if ((globalThis as any)[globalApiRetrievalFunctionName]) {
			this._logService.warn(
				`[CocoonNodeModuleESMInterceptor] A global function named '${globalApiRetrievalFunctionName}' already exists on 'globalThis'. ` +
					`It will be overwritten by the ESM interceptor's API retrieval function. This might indicate a previous, unterminated ` +
					`interceptor installation without proper cleanup, or a potential name collision with other code in the environment.`,
			);
		}

		// Define the global function on `globalThis`. This function will be called by the JavaScript code
		// within the dynamically generated `data:` URI modules (which represent the 'vscode' API for a
		// specific extension). The dynamic module script will pass its embedded `apiKeyReceivedFromDynamicModule`
		// to this global function.
		Object.defineProperty(globalThis, globalApiRetrievalFunctionName, {
			value: (
				apiKeyReceivedFromDynamicModule: string,
			): typeof vscode | undefined => {
				// Use the `apiKeyReceivedFromDynamicModule` to look up the corresponding `vscode` API instance
				// from the `vscodeApiInstanceToApiKeyCache`. The `getKey` method of `BidirectionalMap` looks up by value (the API key).
				const vscodeApiInstanceForThisKey =
					vscodeApiInstanceToApiKeyCache.getKey(
						apiKeyReceivedFromDynamicModule,
					);

				if (!vscodeApiInstanceForThisKey) {
					// This is a critical error if it occurs at runtime. It means the dynamic module (from a data: URI)
					// called this global function with an API key that was not found in the cache.
					// This message will appear in the console of the environment executing the dynamic module.
					console.error(
						`[${globalApiRetrievalFunctionName}] CRITICAL ERROR: No 'vscode' API instance was found in the cache for the provided API key: "${apiKeyReceivedFromDynamicModule}". ` +
							"This indicates a severe issue in the Cocoon ESM interceptor's API instance caching mechanism or in the API key generation/propagation process. " +
							'The ESM import of "vscode" (or an alias) will likely fail or return an undefined module for the calling extension.',
					);
				}
				// Return the retrieved `vscode` API instance (or `undefined` if it was not found in the cache).
				return vscodeApiInstanceForThisKey;
			},
			enumerable: false, // Hide this global function from `for...in` loops over `globalThis` and from `Object.keys(globalThis)`.
			configurable: true, // Allow this property to be re-configured or deleted later (e.g., by the `dispose` method).
			writable: false, // Make the function itself (the property value) read-only, preventing accidental overwrite.
		});

		// Add cleanup logic for this global function to the `_instanceDisposables` store.
		// When this interceptor is disposed, the global function will be deleted from `globalThis`.
		this._instanceDisposables.add(
			toDisposable(() => {
				delete (globalThis as any)[globalApiRetrievalFunctionName];
				this._logService.trace(
					`[CocoonNodeModuleESMInterceptor] Cleaned up and removed the global API retrieval function: ${globalApiRetrievalFunctionName} from globalThis.`,
				);
			}),
		);

		// --- Setup MessageChannel for Communication with the Loader Hook Thread ---
		// A `MessageChannel` provides two `MessagePort`s that are already entangled (connected to each other)
		// and can be used for efficient, two-way communication between different threads (in this case,
		// the main application thread and the Node.js loader hook thread).
		const { port1: mainThreadMessagePort, port2: loaderHookMessagePort } =
			new MessageChannel();

		// Add cleanup logic for these ports to the `_instanceDisposables` store.
		this._instanceDisposables.add(
			toDisposable(() => {
				mainThreadMessagePort.close(); // Close our (main thread's) end of the port.
				// The `loaderHookMessagePort` is transferred to the loader thread. Closing `mainThreadMessagePort`
				// should signal a 'close' event on `loaderHookMessagePort` in the loader thread, allowing it to
				// perform its own cleanup. Explicitly calling `close()` on `loaderHookMessagePort` here
				// (if its reference were somehow kept on the main thread, which it isn't after transfer)
				// would be redundant or erroneous. The main point is that closing our end signals the other.
				loaderHookMessagePort.close(); // Attempt to close the other port as well, though it's transferred.
				this._logService.trace(
					"[CocoonNodeModuleESMInterceptor] MessageChannel ports used for communication with the loader hook thread have been closed.",
				);
			}),
		);

		// Type assertion to match the Node.js `MessagePort` type expected by `worker_threads` and similar APIs.
		// This is mainly for type consistency if stricter typing is used with `on('message', ...)` etc.
		const mainThreadNodeJsStylePort: NodeJsMessagePortFromWorkerThreads =
			mainThreadMessagePort as any;

		// Set up a 'message' event listener on `mainThreadNodeJsStylePort` (which is our end of the channel).
		// This listener is responsible for handling incoming messages from the loader hook thread.
		// These messages are requests from the hook's `resolve` function when it intercepts an
		// `import 'vscode'` (or an alias like 'land').
		mainThreadNodeJsStylePort.on(
			"message",
			async (eventDataFromLoaderThread: {
				id: number; // The unique ID of the request, generated by the loader hook.
				importingModuleUrl: string; // The URL string of the module that performed the import.
				requestedSpecifier: string; // The original module specifier string (e.g., 'vscode', 'land').
			}) => {
				// Destructure the relevant fields from the message received from the loader hook thread.
				const {
					id: requestIdFromLoader,
					importingModuleUrl: importingModuleUrlString,
					requestedSpecifier,
				} = eventDataFromLoaderThread;

				// For debugging purposes, one might log the received request.
				// this._logService.trace(
				// 	`[Cocoon Main Thread] Received resolution request (ID: ${requestIdFromLoader}) from loader hook for specifier "${requestedSpecifier}" ` +
				// 	`imported by module: ${importingModuleUrlString}`
				// );

				try {
					// Convert the `importingModuleUrlString` (which is the `parentURL` from the loader hook's
					// `resolve` context) into a VS Code `URI` object. This `URI` is then passed to the
					// `apiFactory` to provide context for generating the extension-specific `vscode` API instance.
					const parentModuleUri = URI.parse(importingModuleUrlString);

					// Use the injected `apiFactory` (from `_interceptorContextObject`) to get or create
					// the appropriate `vscode` API instance for the extension identified by `parentModuleUri`.
					// The `apiFactory` is responsible for understanding the extension context from this URI
					// and providing the correctly shimmed and scoped API object.
					// The other arguments to `apiFactory` (extension registries, config provider) are passed
					// as `undefined` here. This is because for ESM imports, the primary context is derived
					// from the importing module's URI. The `apiFactoryProvider` function (created in `index.ts`)
					// is designed to handle these `undefined` arguments by using its own pre-resolved
					// registries and config provider that were captured when the factory was created.
					const vscodeApiInstanceForExtension =
						this._interceptorContextObject.apiFactory(
							parentModuleUri,
							undefined, // `extensionInfoOverride` (IExtensionRegistries) - apiFactory uses its pre-resolved version.
							undefined, // `configProviderOverride` (ExtHostConfigProvider) - apiFactory uses its pre-resolved version.
						);

					// Validate that the API factory returned a valid `vscode` API instance.
					// It should not return `undefined` if the `parentModuleUri` correctly identifies an extension.
					if (!vscodeApiInstanceForExtension) {
						const errorMessage =
							`The API factory returned an undefined 'vscode' API instance for the importing module URI: ${parentModuleUri.toString()}. ` +
							`Cannot resolve the import of "${requestedSpecifier}". This might happen if the importing module's URI ` +
							`does not correctly map to a known extension context.`;
						this._logService.error(
							`[CocoonNodeModuleESMInterceptor] ${errorMessage}`,
						);
						// Send an error response back to the loader hook thread for this request ID.
						mainThreadMessagePort.postMessage({
							data: {
								id: requestIdFromLoader,
								error: { message: errorMessage },
							},
						});
						return; // Abort further processing for this request.
					}

					// Get a unique API key for this specific `vscodeApiInstanceForExtension`.
					// If this API instance has been requested before, retrieve its existing key from the cache.
					// Otherwise, generate a new unique key (UUID) and store the mapping in the cache.
					// This key links the live API instance on the main thread to the dynamic module script
					// that will be loaded by the extension in the loader thread (or main thread for the extension).
					let apiKeyForThisInstance =
						vscodeApiInstanceToApiKeyCache.get(
							vscodeApiInstanceForExtension,
						);
					if (!apiKeyForThisInstance) {
						apiKeyForThisInstance = generateUuid(); // Generate a new unique key.
						// Store the mapping in both directions (API instance <-> API key) for easy lookup.
						vscodeApiInstanceToApiKeyCache.set(
							vscodeApiInstanceForExtension,
							apiKeyForThisInstance,
						);
					}

					// Check if a `data:` URI for this API key has already been generated and cached.
					// This avoids regenerating the dynamic module script content and its `data:` URI
					// if the same API instance (identified by `apiKeyForThisInstance`) is needed again
					// (e.g., for another import of 'vscode' by the same extension, or by a different
					// module within that extension, or even by a different extension if API instances
					// were somehow shared, though they are typically per-extension).
					let dynamicModuleDataUriForApiKey =
						apiKeyToDynamicModuleDataUriCache.get(
							apiKeyForThisInstance,
						);
					if (!dynamicModuleDataUriForApiKey) {
						// If no `data:` URI is cached for this API key, generate the JavaScript content
						// for the dynamic 'vscode' module now.
						// The `createDynamicVscodeModuleScript` function takes the API key and the live
						// `vscode` API instance. It uses a template (into which the global API retrieval
						// function name, e.g., `_COCOON_RESOLVE_ESM_VSCODE_API_INSTANCE_`, was already injected
						// by the build tool) and populates it with this `apiKeyForThisInstance` and
						// `export` statements for all properties of `vscodeApiInstanceForExtension`.
						const dynamicModuleScriptContentString =
							createDynamicVscodeModuleScript(
								apiKeyForThisInstance,
								vscodeApiInstanceForExtension,
							);

						// Convert the generated JavaScript script content into a `data:` URI.
						dynamicModuleDataUriForApiKey =
							CocoonNodeModuleESMInterceptor._createDataUriFromScriptContent(
								dynamicModuleScriptContentString,
							);

						// Cache the generated `data:` URI against the `apiKeyForThisInstance` to avoid
						// redundant generation for subsequent requests for the same API instance.
						apiKeyToDynamicModuleDataUriCache.set(
							apiKeyForThisInstance,
							dynamicModuleDataUriForApiKey,
						);

						// For debugging purposes, one might log the creation of the new data: URI.
						// Be cautious logging the full data: URI as it can be very long.
						// this._logService.trace(
						// 	`[Cocoon Main Thread] Created new dynamic data: URI for API key ${apiKeyForThisInstance} ` +
						// 	`(for importing module ${parentModuleUri.fsPath}). Data URI Preview (first 150 chars): ${dynamicModuleDataUriForApiKey.substring(0,150)}...`
						// );
					}

					// Send the resolved `data:` URI (or an error if something went wrong above) back to the
					// loader hook thread, associated with the original `requestIdFromLoader`.
					mainThreadMessagePort.postMessage({
						data: {
							id: requestIdFromLoader,
							url: dynamicModuleDataUriForApiKey,
						},
					});
				} catch (errorProcessingRequestOnMainThread: any) {
					// Catch any unexpected errors that occur during the processing of the request on this main thread
					// (e.g., errors from `URI.parse`, the `apiFactory`, `generateUuid`, `createDynamicVscodeModuleScript`, etc.).
					const errorMessageDetail =
						`An error occurred on the main application thread while processing the ESM resolution request ` +
						`for specifier "${requestedSpecifier}" (imported by module: ${importingModuleUrlString}): ` +
						`${errorProcessingRequestOnMainThread.message}`;
					this._logService.error(
						`[CocoonNodeModuleESMInterceptor] ${errorMessageDetail}`,
						errorProcessingRequestOnMainThread, // Log the full error object for more details.
					);
					// Send an error response back to the loader hook thread.
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

		// Handle the 'close' event for the main thread's end of the MessagePort.
		// This event is emitted if the communication channel with the loader hook thread is severed
		// (e.g., if the loader hook thread exits unexpectedly or closes its end of the port).
		mainThreadNodeJsStylePort.on("close", () => {
			this._logService.info(
				"[CocoonNodeModuleESMInterceptor] The MessagePort on the main application thread has been closed. " +
					"This means communication with the ESM loader hook thread is no longer possible. The loader hook " +
					"will likely become ineffective for resolving any new 'vscode' (or aliased) imports.",
			);
			// Further cleanup or error handling might be needed here if this state is unexpected.
		});

		try {
			// Register the loader hook script with Node.js using `node:module.register()`.
			// The hook script itself is provided as a `data:` URI generated from its string content.
			// The `loaderHookMessagePort` (which is the "other" end of the `MessageChannel` we created)
			// is transferred to the loader hook thread. This allows the hook's `initialize` function
			// to receive this port and use it for communication back to this main thread.
			nodeModuleSystem.register(
				CocoonNodeModuleESMInterceptor._createDataUriFromScriptContent(
					loaderHookScriptContentString,
				), // The URL of the loader hook script (as a data: URI).
				{
					parentURL: import.meta.url, // The URL of this interceptor module itself, providing context for Node.js.
					data: { port: loaderHookMessagePort }, // Data to be passed to the hook's `initialize(data)` function.
					transferList: [loaderHookMessagePort], // Transfer ownership of `loaderHookMessagePort` to the loader thread.
				},
			);

			// Mark the interceptor hook as successfully installed.
			this._isInterceptorHookInstalled = true;
			this._logService.info(
				"[CocoonNodeModuleESMInterceptor] ESM interceptor hook has been successfully registered with Node.js. " +
					"Future ESM `import 'vscode'` (and its aliases like 'land') statements made by extensions " +
					"will now be intercepted by this mechanism.",
			);
		} catch (errorRegisteringHookWithNode: any) {
			// Catch any errors that occur during the `node:module.register()` call itself.
			// This might happen if the Node.js version doesn't support `register`, if the `data:` URI is
			// malformed, or if there are other issues with Node.js's internal module system.
			this._logService.error(
				"[CocoonNodeModuleESMInterceptor] CRITICAL FAILURE: Failed to register the ESM interceptor hook with Node.js " +
					'using `node:module.register()`. ESM `import "vscode"` (and aliased) statements will likely fail for extensions ' +
					"or will use standard Node.js resolution (which will not provide the correct Cocoon-shimmed API). Error details:",
				errorRegisteringHookWithNode, // Log the full error object.
			);
			// Attempt to clean up any partially initialized resources (like the MessageChannel or global function)
			// if the registration itself fails.
			this.dispose();
		}
	}
}
