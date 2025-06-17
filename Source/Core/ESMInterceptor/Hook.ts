/*
 * File: Cocoon/Source/Core/ESMInterceptor/Hook.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:43 UTC
 * Export: initialize
 */

/**
 * @module Hook (ESMInterceptor)
 * @description Implements the Node.js ESM loader hooks (`initialize` and `resolve`).
 * This script runs in a separate "loader thread" and communicates with the main
 * application thread via a `MessagePort` to resolve `vscode` module imports.
 * It is not part of the main application bundle but is loaded by Node.js directly.
 */

// These types are declared as they are provided by the Node.js runtime environment for loader hooks.
declare class MessagePort {
	on(Event: "message" | "close", Listener: (Value: any) => void): this;
	postMessage(Value: any, TransferList?: ReadonlyArray<any>): void;
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
	Specifier: string,
	Context?: ResolveHookContext,
) => Promise<{ url: string; format?: string; shortCircuit?: boolean }>;

// --- Module State ---
let MainThreadPort: MessagePort | undefined;
let NextRequestID = 0;
const PendingPromises = new Map<
	number,
	{
		Resolve: (URL: string) => void;
		Reject: (Reason?: any) => void;
		TimeoutID?: any;
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
	const ShouldIntercept = Specifier === "vscode";
	if (!ShouldIntercept || !Context.parentURL || !MainThreadPort) {
		return NextResolve(Specifier, Context);
	}

	const RequestID = NextRequestID++;
	try {
		const ResolutionPromise = new Promise<string>((Resolve, Reject) => {
			const TimeoutID = setTimeout(() => {
				PendingPromises.delete(RequestID);
				Reject(
					new globalThis.Error(
						`Timeout resolving module import: "${Specifier}"`,
					),
				);
			}, 5000); // 5-second timeout for resolution
			PendingPromises.set(RequestID, { Resolve, Reject, TimeoutID });
		});

		MainThreadPort.postMessage({
			ID: RequestID,
			ImportingModuleURL: Context.parentURL,
			RequestedSpecifier: Specifier,
		});

		const DynamicModuleURL = await ResolutionPromise;
		return { url: DynamicModuleURL, shortCircuit: true, format: "module" };
	} catch (Error) {
		console.error(
			`[Cocoon ESM Loader Hook] Error resolving "${Specifier}": ${(Error as Error).message}`,
		);
		const PromiseCallbacks = PendingPromises.get(RequestID);
		if (PromiseCallbacks) {
			clearTimeout(PromiseCallbacks.TimeoutID);
			PendingPromises.delete(RequestID);
		}
		return NextResolve(Specifier, Context);
	}
}

// --- Helper Functions ---

function HandleResponseMessage(Response: {
	id: number;
	url?: string;
	error?: { message: string };
}) {
	const { id: ID, url: URL, error: ErrorResponse } = Response;
	const PromiseCallbacks = PendingPromises.get(ID);
	if (!PromiseCallbacks) return;

	clearTimeout(PromiseCallbacks.TimeoutID);
	PendingPromises.delete(ID);

	if (ErrorResponse) {
		PromiseCallbacks.Reject(
			new globalThis.Error(
				ErrorResponse.message ||
					"Unknown resolution error from main thread",
			),
		);
	} else if (typeof URL === "string") {
		PromiseCallbacks.Resolve(URL);
	} else {
		PromiseCallbacks.Reject(
			new globalThis.Error(
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
			new globalThis.Error(
				`Communication channel closed while request ID ${ID} was pending.`,
			),
		);
	});
	PendingPromises.clear();
}
