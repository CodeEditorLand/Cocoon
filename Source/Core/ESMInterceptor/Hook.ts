/**
 * @module Hook (ESMInterceptor)
 * @description Implements the Node.js ESM loader hooks (`initialize` and `resolve`).
 * This script runs in a separate "loader thread" and communicates with the main
 * application thread via a `MessagePort` to resolve `vscode` module imports.
 * It is not part of the main application bundle but is loaded by Node.js directly.
 */

// These types are declared as they are provided by the Node.js runtime environment for loader hooks.
declare class MessagePort {
	on(event: "message" | "close", listener: (value: any) => void): this;
	postMessage(value: any, transferList?: ReadonlyArray<any>): void;
	close(): void;
}

interface LoaderInitializationData {
	port: MessagePort;
}

interface ResolveHookContext {
	parentURL?: string;
	conditions: string[];
}

type NextResolveHook = (
	specifier: string,
	context?: ResolveHookContext,
) => Promise<{ url: string; format?: string; shortCircuit?: boolean }>;

// --- Module State ---
let MainThreadPort: MessagePort | undefined;
let NextRequestID = 0;
const PendingPromises = new Map<
	number,
	{
		Resolve: (url: string) => void;
		Reject: (reason?: any) => void;
		TimeoutID?: NodeJS.Timeout;
	}
>();

// --- Hook Implementations ---

/**
 * Initializes the loader hook by establishing communication with the main thread.
 * This function is called by the Node.js runtime when the hook is registered.
 */
export function initialize(Data: LoaderInitializationData | undefined): void {
	if (!Data?.port) {
		console.error(
			"[Cocoon ESM Loader Hook] Initialization failed: MessagePort not received.",
		);
		return;
	}
	MainThreadPort = Data.port;
	MainThreadPort.on("message", HandleResponseMessage);
	MainThreadPort.on("close", HandlePortClose);
}

/**
 * The core resolution hook. It intercepts `vscode` imports and delegates
 * the resolution to the main application thread, awaiting a `data:` URI in response.
 */
export async function resolve(
	Specifier: string,
	Context: ResolveHookContext,
	NextResolve: NextResolveHook,
) {
	const shouldIntercept = Specifier === "vscode" || Specifier === "land";
	if (!shouldIntercept || !Context.parentURL || !MainThreadPort) {
		return NextResolve(Specifier, Context);
	}

	const RequestID = NextRequestID++;
	try {
		const ResolutionPromise = new Promise<string>((resolve, reject) => {
			const TimeoutID = setTimeout(() => {
				PendingPromises.delete(RequestID);
				reject(
					new Error(
						`Timeout resolving module import: "${Specifier}"`,
					),
				);
			}, 5000); // 5-second timeout for resolution
			PendingPromises.set(RequestID, {
				Resolve: resolve,
				Reject: reject,
				TimeoutID,
			});
		});

		MainThreadPort.postMessage({
			ID: RequestID,
			ImportingModuleURL: Context.parentURL,
			RequestedSpecifier: Specifier,
		});

		const DynamicModuleURL = await ResolutionPromise;
		// `shortCircuit: true` tells Node.js to use our returned URL and stop its own resolution process.
		return { url: DynamicModuleURL, shortCircuit: true, format: "module" };
	} catch (error) {
		console.error(
			`[Cocoon ESM Loader Hook] Error resolving "${Specifier}": ${(error as Error).message}`,
		);
		// Ensure cleanup even on error
		const promiseCallbacks = PendingPromises.get(RequestID);
		if (promiseCallbacks) {
			clearTimeout(promiseCallbacks.TimeoutID);
			PendingPromises.delete(RequestID);
		}
		// Fallback to default resolution on failure.
		return NextResolve(Specifier, Context);
	}
}

// --- Helper Functions ---

function HandleResponseMessage(Response: {
	id: number;
	url?: string;
	error?: { message: string };
}) {
	const { id: ID, url: URL, error: Error } = Response;
	const PromiseCallbacks = PendingPromises.get(ID);
	if (!PromiseCallbacks) return;

	clearTimeout(PromiseCallbacks.TimeoutID);
	PendingPromises.delete(ID);

	if (Error) {
		PromiseCallbacks.Reject(
			new Error(
				Error.message || "Unknown resolution error from main thread",
			),
		);
	} else if (typeof URL === "string") {
		PromiseCallbacks.Resolve(URL);
	} else {
		PromiseCallbacks.Reject(
			new Error(
				"Invalid response from main thread: missing 'url' or 'error' field.",
			),
		);
	}
}

function HandlePortClose() {
	console.log(
		"[Cocoon ESM Loader Hook] Communication port to main thread closed.",
	);
	MainThreadPort = undefined;
	PendingPromises.forEach((Callbacks, ID) => {
		clearTimeout(Callbacks.TimeoutID);
		Callbacks.Reject(
			new Error(
				`Communication channel closed while request ID ${ID} was pending.`,
			),
		);
	});
	PendingPromises.clear();
}
