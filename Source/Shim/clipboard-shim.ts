/*---------------------------------------------------------------------------------------------
 * Cocoon Clipboard Shim (clipboard-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.env.clipboard` API, providing access to the system clipboard
 * by proxying read and write operations to the Mountain host process via direct IPC calls.
 *
 * Responsibilities:
 * - Implementing the `vscode.Clipboard` interface methods: `readText()` and `writeText()`.
 * - Sending IPC requests to Mountain (e.g., "env_clipboardReadText", "env_clipboardWriteText")
 *   using the `_ipcRequestResponse` helper from `BaseCocoonShim`.
 * - Handling successful responses and errors from IPC calls, converting errors into
 *   standard `Error` objects suitable for the `vscode.env.clipboard` API contract.
 * - Logging clipboard operations and potential errors.
 *
 * Key Interactions:
 * - An instance of `ShimExtHostClipboardService` is typically injected into `ShimExtHostEnvService`
 *   or made available as `vscode.env.clipboard` via the API factory.
 * - Uses `BaseCocoonShim` for common utilities like IPC communication and logging.
 * - Relies on corresponding handlers in the Mountain process to interact with the
 *   system clipboard.
 *
 *--------------------------------------------------------------------------------------------*/

// vscode.Clipboard API type
import type { Clipboard as VscodeClipboard } from "vscode";

import {
	BaseCocoonShim,
	// Use the more specific error refiner
	refineErrorForShim,
	// Updated type from BaseCocoonShim
	type ILogServiceForShim,
	// Updated type from BaseCocoonShim
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

// --- Type Definitions ---

/**
 * Defines the service interface for the clipboard functionality provided by this shim.
 * It directly matches the `vscode.Clipboard` API surface.
 * This interface can be used for Dependency Injection if this shim is registered as a standalone service.
 */
export interface IExtHostClipboardServiceShape extends VscodeClipboard {
	// No additional methods beyond vscode.Clipboard for this service itself.
	// Standard DI mechanism for VS Code services.
	readonly _serviceBrand: undefined;
}

/**
 * Cocoon's implementation of the `vscode.env.clipboard` API.
 */
export class ShimExtHostClipboardService
	extends BaseCocoonShim
	implements IExtHostClipboardServiceShape
{
	public readonly _serviceBrand: undefined;

	/**
	 * Creates an instance of ShimExtHostClipboardService.
	 * @param rpcService The RPC service adapter, passed to `BaseCocoonShim`. Not directly used by this shim's core IPC logic.
	 * @param logService The logging service instance.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostClipboardService", rpcService, logService);

		// Use _logDebug for routine initialization messages.
		this._logDebug("Initialized.");

		// This service primarily makes outgoing IPC calls and doesn't usually need to register
		// itself for RPC calls *from* the MainThread for its core clipboard functions.
	}

	/**
	 * This shim uses direct IPC (`_ipcRequestResponse`) for its clipboard operations
	 * and does not strictly require the main RPC proxy setup for these functions.
	 * @returns `false` as RPC is not required for core functionality.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * {@inheritDoc vscode.Clipboard.readText}
	 *
	 *
	 * Reads text from the system clipboard by proxying the request to Mountain.
	 * @returns A promise that resolves to the text content of the clipboard, or an empty string if empty.
	 * @throws An error if the IPC operation fails.
	 */
	async readText(): Promise<string> {
		this._logDebug(
			"clipboard.readText: Requesting from Mountain via IPC 'env_clipboardReadText'.",
		);

		try {
			// Assuming Mountain's 'env_clipboardReadText' handler takes no parameters
			// and returns a string, or null/undefined if the clipboard is empty or inaccessible.
			const text = (await this._ipcRequestResponse(
				"env_clipboardReadText",

				{},

				2000,
			)) as string | null | undefined;

			// Ensure string return, defaulting to empty string if null/undefined.
			return text || "";
		} catch (e: any) {
			const error = refineErrorForShim(
				e,

				this._logService,

				"clipboard.readText",
			);

			this._logError(
				`clipboard.readText IPC request 'env_clipboardReadText' failed: ${error.message}`,

				error.stack,
			);

			// The vscode.env.clipboard.readText API contract typically throws if the operation itself fails.
			throw error;
		}
	}

	/**
	 * {@inheritDoc vscode.Clipboard.writeText}
	 *
	 *
	 * Writes text to the system clipboard by proxying the request to Mountain.
	 * @param text The string to write to the clipboard.
	 * @returns A promise that resolves when the text has been written, or rejects on error.
	 * @throws An error if the IPC operation fails.
	 */
	async writeText(text: string): Promise<void> {
		// Be careful about logging potentially sensitive clipboard content.
		// Log only a summary or length.
		const textSummary =
			text.length > 50 ? text.substring(0, 50) + "..." : text;

		this._logDebug(
			`clipboard.writeText: Sending to Mountain via IPC 'env_clipboardWriteText' (text length: ${text.length}, summary: "${textSummary}")`,
		);

		try {
			// Assuming Mountain's 'env_clipboardWriteText' handler expects an object like { text: string }.
			await this._ipcRequestResponse(
				"env_clipboardWriteText",

				{ text },

				2000,
			);
		} catch (e: any) {
			const error = refineErrorForShim(
				e,

				this._logService,

				"clipboard.writeText",
			);

			this._logError(
				`clipboard.writeText IPC request 'env_clipboardWriteText' failed: ${error.message}`,

				error.stack,
			);

			throw error;
		}
	}

	/**
	 * Disposes of resources held by this shim instance.
	 * (Currently, this shim holds no complex resources like event emitters that require
	 * explicit disposal beyond what `BaseCocoonShim` handles).
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables
		super.dispose();

		this._logDebug("Disposed.");
	}
}
