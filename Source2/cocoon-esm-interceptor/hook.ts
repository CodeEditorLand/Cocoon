/*---------------------------------------------------------------------------------------------
 * Cocoon ESM Loader Hook 
 * --------------------------------------------------------------------------------------------
 * Implements the Node.js ECMAScript Module (ESM) loader hooks (`initialize` and `resolve`)
 * for intercepting `import` statements of 'vscode', 'land', and other potential aliases
 * that should resolve to the main 'vscode' API object provided by Cocoon.
 *
 * This script is designed to run in a separate "loader thread" managed by Node.js,
 * distinct from the main application thread where `CocoonNodeModuleESMInterceptor`
 * (the class instance that registers this hook) resides.
 *
 * Responsibilities:
 * - `initialize(data)`:
 *   - Called by Node.js upon loader registration (`node:module.register`).
 *   - Receives a `MessagePort` via the `data` argument from the main application thread.
 *     This port is crucial for bi-directional communication.
 *   - Sets up listeners on the `MessagePort` to handle responses (resolved `data:` URIs
 *     or error messages) from the main thread concerning import resolution requests.
 *
 * - `resolve(specifier, context, nextResolve)`:
 *   - Invoked by Node.js for every ESM `import` statement encountered during module loading.
 *   - Identifies if the `specifier` (e.g., 'vscode', 'land') is one of the targeted
 *     modules for interception.
 *   - If an intercepted specifier is found and contextual information (like `parentURL` -
 *     the importing module's URL) is available:
 *     - It sends a request message to the main thread via the `MessagePort`. This message
 *       includes the `importingModuleUrl` and the `requestedSpecifier`.
 *     - It then asynchronously awaits a response from the main thread. The main thread,
 *       using its `apiFactoryProvider`, is expected to generate a `data:` URI. This URI
 *       contains the JavaScript code for the dynamic 'vscode' API module, specifically
 *       tailored for the context of the importing extension.
 *     - Upon receiving the `data:` URI, this `resolve` hook returns it to Node.js,
 *       instructing Node.js to load the module from this dynamic source. It uses
 *       `shortCircuit: true` to bypass subsequent resolvers.
 *   - For any specifier not targeted for interception, or if necessary context is
 *     missing, it delegates resolution to `nextResolve`, passing control to the
 *     next loader in the chain or to Node.js's default ESM resolution logic.
 *
 * Communication with Main Thread (`CocoonNodeModuleESMInterceptor`):
 * - Achieved exclusively via the `MessagePort` established during `initialize`.
 * - `MessagePort.postMessage()`: Sends requests from this loader hook to the main thread.
 * - `MessagePort.on('message', ...)`: Receives responses (the `data:` URI or errors)
 *   from the main thread.
 * - A `Map` (`pendingResolutionPromises`) correlates outgoing requests with incoming
 *   responses using unique request IDs and manages Promise resolution/rejection.
 *
 * Timeout Mechanism:
 * - A timeout (`RESOLUTION_REQUEST_TIMEOUT_MS`) is implemented for each request sent
 *   to the main thread.
 * - If the main thread fails to respond within this duration, the corresponding promise
 *   is rejected, and the `resolve` hook falls back to `nextResolve`, preventing
 *   indefinite blocking of the loader thread.
 *
 * Deployment:
 * - This script is typically compiled to JavaScript. The resulting code string is then
 *   loaded by `CocoonNodeModuleESMInterceptor` on the main thread and registered with
 *   Node.js using a `data:` URI (e.g., `data:text/javascript,${hookCodeString}`).
 *   This method avoids the need for a separate physical file for the hook at runtime.
 *
 * Self-Containment:
 * - The script aims to be self-contained or rely only on APIs guaranteed to be available
 *   in the Node.js loader hook environment to ensure robust operation.
 *
 * Aliases Handled:
 * - 'vscode': The standard specifier for the VS Code API.
 * - 'land': An alias intended to resolve to the same 'vscode' API object.
 * - Other aliases (e.g., 'fiddee') can be configured by modifying the `shouldIntercept` check.
 *   The main thread's `apiFactoryProvider` is responsible for generating the consistent
 *   'vscode' API content regardless of the alias used.
 *--------------------------------------------------------------------------------------------*/

