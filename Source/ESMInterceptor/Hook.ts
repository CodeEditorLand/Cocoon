/*
 * File: Cocoon/Source/ESMInterceptor/Hook.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-07 05:37:44 UTC
 * Export: initialize
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon ESM Loader Hook
 * --------------------------------------------------------------------------------------------
 * Implements the Node.js ECMAScript Module (ESM) loader hooks (`initialize` and `resolve`)
 * for intercepting `import` statements of 'vscode', 'land', and other aliases that
 * should resolve to the main 'vscode' API object provided by Cocoon.
 *
 * This script runs in a separate "loader thread" managed by Node.js, distinct from the
 * main application thread.
 *
 * Responsibilities:
 * - `initialize(data)`: Establishes a `MessagePort` for bi-directional communication
 *   with the main thread, which is essential for making resolution requests.
 * - `resolve(specifier, context, nextResolve)`:
 *   - Intercepts `import` statements for 'vscode' or its aliases.
 *   - Sends a request message to the main thread via the `MessagePort`, including
 *     context about the importing module.
 *   - Asynchronously awaits a response, which is expected to be a `data:` URI
 *     containing the dynamically generated 'vscode' API module.
 *   - Returns the `data:` URI to Node.js to complete the resolution.
 *   - Delegates all other imports to the next loader in the chain.
 *
 * Communication with Main Thread:
 * - Achieved exclusively via the `MessagePort` established during `initialize`.
 * - A `Map` (`pendingResolutionPromises`) correlates outgoing requests with incoming
 *   responses using unique request IDs.
 *
 * Timeout Mechanism:
 * - A timeout is implemented for each request. If the main thread fails to respond,
 *   the request is rejected, and resolution falls back to the next loader.
 *
 * Self-Containment:
 * - The script is self-contained and relies only on APIs guaranteed to be available
 *   in the Node.js loader hook environment.
 *--------------------------------------------------------------------------------------------*/

// --- Type Declarations for Node.js Loader Hook Context and MessagePort ---
// These are `declare`d because the actual objects are provided by the Node.js runtime.

declare class MessagePort {
	on(event: "message" | "close", listener: (value: any) => void): this;
	postMessage(value: any, transferList?: ReadonlyArray<any>): void;
	close(): void;
	start?(): void;
}

interface LoaderInitializationData {
	port: MessagePort;
}

interface ResolveHookContext {
	parentURL?: string;
	conditions: string[];
	importAssertions?: Record<string, string>;
}

type NextResolveHookFunction = (
	specifier: string,
	context?: ResolveHookContext,
) => Promise<{
	url: string;
	format?: "builtin" | "commonjs" | "json" | "module" | "wasm";
	shortCircuit?: boolean;
	importAssertions?: Record<string, string>;
}>;

// --- Module-Scoped State for the Loader Hook ---

let portToMainCocoonThread: MessagePort | undefined;
let nextRequestId = 0;
const RESOLUTION_REQUEST_TIMEOUT_MS = 5000;

const pendingResolutionPromises = new Map<
	number,
	{
		resolve: (resolvedUrl: string) => void;
		reject: (reason?: any) => void;
		timeoutId?: NodeJS.Timeout;
	}
>();

// --- Loader Hook Implementations ---

/**
 * `initialize` hook: Called by Node.js when the loader is registered.
 * Its primary role is to establish the communication channel (MessagePort)
 * with the main application thread.
 */
