// File: src/cocoon-esm-interceptor/hook.ts
// Purpose: Implements the Node.js ESM loader hook for intercepting 'vscode' imports.
//
// Description:
// This script defines the `initialize` and `resolve` functions required by the
// Node.js module customization hooks API (loaders). It runs in a separate
// "loader thread" managed by Node.js, distinct from the main application thread
// where the `CocoonNodeModuleESMInterceptor` class instance lives.
//
// - `initialize(data)`: This function is called by Node.js when the loader is
//   registered via `node:module.register`. It receives a `MessagePort` (passed in `data`)
//   from the main thread, which it uses to communicate 'vscode' import requests
//   and receive back the resolved `data:` URI for the dynamic 'vscode' module.
//
// - `resolve(specifier, context, nextResolve)`: This hook is invoked by Node.js
//   for each ESM `import` statement. If the `specifier` is 'vscode', it posts a
//   message to the main thread (via the `MessagePort`) containing the `parentURL`
//   (the module performing the import). It then waits for a response from the
//   main thread with the `data:` URI that resolves the 'vscode' import. For any
//   other specifier, it delegates to the next loader in the chain.
//
// Communication:
// Communication with the main thread (CocoonNodeModuleESMInterceptor) is achieved
// using `MessagePort.postMessage()` and `MessagePort.on('message', ...)`.
//
// IMPORTANT:
// This script must be self-contained or rely only on APIs guaranteed to be
// available in the Node.js loader hook environment. Avoid complex dependencies.
// The compiled JavaScript content of this file is typically loaded as a string
// by `CocoonNodeModuleESMInterceptor` and registered with Node.js via a `data:` URI.
//
//--------------------------------------------------------------------------------------------*/

// Type declarations for Node.js loader hook context and MessagePort.
// These help with type checking within this module without requiring explicit
// imports that might complicate its usage as a raw script.

/**
 * Represents a MessagePort for inter-thread communication.
 * This is a simplified declaration for type-checking purposes within this hook script.
 * The actual MessagePort object is provided by Node.js.
 */
declare class MessagePort {
	/** Registers an event handler. */
	on(event: "message" | "close", listener: (value: any) => void): this;

	/** Sends a message to the other end of the port. */
	postMessage(value: any, transferList?: ReadonlyArray<any>): void;

	/** Closes the port, preventing further messages from being sent or received. */
	close(): void;

	/** Starts the message queue if it was previously paused (rarely needed for Node.js worker_threads ports). */
	start?(): void;
}

/**
 * Data passed to the `initialize` hook from `node:module.register`.
 * Expected to contain the `MessagePort` for communication with the main thread.
 */
interface LoaderInitializationData {
	port: MessagePort;
}

/**
 * Context object provided to the `resolve` hook by Node.js.
 */
interface ResolveHookContext {
	/** The URL of the module that is doing the import. */
	parentURL?: string;

	/** An array of conditions for conditional exports, e.g., ['node', 'import']. */
	conditions: string[];

	/** Import assertions, if any (for Node.js v16.12+/17.0+). */
	importAssertions?: Record<string, string>;
}

/**
 * Represents the `nextResolve` function passed to the `resolve` hook, * allowing delegation to subsequent loaders in the chain.
 */
type NextResolveHookFunction = (
	specifier: string,

	context?: ResolveHookContext,
) => Promise<{
	url: string;

	format?: "builtin" | "commonjs" | "json" | "module" | "wasm";

	// If true, subsequent resolvers are skipped.
	shortCircuit?: boolean;

	importAssertions?: Record<string, string>;
}>;

// --- Module state for the loader hook ---

/**
 * The MessagePort used to communicate with the main Cocoon application thread.
 * This is initialized by the `initialize` hook.
 */
let portToMainCocoonThread: MessagePort | undefined;

/** A counter to generate unique IDs for requests sent to the main thread. */
let currentRequestId = 0;

/**
 * Maps request IDs to their corresponding Promise `resolve` and `reject` functions.
 * This is used to correlate responses from the main thread with pending requests.
 */
const pendingResolutionPromises = new Map<
	number,
	{ resolve: (url: string) => void; reject: (reason?: any) => void }
>();

// --- Loader Hook Implementations ---

/**
 * Initializes the loader hook.
 * This function is called by Node.js when the loader is registered.
 * It sets up the `MessagePort` for communication with the main Cocoon thread.
 *
 * @param dataFromRegister - The data object passed from `node:module.register`.
 *                           Expected to be `{ port: MessagePort }`.
 */