// --- Type Declarations for Node.js Loader Hook Context and MessagePort ---
// These declarations provide type safety and autocompletion for this script.
// They are `declare`d because the actual objects (like `MessagePort`) are provided
// by the Node.js runtime environment for loader hooks, not imported as modules here.

/**
 * Represents a `MessagePort` for inter-thread communication within Node.js.
 * This is a simplified declaration mirroring the essential parts of the `MessagePort` API
 * used in this hook script. The actual `MessagePort` object is supplied by Node.js.
 */
declare class MessagePort {
	/**
	 * Registers an event handler for the specified event type.
	 * @param event - The name of the event to listen for ('message' or 'close').
	 * @param listener - The callback function to execute when the event occurs.
	 */
	on(event: "message" | "close", listener: (value: any) => void): this;

	/**
	 * Sends a message to the other end of the port.
	 * @param value - The message to send.
	 * @param transferList - An optional array of `ArrayBuffer` or `MessagePort` objects to transfer ownership of.
	 */
	postMessage(value: any, transferList?: ReadonlyArray<any>): void;

	/**
	 * Closes the `MessagePort`, preventing further messages from being sent or received.
	 * This also signals the 'close' event on both ends of the channel.
	 */
	close(): void;

	/**
	 * Starts the message queue on this port if it was previously paused using `unref()`.
	 * This is rarely needed for `MessagePort`s used in Node.js `worker_threads` or loader hooks
	 * as they are typically active by default.
	 */
	start?(): void;
}

/**
 * Defines the structure of the data object passed to the `initialize` hook
 * when it's registered by `node:module.register`.
 * This data is sent from the main application thread.
 */
interface LoaderInitializationData {
	/** The `MessagePort` used for communication with the main Cocoon application thread. */
	port: MessagePort;
}

/**
 * Defines the structure of the context object provided by Node.js to the `resolve` hook.
 * This object contains information about the import being resolved.
 */
interface ResolveHookContext {
	/**
	 * The URL of the module that is performing the import (the "parent" module).
	 * This can be undefined, for example, for top-level imports in the REPL.
	 */
	parentURL?: string;

	/**
	 * An array of conditions that Node.js uses for conditional exports resolution
	 * (e.g., ['node', 'import', 'development']).
	 */
	conditions: string[];

	/**
	 * Import assertions associated with the import statement, if any.
	 * This is relevant for Node.js versions v16.12+/v17.0+ that support import assertions.
	 * Example: `import json from './data.json' assert { type: 'json' };`
	 */
	importAssertions?: Record<string, string>;
}

/**
 * Defines the signature of the `nextResolve` function passed to the `resolve` hook.
 * This function allows the current loader to delegate the resolution process to
 * subsequent loaders in the chain or to Node.js's default ESM resolver.
 */
type NextResolveHookFunction = (
	/** The module specifier being resolved. */
	specifier: string,
	/** The context of the import. */
	context?: ResolveHookContext,
) => Promise<{
	/** The resolved URL of the module. */
	url: string;
	/** The format of the resolved module (e.g., 'module', 'commonjs'). */
	format?: "builtin" | "commonjs" | "json" | "module" | "wasm";
	/** If true, indicates that this resolution is final and subsequent resolvers should be skipped. */
	shortCircuit?: boolean;
	/** Import assertions to be applied to the resolved module. */
	importAssertions?: Record<string, string>;
}>;

// --- Module-Scoped State for the Loader Hook ---

/**
 * The `MessagePort` instance used for two-way communication with the main
 * Cocoon application thread (specifically, with `CocoonNodeModuleESMInterceptor`).
 * This is initialized by the `initialize` hook when the loader is registered.
 * It will be `undefined` if initialization fails or the port is closed.
 */
let portToMainCocoonThread: MessagePort | undefined;

/**
 * A simple counter to generate unique IDs for each request sent to the main thread.
 * This helps in correlating responses from the main thread with the original requests.
 */
let nextRequestId = 0;

/**
 * A timeout duration (in milliseconds) for waiting for a response from the main thread.
 * If the main thread doesn't respond within this time, the request will be considered failed.
 */
const RESOLUTION_REQUEST_TIMEOUT_MS = 5000; // 5 seconds.

