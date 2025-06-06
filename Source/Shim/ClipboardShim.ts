/*---------------------------------------------------------------------------------------------
 * Cocoon Clipboard Shim 
 * --------------------------------------------------------------------------------------------
 * This module implements the `vscode.env.clipboard` API, which provides extensions
 * with access to the system clipboard for reading and writing text.
 *
 * How it Works:
 * - It proxies all clipboard operations (readText, writeText) to the Mountain host
 *   process (the main application backend, e.g., Tauri Rust or Electron main).
 * - Communication with Mountain is achieved using direct Inter-Process Communication (IPC)
 *   calls, specifically leveraging the `_ipcRequestResponse` helper method inherited
 *   from `BaseCocoonShim`. This helper uses the underlying Vine IPC protocol
 *   (stdio-based newline-delimited JSON) established by `cocoon-ipc.ts`.
 *
 * Core Responsibilities:
 * - Implementing the `vscode.Clipboard` Interface:
 *   - `readText()`: Sends an IPC request to Mountain to read text from the system clipboard.
 *     It handles the response, returning the clipboard content as a string.
 *   - `writeText(text: string)`: Sends an IPC request to Mountain to write the provided
 *     text to the system clipboard.
 * - IPC Communication:
 *   - Formulates IPC request messages with specific method names (e.g., "env_clipboardReadText",
 *     "env_clipboardWriteText") and parameters (e.g., `{ text: "to_write" }`).
 *   - Uses `this._ipcRequestResponse()` from `BaseCocoonShim` to send these requests
 *     and asynchronously await their responses.
 * - Error Handling:
 *   - Catches errors that occur during IPC communication (e.g., timeouts, protocol errors
 *     from the underlying IPC layer) or errors explicitly returned by Mountain (e.g., if
 *     the OS clipboard is inaccessible).
 *   - Converts these errors into standard JavaScript `Error` objects, ensuring they are
 *     suitable for the `vscode.env.clipboard` API contract (which typically involves
 *     rejecting promises on failure).
 *   - Uses `refineErrorForShim` (from `BaseCocoonShim`) to ensure errors from Mountain
 *     are properly structured.
 * - Logging:
 *   - Logs clipboard operations (read/write attempts) and any potential errors encountered,
 *     aiding in debugging and monitoring.
 *
 * Key Interactions and Dependencies:
 * - An instance of `ShimExtHostClipboardService` is typically created and made available
 *   as part of the `vscode.env` object. This is usually managed by `ShimExtHostEnvService`
 *   or directly by the main API factory in `index.ts`.
 * - It extends `BaseCocoonShim`, inheriting common utilities for logging and direct IPC
 *   communication (`_ipcRequestResponse`). The direct IPC is used here instead of the
 *   main `RPCProtocol` because clipboard operations are often simple request-response
 *   interactions that don't necessarily need the full RPC machinery (though they could
 *   also be implemented as RPC calls).
 * - It relies on corresponding handlers being implemented in the Mountain host process.
 *   These Mountain-side handlers are responsible for the actual interaction with the
 *   operating system's clipboard APIs.
 *
 * Assumed IPC Contract with Mountain:
 * (This defines the expected structure of IPC messages for clipboard operations)
 *
 * 1. Method: "env_clipboardReadText" (Cocoon -> Mountain)
 *    - Cocoon Request Parameters: `{}` (an empty object, as no specific parameters are needed for reading).
 *    - Mountain Response (on Success): A VineResponse with `params` being either:
 *      - A string containing the clipboard text.
 *      - `null` or an empty string if the clipboard is empty or if the OS read operation
 *        was successful but yielded no text.
 *    - Mountain Response (on Error): A VineErrorResponse with an `error` payload
 *      (VineErrorPayload) detailing why the clipboard was inaccessible (e.g., OS-level error).
 *
 * 2. Method: "env_clipboardWriteText" (Cocoon -> Mountain)
 *    - Cocoon Request Parameters: `{ text: string }` (where `text` is the string to be written).
 *    - Mountain Response (on Success): A VineResponse with `params` being `null` (or any
 *      ignored value, as `writeText` typically returns `void` on success).
 *    - Mountain Response (on Error): A VineErrorResponse with an `error` payload
 *      (VineErrorPayload) detailing why the write operation failed.
 *
 * Last Reviewed/Updated: [Date of Merge or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import type { Clipboard as VscodeClipboardApiType } from "vscode";

import {
	BaseCocoonShim,
	// refineErrorForShim is used internally by _ipcRequestResponse
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

// --- Type Definitions for this Shim ---

export interface IExtHostClipboardServiceShape extends VscodeClipboardApiType {
	readonly _serviceBrand: undefined;
}

export class ShimExtHostClipboardService
	extends BaseCocoonShim
	implements IExtHostClipboardServiceShape
{
	public readonly _serviceBrand: undefined;
	private static readonly DEFAULT_CLIPBOARD_TIMEOUT_MILLISECONDS = 3000;

	constructor(
		rpcServiceAdapter: IRpcProtocolServiceAdapter | undefined,
		logServiceInstance: ILogServiceForShim | undefined,
	) {
		super("ExtHostClipboardService", rpcServiceAdapter, logServiceInstance);
		this._logDebug("Clipboard shim initialized.");
	}

	protected override _requiresRpc(): boolean {
		return false; // Uses direct IPC via _ipcRequestResponse
	}

	async readText(): Promise<string> {
		this._logDebug(
			"Executing clipboard.readText(): Requesting clipboard content from Mountain via IPC method 'env_clipboardReadText'.",
		);

		try {
			const textContentFromResult = (await this._ipcRequestResponse(
				"env_clipboardReadText",
				{}, // No parameters needed for readText IPC call
				ShimExtHostClipboardService.DEFAULT_CLIPBOARD_TIMEOUT_MILLISECONDS,
			)) as string | null | undefined;

			return textContentFromResult || ""; // Ensure string return
		} catch (errorFromIpcOrMountain: any) {
			// _ipcRequestResponse already uses refineErrorForShim and throws an Error instance.
			const refinedError = errorFromIpcOrMountain as Error;
			this._logError(
				`clipboard.readText() failed: IPC request 'env_clipboardReadText' to Mountain resulted in an error. Message: ${refinedError.message}`,
				refinedError.stack,
			);
			throw refinedError; // Rethrow to fulfill API contract (promise rejects on failure)
		}
	}

	async writeText(textToWrite: string): Promise<void> {
		const textLengthToWrite = textToWrite.length;
		const textSummaryForTraceLog =
			textLengthToWrite > 50
				? textToWrite.substring(0, 50) + "..."
				: textToWrite;

		this._logDebug(
			`Executing clipboard.writeText(): Sending text to Mountain via IPC method 'env_clipboardWriteText'. Text length: ${textLengthToWrite}.`,
		);
		this._logService?.trace(
			// Use optional chaining for logService
			`clipboard.writeText(): Content summary being sent: "${textSummaryForTraceLog}"`,
		);

		try {
			await this._ipcRequestResponse(
				"env_clipboardWriteText",
				{ text: textToWrite }, // Payload for the IPC call
				ShimExtHostClipboardService.DEFAULT_CLIPBOARD_TIMEOUT_MILLISECONDS,
			);
			// If no error, operation is considered successful.
		} catch (errorFromIpcOrMountain: any) {
			const refinedError = errorFromIpcOrMountain as Error;
			this._logError(
				`clipboard.writeText() failed: IPC request 'env_clipboardWriteText' to Mountain resulted in an error. Message: ${refinedError.message}`,
				refinedError.stack,
			);
			throw refinedError;
		}
	}

	public override dispose(): void {
		super.dispose(); // Handles common cleanup from BaseCocoonShim
		this._logDebug("Clipboard shim disposed.");
	}
}