export function initialize(
	dataFromRegister: LoaderInitializationData | undefined,
): void {
	if (!dataFromRegister || !dataFromRegister.port) {
		console.error(
			"[Cocoon ESM Loader Hook Thread] Initialization FAILED: MessagePort to main Cocoon thread was not received in `initialize` data. This loader will be ineffective.",
		);

		// This hook cannot function without the port.
		return;
	}

	portToMainCocoonThread = dataFromRegister.port;

	// Listen for messages (resolved 'vscode' data URIs or errors) from the main thread.
	portToMainCocoonThread.on(
		"message",

		(eventFromMainThread: {
			// Structure of messages from CocoonNodeModuleESMInterceptor's mainThreadPort
			data: { id: number; url?: string; error?: { message: string } };
		}) => {
			const { id, url, error } = eventFromMainThread.data;

			const promiseCallbacks = pendingResolutionPromises.get(id);

			if (promiseCallbacks) {
				// Clean up the promise entry
				pendingResolutionPromises.delete(id);

				if (error) {
					const errorMessage =
						error.message ||
						'Unknown error resolving "vscode" from main Cocoon thread';

					promiseCallbacks.reject(new Error(errorMessage));
				} else if (typeof url === "string") {
					promiseCallbacks.resolve(url);
				} else {
					// Should not happen if the main thread sends valid messages
					promiseCallbacks.reject(
						new Error(
							'[Cocoon ESM Loader Hook Thread] Invalid message from main thread: missing "url" for success or "error" for failure.',
						),
					);
				}
			} else {
				// This might happen if a response arrives after a timeout (if implemented) or due to other issues.
				console.warn(
					`[Cocoon ESM Loader Hook Thread] Received message from main thread for unknown or already handled request ID: ${id}. Message data:`,

					eventFromMainThread.data,
				);
			}
		},
	);

	// Handle the case where the main thread closes its end of the port.
	portToMainCocoonThread.on("close", () => {
		console.log(
			"[Cocoon ESM Loader Hook Thread] MessagePort to main Cocoon thread was closed. This loader will no longer be able to resolve 'vscode' imports.",
		);

		// Mark the port as unusable
		portToMainCocoonThread = undefined;

		// Reject any pending promises as communication is no longer possible.
		pendingResolutionPromises.forEach((callbacks, requestId) => {
			callbacks.reject(
				new Error(
					`[Cocoon ESM Loader Hook Thread] Communication channel closed while request ID ${requestId} was pending.`,
				),
			);
		});

		pendingResolutionPromises.clear();
	});

	// In Node.js worker_threads, MessagePorts are typically started automatically.
	// portToMainCocoonThread.start?.();

	console.log(
		"[Cocoon ESM Loader Hook Thread] Initialized successfully and listening on MessagePort.",
	);
}

/**
 * The ESM `resolve` hook.
 * This function is called by Node.js for each ESM `import` statement encountered.
 * It intercepts imports of 'vscode' and requests their resolution from the main Cocoon thread.
 *
 * @param specifier - The module specifier (e.g., 'vscode', './utils.js', 'lodash').
 * @param context - Contextual information about the import, including `parentURL`.
 * @param nextResolve - The next `resolve` function in the loader chain, for delegation.
 * @returns A Promise that resolves to an object indicating how the import should be handled.
 *          For 'vscode', this will be `{ url: <dataUri>, shortCircuit: true, format: 'module' }`.
 */
export async function resolve(
	specifier: string,

	context: ResolveHookContext,

	nextResolve: NextResolveHookFunction,
): Promise<{
	url: string;

	format?: "builtin" | "commonjs" | "json" | "module" | "wasm";

	shortCircuit?: boolean;

	importAssertions?: Record<string, string>;
}> {
	// If not importing 'vscode' or if there's no parent URL (e.g., top-level import in REPL),

	// delegate to the next loader in the chain.
	if (specifier !== "vscode" || !context.parentURL) {
		return nextResolve(specifier, context);
	}

	// If the communication port to the main thread is not available (e.g., initialization failed or port closed),

	// we cannot intercept. Delegate and log an error.
	if (!portToMainCocoonThread) {
		console.error(
			'[Cocoon ESM Loader Hook Thread] Cannot resolve "vscode": MessagePort to main Cocoon thread is not available. Delegating to nextResolve.',
		);

		return nextResolve(specifier, context);
	}

	const requestId = currentRequestId++;

	// For debugging:
	// console.debug(`[Cocoon ESM Loader Hook Thread] Intercepting "vscode" import from ${context.parentURL}. Request ID: ${requestId}`);

	// Create a new Promise that will be resolved when the main thread sends back the data URI.
	const resolutionPromise = new Promise<string>(
		(resolvePromise, rejectPromise) => {
			pendingResolutionPromises.set(requestId, {
				resolve: resolvePromise,

				reject: rejectPromise,
			});
		},
	);

	// Send a message to the main Cocoon thread requesting the 'vscode' API data URI.
	portToMainCocoonThread.postMessage({
		id: requestId,

		// URL of the module performing the import
		importingModuleUrl: context.parentURL,
	});

	try {
		// Wait for the main thread to respond with the dynamic module URL (a data: URI).
		const dynamicApiModuleUrl = await resolutionPromise;

		// For debugging:
		// console.debug(`[Cocoon ESM Loader Hook Thread] Resolved "vscode" for ${context.parentURL} (Req ID ${requestId}) to: ${dynamicApiModuleUrl.substring(0, 100)}...`);

		// Instruct Node.js to load the module from the provided data: URI.
		return {
			url: dynamicApiModuleUrl,

			// Tells Node.js to use this resolution and skip other loaders.
			shortCircuit: true,

			// Ensures Node.js treats the content as an ES module.
			format: "module",
		};
	} catch (error: any) {
		const errorMessage = error?.message || String(error);

		console.error(
			`[Cocoon ESM Loader Hook Thread] Error resolving "vscode" for ${context.parentURL} (Req ID ${requestId}): ${errorMessage}. Delegating to nextResolve.`,
		);

		// Clean up the promise if it's still in the map (e.g., if reject was called directly)
		if (pendingResolutionPromises.has(requestId)) {
			pendingResolutionPromises.delete(requestId);
		}

		// Fallback to the next loader in the chain on error.
		return nextResolve(specifier, context);
	}
}

// This log indicates that the loader script itself has been parsed by Node.js
// when it's first loaded (e.g., from the data: URI provided to module.register).
console.log(
	"[Cocoon ESM Loader Hook Thread] Loader hook script has been parsed by Node.js.",
);
