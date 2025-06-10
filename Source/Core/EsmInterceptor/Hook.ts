/**
 * @module Hook (EsmInterceptor)
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
let NextRequestId = 0;
const PendingPromises = new Map<
	number,
	{
		Resolve: (url: string) => void;
		Reject: (reason?: any) => void;
		TimeoutId?: NodeJS.Timeout;
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

	const RequestId = NextRequestId++;
	try {
		const ResolutionPromise = new Promise<string>((resolve, reject) => {
			const TimeoutId = setTimeout(() => {
				PendingPromises.delete(RequestId);
				reject(
					new Error(
						`Timeout resolving module import: "${Specifier}"`,
					),
				);
			}, 5000); // 5-second timeout for resolution
			PendingPromises.set(RequestId, {
				Resolve: resolve,
				Reject: reject,
				TimeoutId,
			});
		});

		MainThreadPort.postMessage({
			Id: RequestId,
			ImportingModuleUrl: Context.parentURL,
			RequestedSpecifier: Specifier,
		});

		const DynamicModuleUrl = await ResolutionPromise;
		// `shortCircuit: true` tells Node.js to use our returned URL and stop its own resolution process.
		return { url: DynamicModuleUrl, shortCircuit: true, format: "module" };
	} catch (error) {
		console.error(
			`[Cocoon ESM Loader Hook] Error resolving "${Specifier}": ${(error as Error).message}`,
		);
		// Ensure cleanup even on error
		const promiseCallbacks = PendingPromises.get(RequestId);
		if (promiseCallbacks) {
			clearTimeout(promiseCallbacks.TimeoutId);
			PendingPromises.delete(RequestId);
		}
		// Fallback to default resolution on failure.
		return NextResolve(Specifier, Context);
	}
}

// --- Helper Functions ---

function HandleResponseMessage(Event: {
	data: { id: number; url?: string; error?: { message: string } };
}) {
	const { id: Id, url: Url, error: Error } = Event.data;
	const PromiseCallbacks = PendingPromises.get(Id);
	if (!PromiseCallbacks) return;

	clearTimeout(PromiseCallbacks.TimeoutId);
	PendingPromises.delete(Id);

	if (Error) {
		PromiseCallbacks.Reject(
			new Error(
				Error.message || "Unknown resolution error from main thread",
			),
		);
	} else if (typeof Url === "string") {
		PromiseCallbacks.Resolve(Url);
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
	PendingPromises.forEach((Callbacks, Id) => {
		clearTimeout(Callbacks.TimeoutId);
		Callbacks.Reject(
			new Error(
				`Communication channel closed while request ID ${Id} was pending.`,
			),
		);
	});
	PendingPromises.clear();
}