/**
 * A `Map` to store pending resolution promises.
 * - Key: The unique request ID (number) sent to the main thread.
 * - Value: An object containing the `resolve` and `reject` functions of the Promise
 *   created for that request in this loader thread, and the `timeoutId` for its timeout.
 * This allows the loader hook to resume the correct asynchronous operation when a
 * response (or timeout) occurs for a specific request.
 */
const pendingResolutionPromises = new Map<
	number,
	{
		resolve: (resolvedUrl: string) => void; // Function to call when resolution is successful.
		reject: (reason?: any) => void; // Function to call on error or timeout.
		timeoutId?: NodeJS.Timeout; // NodeJS.Timeout from setTimeout for this request.
	}
>();

// --- Loader Hook Implementations ---

/**
 * `initialize` hook: Called by Node.js when the loader is registered.
 * Its primary role is to establish the communication channel (MessagePort)
 * with the main application thread.
 *
 * @param dataFromRegister - The data object passed from `node:module.register`.
 *                           This is expected to be an object like `{ port: MessagePort }`,
 *                           where `port` is the `MessagePort` created by the main thread.
 */
export function initialize(
	dataFromRegister: LoaderInitializationData | undefined,
): void {
	// Validate that the MessagePort was correctly passed from the main thread.
	if (!dataFromRegister || !dataFromRegister.port) {
		console.error(
			"[Cocoon ESM Loader Hook Thread] Initialization FAILED: MessagePort to main Cocoon thread was not received in `initialize` data. " +
				"This ESM loader hook will be ineffective and cannot intercept 'vscode' imports.",
		);
		// This hook cannot function without the port. Further operations will likely fail or be NOPs.
		return;
	}

	// Store the received MessagePort for later use by the `resolve` hook.
	portToMainCocoonThread = dataFromRegister.port;

	// --- Set up message handling on the port ---
	// Listen for messages (which are responses from the main thread) on this port.
	portToMainCocoonThread.on(
		"message",
		// The event data from the main thread is expected to be an object containing
		// the response for a specific request ID.
		(eventFromMainThread: {
			data: {
				// This structure must match what CocoonNodeModuleESMInterceptor's mainThreadPort sends.
				id: number; // The ID of the original request.
				url?: string; // The resolved data: URI for 'vscode', if successful.
				error?: {
					// Error details, if resolution failed on the main thread.
					message: string;
					// Potentially other error properties like `stack` or `name`.
				};
			};
		}) => {
			const {
				id: responseId,
				url: resolvedUrl,
				error: resolutionError,
			} = eventFromMainThread.data;

			// Retrieve the promise callbacks associated with this response ID.
			const promiseCallbacks = pendingResolutionPromises.get(responseId);

			if (promiseCallbacks) {
				// Clear the timeout associated with this request, as a response has been received.
				if (promiseCallbacks.timeoutId) {
					clearTimeout(promiseCallbacks.timeoutId);
				}
				// Remove the promise entry from the map now that it's being handled.
				pendingResolutionPromises.delete(responseId);

				if (resolutionError) {
					// If the main thread reported an error, reject the promise.
					const errorMessage =
						resolutionError.message ||
						'Unknown error resolving "vscode" specifier from main Cocoon thread';
					promiseCallbacks.reject(new Error(errorMessage));
				} else if (typeof resolvedUrl === "string") {
					// If a URL was successfully resolved, fulfill the promise.
					promiseCallbacks.resolve(resolvedUrl);
				} else {
					// This case should ideally not happen if the main thread sends valid messages.
					promiseCallbacks.reject(
						new Error(
							"[Cocoon ESM Loader Hook Thread] Invalid message received from main thread: " +
								'Missing "url" for a successful resolution or "error" details for a failed one.',
						),
					);
				}
			} else {
				// This might occur if a response arrives after a timeout has already rejected the promise,
				// or if there's a bug in request ID management.
				console.warn(
					`[Cocoon ESM Loader Hook Thread] Received message from main thread for an unknown or already handled request ID: ${responseId}. ` +
						`Message data:`,
					eventFromMainThread.data,
				);
			}
		},
	);

	// Handle the scenario where the main thread closes its end of the MessagePort.
	// This could happen if the main application exits or explicitly closes the port.
	portToMainCocoonThread.on("close", () => {
		console.log(
			"[Cocoon ESM Loader Hook Thread] The MessagePort to the main Cocoon thread was closed. " +
				"This loader will no longer be able to resolve 'vscode' or aliased imports.",
		);

		// Mark the port as unusable.
		portToMainCocoonThread = undefined;

		// Reject any promises that are still pending, as communication is no longer possible.
		pendingResolutionPromises.forEach((callbacks, requestId) => {
			if (callbacks.timeoutId) {
				clearTimeout(callbacks.timeoutId); // Clear any associated timeouts.
			}
			callbacks.reject(
				new Error(
					`[Cocoon ESM Loader Hook Thread] Communication channel (MessagePort) closed while request ID ${requestId} was pending. ` +
						"Import resolution cannot complete.",
				),
			);
		});
		// Clear the map of pending promises.
		pendingResolutionPromises.clear();
	});

	// In Node.js worker_threads (which loaders are similar to), MessagePorts are typically
	// started automatically upon creation or when the first 'message' listener is added.
	// Explicitly calling `start()` is usually not necessary.
	// portToMainCocoonThread.start?.();

	console.log(
		"[Cocoon ESM Loader Hook Thread] ESM Loader Hook initialized successfully and is now listening on the MessagePort for responses from the main Cocoon thread.",
	);
}