export function initialize(
	dataFromRegister: LoaderInitializationData | undefined,
): void {
	if (!dataFromRegister || !dataFromRegister.port) {
		console.error(
			"[Cocoon ESM Loader Hook] Initialization FAILED: MessagePort to main thread was not received. This loader will be ineffective.",
		);
		return;
	}

	portToMainCocoonThread = dataFromRegister.port;

	portToMainCocoonThread.on(
		"message",
		(eventFromMainThread: {
			data: { id: number; url?: string; error?: { message: string } };
		}) => {
			const {
				id: responseId,
				url: resolvedUrl,
				error: resolutionError,
			} = eventFromMainThread.data;
			const promiseCallbacks = pendingResolutionPromises.get(responseId);

			if (promiseCallbacks) {
				if (promiseCallbacks.timeoutId) {
					clearTimeout(promiseCallbacks.timeoutId);
				}
				pendingResolutionPromises.delete(responseId);

				if (resolutionError) {
					promiseCallbacks.reject(
						new Error(
							resolutionError.message ||
								'Unknown error resolving "vscode" from main thread',
						),
					);
				} else if (typeof resolvedUrl === "string") {
					promiseCallbacks.resolve(resolvedUrl);
				} else {
					promiseCallbacks.reject(
						new Error(
							"[Cocoon ESM Loader Hook] Invalid message from main thread: Missing 'url' or 'error'.",
						),
					);
				}
			} else {
				console.warn(
					`[Cocoon ESM Loader Hook] Received message for unknown or already handled request ID: ${responseId}.`,
				);
			}
		},
	);

	portToMainCocoonThread.on("close", () => {
		console.log(
			"[Cocoon ESM Loader Hook] MessagePort to main thread was closed. This loader can no longer resolve 'vscode' imports.",
		);
		portToMainCocoonThread = undefined;
		pendingResolutionPromises.forEach((callbacks, requestId) => {
			if (callbacks.timeoutId) {
				clearTimeout(callbacks.timeoutId);
			}
			callbacks.reject(
				new Error(
					`[Cocoon ESM Loader Hook] Communication channel closed while request ID ${requestId} was pending.`,
				),
			);
		});
		pendingResolutionPromises.clear();
	});

	console.log(
		"[Cocoon ESM Loader Hook] Initialized successfully and listening for responses from main thread.",
	);
}

/**
 * `resolve` hook: The core ESM resolution hook.
 * It intercepts imports of 'vscode' or its aliases and delegates resolution to the main thread.
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
	const shouldIntercept = specifier === "vscode" || specifier === "land";

	if (!shouldIntercept || !context.parentURL) {
		return nextResolve(specifier, context);
	}

	if (!portToMainCocoonThread) {
		console.error(
			`[Cocoon ESM Loader Hook] Cannot resolve "${specifier}": MessagePort not available. Delegating to next resolver.`,
		);
		return nextResolve(specifier, context);
	}

	const importingModuleUrl = context.parentURL;
	const requestId = nextRequestId++;

	const resolutionPromise = new Promise<string>(
		(resolveCallback, rejectCallback) => {
			const timeoutId = setTimeout(() => {
				if (pendingResolutionPromises.has(requestId)) {
					pendingResolutionPromises.delete(requestId);
					rejectCallback(
						new Error(
							`[Cocoon ESM Loader Hook] Timeout (${RESOLUTION_REQUEST_TIMEOUT_MS}ms) waiting for main thread to resolve "${specifier}".`,
						),
					);
				}
			}, RESOLUTION_REQUEST_TIMEOUT_MS);

			pendingResolutionPromises.set(requestId, {
				resolve: resolveCallback,
				reject: rejectCallback,
				timeoutId: timeoutId,
			});
		},
	);

	portToMainCocoonThread.postMessage({
		id: requestId,
		importingModuleUrl: importingModuleUrl,
		requestedSpecifier: specifier,
	});

	try {
		const dynamicApiModuleUrl = await resolutionPromise;
		return {
			url: dynamicApiModuleUrl,
			shortCircuit: true,
			format: "module",
		};
	} catch (resolutionError: any) {
		console.error(
			`[Cocoon ESM Loader Hook] Error resolving "${specifier}": ${resolutionError.message}. Delegating to next resolver.`,
		);

		if (pendingResolutionPromises.has(requestId)) {
			const promiseEntry = pendingResolutionPromises.get(requestId);
			if (promiseEntry?.timeoutId) {
				clearTimeout(promiseEntry.timeoutId);
			}
			pendingResolutionPromises.delete(requestId);
		}

		return nextResolve(specifier, context);
	}
}

console.log("[Cocoon ESM Loader Hook] Loader hook script parsed and ready.");
