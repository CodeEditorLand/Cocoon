/*---------------------------------------------------------------------------------------------
 * Cocoon Base Shim (_baseShim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a base class for Cocoon shims, offering common functionality for logging,
 *
 *
 * RPC/IPC communication, argument marshalling/revival, and event handling.
 * It aims to prepare data for, and process data from, VS Code's RPCProtocol.
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from "events";

// VS Code internal
import { type IDisposable, Event as VscodeEvent } from "vs/base/common/event";

import {
	MarshalledObject,
	revive as vscodeRevive,
} from "vs/base/common/marshalling";

// VS Code internal
// Assumed to be vscode API type definitions or shims

// VS Code internal
import { MarshalledId } from "vs/base/common/marshallingIds";

// VS Code internal
import { IURITransformer } from "vs/base/common/uriIpc";

// Cocoon-specific IPC helpers
import {
	sendNotificationToMountain,
	sendToMountainAndWait,
} from "../cocoon-ipc";

import {
	Location as VscodeApiLocation,
	Position as VscodeApiPosition,
	Range as VscodeApiRange,
	Selection as VscodeApiSelection,
	Uri as VscodeApiUri,
	// TODO: Import other vscode API types as needed by _convertApiArgToInternal
} from "../Shim/out/vscode";

// --- Type Definitions ---

// For services injected into the BaseCocoonShim or its children
export interface ILogServiceForShim {
	// Renamed to avoid conflict if real ILogService is different
	trace(message: string, ...args: any[]): void;

	info(message: string, ...args: any[]): void;

	warn(message: string, ...args: any[]): void;

	error(message: string | Error, ...args: any[]): void;
}

// Based on vs/workbench/services/extensions/common/proxyIdentifier.ts
export interface ProxyIdentifier<T> {
	// Service identifier string
	readonly sid: string;

	// Numeric ID, crucial for RPCProtocol
	readonly nid: number;
}

// Based on public API of vs/workbench/services/extensions/common/rpcProtocol.ts (RPCProtocol class)
// This is what shims will interact with as `this._rpcService`.
// TODO: Ensure this accurately reflects the methods shims actually need from RPCProtocol.
export interface IRpcProtocolServiceAdapter {
	// Renamed to avoid conflict with actual RPCProtocol class name
	// T is Proxied<T>
	getProxy<T>(identifier: ProxyIdentifier<T>): T;

	set<T, R extends T>(identifier: ProxyIdentifier<T>, value: R): R;

	// Available if RPCProtocol has a transformer
	transformIncomingURIs?<T>(obj: T): T;

	drain?(): Promise<void>;

	// If shims need to react
	// onDidChangeResponsiveState?: VscodeEvent<ResponsiveState>;
}

interface IStructuredErrorPayload {
	// Renamed
	message?: string;

	name?: string;

	code?: string | number;

	errno?: number;

	syscall?: string;
}

export function refineErrorForShim(
	originalError: Error,

	logService?: ILogServiceForShim,

	context = "",
): Error {
	if (!(originalError instanceof Error) || !originalError.message)
		return originalError;

	let structuredErrorPayload: IStructuredErrorPayload | null = null;

	try {
		const trimmedMessage = originalError.message.trim();

		if (
			(trimmedMessage.startsWith("{") && trimmedMessage.endsWith("}")) ||
			(trimmedMessage.startsWith("[") && trimmedMessage.endsWith("]"))
		) {
			structuredErrorPayload = JSON.parse(
				trimmedMessage,
			) as IStructuredErrorPayload;
		}
	} catch (e: any) {
		logService?.trace(
			`[RefineError][${context}] Failed to parse error message as JSON:`,

			e.message || e,
		);

		return originalError;
	}

	if (structuredErrorPayload && typeof structuredErrorPayload === "object") {
		const newMessage =
			structuredErrorPayload.message || originalError.message;

		const refinedError = new Error(newMessage);

		if (structuredErrorPayload.name)
			refinedError.name = structuredErrorPayload.name;

		if (structuredErrorPayload.code !== undefined)
			(refinedError as NodeJS.ErrnoException).code = String(
				structuredErrorPayload.code,
			);

		if (structuredErrorPayload.errno !== undefined)
			(refinedError as NodeJS.ErrnoException).errno =
				structuredErrorPayload.errno;

		if (structuredErrorPayload.syscall !== undefined)
			(refinedError as NodeJS.ErrnoException).syscall =
				structuredErrorPayload.syscall;

		refinedError.stack = originalError.stack
			? `${refinedError.name}: ${refinedError.message}\n(Original Stack):\n${originalError.stack}`
			: `${refinedError.name}: ${refinedError.message}\n(Stack unavailable)`;

		logService?.trace(
			`[RefineError][${context}] Refined error from JSON:`,

			refinedError.message,
		);

		return refinedError;
	}

	return originalError;
}

export class BaseCocoonShim {
	public readonly _serviceBrand: undefined;

	// Renamed for clarity
	readonly #serviceIdentifierString: string;

	// Renamed
	readonly #rpcProtocolAdapter: IRpcProtocolServiceAdapter | undefined;

	// Renamed
	readonly #logger: ILogServiceForShim | undefined;

	// Renamed
	readonly #warnOnceMessageSet = new Set<string>();

	constructor(
		serviceIdentifier: string | symbol,

		// Expecting the RPCProtocol instance
		rpcServiceAdapter: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		this.#serviceIdentifierString = String(serviceIdentifier);

		this.#rpcProtocolAdapter = rpcServiceAdapter;

		this.#logger = logService;

		if (!this.#logger)
			console.warn(
				`[BaseShim][${this.#serviceIdentifierString}] LogService not provided! Falling back to console.`,
			);

		if (!this.#rpcProtocolAdapter) {
			// For some shims (like log, or very basic ones), RPC might not be strictly necessary.
			// However, most will need it.
			this._logError(
				`RPCService Adapter not provided for ${this.#serviceIdentifierString}! Many features will be impaired.`,
			);
		}

		this._log(`Initialized.`);
	}

	protected get _logService(): ILogServiceForShim | undefined {
		return this.#logger;
	}

	protected get _rpcService(): IRpcProtocolServiceAdapter | undefined {
		return this.#rpcProtocolAdapter;
	}

	protected get _serviceIdentifier(): string {
		return this.#serviceIdentifierString;
	}

	// Logging helpers (unchanged from previous refinement, seem okay)
	protected _log(message: string, ...args: any[]): void {
		if (this.#logService) {
			this.#logService.trace(
				`[${this.#serviceIdentifier}] ${message}`,

				...args,
			);
		} else {
			console.log(
				`[${this.#serviceIdentifier}][trace] ${message}`,

				...args,
			);
		}
	}

	protected _logInfo(message: string, ...args: any[]): void {
		if (this.#logService) {
			this.#logService.info(
				`[${this.#serviceIdentifier}] ${message}`,

				...args,
			);
		} else {
			console.info(
				`[${this.#serviceIdentifier}][info] ${message}`,

				...args,
			);
		}
	}

	protected _logWarn(message: string, ...args: any[]): void {
		if (this.#logService) {
			this.#logService.warn(
				`[${this.#serviceIdentifier}] ${message}`,

				...args,
			);
		} else {
			console.warn(
				`[${this.#serviceIdentifier}][warn] ${message}`,

				...args,
			);
		}
	}

	protected _logError(message: string | Error, ...args: any[]): void {
		if (this.#logService) {
			// Pass message directly
			this.#logService.error(message, ...args);
		} else {
			if (message instanceof Error) {
				console.error(
					`[${this.#serviceIdentifier}][error] ${message.message}`,

					message.stack,

					...args,
				);
			} else {
				console.error(
					`[${this.#serviceIdentifier}][error] ${message}`,

					...args,
				);
			}
		}
	}

	protected _logWarnOnce(message: string, ...args: any[]): void {
		if (!this.#warnOnceMessages.has(message)) {
			this.#warnOnceMessages.add(message);

			this._logWarn(message, ...args);
		}
	}

	protected _getProxy<T>(
		identifier: ProxyIdentifier<T>,
	): T /* Proxied<T> */ | null {
		const idForLog = identifier?.sid || String(identifier);

		if (!this.#rpcProtocolAdapter) {
			this._logError(
				`Cannot get RPC proxy for ${idForLog}: RPCService Adapter unavailable.`,
			);

			return null;
		}

		try {
			return this.#rpcProtocolAdapter.getProxy(identifier);
		} catch (e: any) {
			this._logError(
				`Failed to get RPC proxy for ${idForLog}:`,

				refineErrorForShim(e, this.#logger),
			);

			return null;
		}
	}

	// --- Direct IPC Helpers ---
	protected async _ipcRequestResponse(
		mountainMethod: string,

		params: any,

		timeoutMs = 5000,
	): Promise<any> {
		this._log(`IPC Req: '${mountainMethod}'`);

		try {
			const result = await sendToMountainAndWait(
				mountainMethod,

				params,

				timeoutMs,
			);

			// Can be verbose
			// this._log(`IPC Resp for '${mountainMethod}'.`);

			return result;
		} catch (error: any) {
			const refined =
				error instanceof Error
					? refineErrorForShim(
							error,

							this.#logger,

							`ipcReqResp(${mountainMethod})`,
						)
					: new Error(String(error));

			this._logError(
				`IPC Req Error '${mountainMethod}':`,

				refined.message,

				refined.stack,
			);

			throw refined;
		}
	}

	protected _ipcNotify(mountainMethod: string, params: any): void {
		const paramSummary = params
			? JSON.stringify(params).substring(0, 80) + "..."
			: "(no params)";

		this._log(
			`Sending direct IPC notification '${mountainMethod}' to Mountain: ${paramSummary}`,
		);

		try {
			sendNotificationToMountain(mountainMethod, params);
		} catch (error: any) {
			this._logError(
				`Error sending direct IPC notification '${mountainMethod}':`,

				error,
			);
		}
	}

	// --- Argument Marshalling/Revival Helpers ---
	// These prepare JS objects for JSON serialization (potentially with $mid)
	// to be passed as arguments to RPC calls or stored.
	// RPCProtocol itself might do further transformations (e.g., URI stringification if transformer is set).
	protected _convertApiArgToInternal(arg: any): any {
		if (arg === undefined || arg === null) return arg;

		// VSBuffer passed as-is for RPCProtocol
		if (typeof arg !== "object" || arg instanceof VSBuffer) return arg;

		// Use instanceof checks for vscode API types
		try {
			if (arg instanceof VscodeApiUri) {
				// RPCProtocol can handle URI instances if no transformer is set, or transform them if one is.
				// If we want to ensure it's always a DTO with $mid for `vscodeRevive` on the other side (or here):
				return {
					// Or MarshalledId.Uri if full components are always needed
					$mid: MarshalledId.UriSimple,

					scheme: arg.scheme,

					authority: arg.authority,

					path: arg.path,

					query: arg.query,

					fragment: arg.fragment,

					// Often useful for debugging on other side
					// external: arg.toString(true),

					// fsPath only for file URIs
					// fsPath: arg.scheme === Schemas.file ? arg.fsPath : undefined,
				};
			}

			if (arg instanceof VscodeApiPosition)
				return {
					$mid: MarshalledId.Position,

					line: arg.line,

					character: arg.character,
				};

			if (arg instanceof VscodeApiRange)
				return {
					$mid: MarshalledId.Range,

					start: this._convertApiArgToInternal(arg.start),

					end: this._convertApiArgToInternal(arg.end),
				};

			if (arg instanceof VscodeApiSelection) {
				// This DTO aligns with ISelection for internal editor use
				return {
					// If there's a specific ID for this structure
					$mid: MarshalledId.Selection,

					selectionStartLineNumber: arg.anchor.line + 1,

					selectionStartColumn: arg.anchor.character + 1,

					positionLineNumber: arg.active.line + 1,

					positionColumn: arg.active.character + 1,
				};
			}

			if (arg instanceof VscodeApiLocation)
				return {
					$mid: MarshalledId.Location,

					uri: this._convertApiArgToInternal(arg.uri),

					range: this._convertApiArgToInternal(arg.range),
				};

			if (arg instanceof RegExp)
				return {
					$mid: MarshalledId.Regexp,

					source: arg.source,

					flags: arg.flags,
				};

			// TODO: Add converters for other common vscode API types if they need specific DTOs
			// (e.g., MarkdownString, NotebookCellData, etc.) based on extHostTypeConverters.ts patterns.
			// For types not specifically handled, VS Code's marshalling often relies on them having a toJSON() method
			// or being plain objects/arrays.
		} catch (conversionError: any) {
			this._logError(
				"Error in _convertApiArgToInternal specific type conversion:",

				arg,

				conversionError,
			);

			// Fallback to original on error
			return arg;
		}

		if (typeof (arg as any).toJSON === "function" && !Array.isArray(arg)) {
			try {
				return (arg as any).toJSON();
			} catch (e: any) {
				// Let objects with toJSON serialize themselves
				this._logWarn("Call to toJSON() failed on argument:", arg, e);
			}
		}

		if (Array.isArray(arg))
			return arg.map((el) => this._convertApiArgToInternal(el));

		if (arg.constructor === Object) {
			// Plain object, recurse
			const result: { [key: string]: any } = {};

			for (const key in arg)
				if (Object.prototype.hasOwnProperty.call(arg, key))
					result[key] = this._convertApiArgToInternal(arg[key]);

			return result;
		}

		this._logWarnOnce(
			`Unhandled object type in _convertApiArgToInternal (constructor: ${arg.constructor?.name || typeof arg}), returning original:`,

			arg,
		);

		return arg;
	}

	protected _reviveApiArgument<T = any>(
		arg: any,

		context?: any /* For vscodeRevive */,
	): T {
		if (arg === undefined || arg === null) return arg;

		// If RPCProtocol has a URI transformer and it already revived URIs, `arg` might contain URI instances.
		// `vscodeRevive` can often handle this, or we might check `arg instanceof URI` first.
		// The `uriTransformer` in `parseJsonAndRestoreBufferRefs` (in rpcProtocol.ts) handles incoming URIs.
		// So `arg` here should have URIs already revived if a transformer was used.
		// `vscodeRevive` then handles other $mid objects.

		try {
			return vscodeRevive(arg, context);
		} catch (e: any) {
			this._logError(
				"Failed to revive argument/result with vscodeRevive:",

				arg,

				e,
			);

			return arg;
		}
	}

	// --- Event Handling Helpers (unchanged, seem okay) ---
	protected _createEventEmitter(): EventEmitter {
		const emitter = new EventEmitter();

		// Default is 10, increase if many listeners are expected per emitter.
		// emitter.setMaxListeners(20);

		return emitter;
	}

	protected _createEventFromEmitter<T>(
		emitter: EventEmitter,

		eventName?: string,
	): VscodeEvent<T> {
		const event: VscodeEvent<T> = (listener, thisArgs, disposables?) => {
			// Make disposables optional
			// Ensure listener is a function
			if (typeof listener !== "function") {
				this._logError(
					"_createEventFromEmitter: listener is not a function",

					listener,
				);

				// Return a NOP disposable or throw, depending on strictness
				return { dispose: () => {} };
			}

			const handler = (...args: any[]) =>
				listener.call(thisArgs, ...(args as [T]));

			emitter.on(eventName, handler);

			const disposable: IDisposable = {
				dispose: () => emitter.removeListener(eventName, handler),
			};

			if (Array.isArray(disposables)) disposables.push(disposable);

			return disposable;
		};

		return event;
	}

	protected _createNopEventEmitter(): VscodeEvent<any> {
		try {
			// VscodeEvent.None is a function that returns a disposable.
			if (VscodeEvent && typeof VscodeEvent.None === "function") {
				return VscodeEvent.None;
			}
		} catch (e: any) {
			this._logWarnOnce(
				`Error accessing VscodeEvent.None, falling back to NOP stub. Error: ${e.message}`,
			);
		}

		this._logWarnOnce(
			"VscodeEvent.None not available or failed, using NOP stub.",
		);

		return () => ({ dispose: () => {} });
	}

	public dispose(): void {
		// Base shims can override to dispose their specific resources (e.g., RPC listeners, event emitters)
		this._log("BaseCocoonShim disposed (no-op by default).");
	}
}