/**
 * `resolve` hook: The core ESM resolution hook.
 * This function is invoked by Node.js for each ESM `import` statement that needs resolution.
 * It intercepts imports of 'vscode', 'land', (and potentially 'fiddee') and delegates their
 * resolution to the main Cocoon thread via the established `MessagePort`.
 *
 * @param specifier - The module specifier string from the import statement (e.g., 'vscode', './my-module.js').
 * @param context - Contextual information about the import, crucially including `parentURL` (the URL of the importing module).
 * @param nextResolve - The next `resolve` function in the loader chain. This is called to delegate resolution
 *                      for specifiers not handled by this hook, or as a fallback on error.
 * @returns A Promise that resolves to an object describing how Node.js should handle the import.
 *          For intercepted 'vscode'/'land' imports, this will typically be an object like:
 *          `{ url: <dataUriForDynamicVSCodeModule>, shortCircuit: true, format: 'module' }`.
 */
export async function resolve(
	specifier: string, // The string being imported.
	context: ResolveHookContext, // Context of the import.
	nextResolve: NextResolveHookFunction, // Function to call the next resolver in the chain.
): Promise<{
	url: string; // The resolved URL for the module.
	format?: "builtin" | "commonjs" | "json" | "module" | "wasm"; // The format of the module.
	shortCircuit?: boolean; // If true, skips subsequent resolvers.
	importAssertions?: Record<string, string>; // Import assertions.
}> {
	// Check if the specifier is one of the targets for interception ('vscode' or 'land').
	// Also, ensure `context.parentURL` is available, as it's needed to provide context to the API factory.
	// And, verify that the `portToMainCocoonThread` is still operational.
	// Note: The alias 'fiddee' was considered but is currently commented out in the latest integrations.
	// It can be added back to `shouldIntercept` if needed.
	const shouldIntercept =
		specifier === "vscode" ||
		specifier === "land"; /* || specifier === 'fiddee' */

	if (!shouldIntercept || !context.parentURL) {
		// If not intercepting this specifier, or if parentURL is missing (e.g., top-level import in REPL without a file context),
		// delegate to the next loader in the chain.
		return nextResolve(specifier, context);
	}

	// If the communication port to the main thread is not available (e.g., initialization failed or port was closed),
	// this loader cannot perform its interception. Delegate and log an error.
	if (!portToMainCocoonThread) {
		console.error(
			`[Cocoon ESM Loader Hook Thread] Cannot resolve "${specifier}": MessagePort to main Cocoon thread is not available. ` +
				"Delegating to the next resolver in the chain.",
		);
		return nextResolve(specifier, context);
	}

	// --- Intercept and request resolution from the main thread ---
	const importingModuleUrl = context.parentURL; // URL of the module performing the import.
	const requestId = nextRequestId++; // Generate a unique ID for this request.

	// For debugging purposes:
	// console.debug(
	// 	`[Cocoon ESM Loader Hook Thread] Intercepting "${specifier}" import from module: ${importingModuleUrl}. Request ID: ${requestId}`
	// );

	// Create a new Promise that will be resolved when the main thread sends back the data URI,
	// or rejected on error or timeout.
	const resolutionPromise = new Promise<string>(
		(resolveCallback, rejectCallback) => {
			// Set up a timeout for this request.
			const timeoutId = setTimeout(() => {
				// If the timeout fires, remove the pending promise and reject it.
				if (pendingResolutionPromises.has(requestId)) {
					pendingResolutionPromises.delete(requestId); // Ensure cleanup from map.
					rejectCallback(
						new Error(
							`[Cocoon ESM Loader Hook Thread] Timeout (${RESOLUTION_REQUEST_TIMEOUT_MS}ms) waiting for main Cocoon thread to resolve "${specifier}" ` +
								`for module ${importingModuleUrl} (Request ID: ${requestId}).`,
						),
					);
				}
			}, RESOLUTION_REQUEST_TIMEOUT_MS);

			// Store the promise's callbacks and the timeout ID in the map.
			pendingResolutionPromises.set(requestId, {
				resolve: resolveCallback,
				reject: rejectCallback,
				timeoutId: timeoutId,
			});
		},
	);

	// Send a message to the main Cocoon thread requesting the 'vscode' API data URI.
	// Include the original specifier so the main thread knows what was requested.
	// The main thread's `CocoonNodeModuleESMInterceptor` will use its `apiFactoryProvider`
	// to generate the `vscode` API, which should be consistent regardless of whether
	// 'vscode' or 'land' (or other aliases) was the specifier that triggered this interception.
	portToMainCocoonThread.postMessage({
		id: requestId,
		importingModuleUrl: importingModuleUrl, // URL of the module performing the import.
		requestedSpecifier: specifier, // The original specifier ('vscode', 'land', etc.).
	});

	try {
		// Asynchronously wait for the main thread to respond with the dynamic module URL (a data: URI).
		// This `await` will pause execution here until the promise resolves (with URL) or rejects (error/timeout).
		const dynamicApiModuleUrl = await resolutionPromise;

		// For debugging purposes:
		// console.debug(
		// 	`[Cocoon ESM Loader Hook Thread] Successfully resolved "${specifier}" for module ${importingModuleUrl} (Request ID ${requestId}) to dynamic URL: ` +
		// 	`${dynamicApiModuleUrl.substring(0, 100)}...` // Log only a prefix of the (potentially long) data URI.
		// );

		// Instruct Node.js to load the module from the dynamically generated data: URI.
		return {
			url: dynamicApiModuleUrl,
			shortCircuit: true, // Tells Node.js to use this resolution and skip any other loaders/default resolution.
			format: "module", // Ensures Node.js treats the content of the data: URI as an ES module.
		};
	} catch (resolutionError: any) {
		// This block is reached if `resolutionPromise` is rejected (e.g., by timeout or an error message from main thread).
		const errorMessage =
			resolutionError?.message || String(resolutionError);
		console.error(
			`[Cocoon ESM Loader Hook Thread] Error resolving "${specifier}" for module ${importingModuleUrl} (Request ID ${requestId}): ${errorMessage}. ` +
				"Delegating to the next resolver in the chain for the original specifier.",
		);

		// Ensure the promise is cleaned up from the map if it's still there.
		// This handles cases where `rejectCallback` might have been called directly by the message handler
		// without the timeout necessarily clearing the entry (though the timeoutId clear within the message
		// handler should also address this). This is an extra safety net.
		if (pendingResolutionPromises.has(requestId)) {
			const promiseEntry = pendingResolutionPromises.get(requestId);
			if (promiseEntry?.timeoutId) {
				clearTimeout(promiseEntry.timeoutId); // Clear timeout if it hasn't fired.
			}
			pendingResolutionPromises.delete(requestId);
		}

		// Fallback: Delegate to the next loader in the chain using the ORIGINAL specifier.
		// This gives other loaders or Node's default resolver a chance to handle it if Cocoon's interception fails.
		return nextResolve(specifier, context);
	}
}

// This console log executes when this loader hook script itself is parsed by Node.js
// for the first time (e.g., when Node.js loads it from the `data:` URI provided
// during `node:module.register`). It confirms that the script has reached the loader thread
// and is ready for its `initialize` and `resolve` hook functions to be called by Node.js.
console.log(
	"[Cocoon ESM Loader Hook Thread] Loader hook script has been parsed by Node.js and is ready for `initialize` and `resolve` calls.",
);
