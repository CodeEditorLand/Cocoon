/*---------------------------------------------------------------------------------------------
 * Cocoon Clipboard Shim (clipboard-shim.ts)
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
 *--------------------------------------------------------------------------------------------*/

// Import the `vscode.Clipboard` API type definition from the 'vscode' namespace.
// This ensures that the shim correctly implements the public API contract.
import type { Clipboard as VscodeClipboardApiType } from "vscode";

// Import base class and utilities from `_baseShim.ts`.
import {
	BaseCocoonShim, // Base class providing common shim functionalities.
	refineErrorForShim, // Utility to refine errors, especially those from IPC.
	type ILogServiceForShim, // Type for the logging service.
	type IRpcProtocolServiceAdapter, // Type for the RPC service adapter (though not directly used for core logic here).
} from "./_baseShim";

// --- Type Definitions for this Shim ---

/**
 * Defines the service interface shape for the clipboard functionality provided by this shim.
 * It directly matches the `vscode.Clipboard` API surface, ensuring that any component
 * depending on `vscode.Clipboard` can use this shim.
 * This interface can also be used for Dependency Injection (DI) if this clipboard shim
 * is registered as a standalone service within Cocoon's DI container.
 */
export interface IExtHostClipboardServiceShape extends VscodeClipboardApiType {
	// `_serviceBrand` is a standard mechanism in VS Code's DI system for nominal typing,
	// ensuring that services are correctly identified and injected. It's typically `undefined`.
	readonly _serviceBrand: undefined;
}

/**
 * Cocoon's implementation of the `vscode.env.clipboard` API.
 * This class handles reading from and writing to the system clipboard by proxying
 * these operations to the Mountain host process via direct IPC calls.
 */
export class ShimExtHostClipboardService
	extends BaseCocoonShim // Inherits common utilities like logging and IPC helpers.
	implements IExtHostClipboardServiceShape
{
	// Implements the defined service interface.
	// Service brand for DI, satisfying the `IExtHostClipboardServiceShape` interface.
	public readonly _serviceBrand: undefined;

	// Default timeout duration (in milliseconds) for clipboard operations.
	// Accessing the OS clipboard should generally be a fast operation. This timeout
	// guards against cases where the Mountain host process might be slow to respond
	// or an IPC message gets lost.
	// Value increased slightly from an earlier 2000ms to 3000ms for a bit more leeway.
	private static readonly DEFAULT_CLIPBOARD_TIMEOUT_MILLISECONDS = 3000;

	/**
	 * Creates an instance of `ShimExtHostClipboardService`.
	 * @param rpcServiceAdapter - The RPC service adapter, passed to the `BaseCocoonShim` constructor.
	 *                            While `BaseCocoonShim` requires it, this particular shim (`ShimExtHostClipboardService`)
	 *                            uses direct IPC (`_ipcRequestResponse`) for its core clipboard operations
	 *                            and does not strictly rely on the main `RPCProtocol` setup for these functions.
	 * @param logServiceInstance - The logging service instance, used for logging debug messages and errors.
	 */
	constructor(
		rpcServiceAdapter: IRpcProtocolServiceAdapter | undefined,
		logServiceInstance: ILogServiceForShim | undefined,
	) {
		// Call the base class constructor, providing a name for this shim (for logging) and the injected services.
		super("ExtHostClipboardService", rpcServiceAdapter, logServiceInstance);
		// Log that the clipboard shim has been initialized.
		this._logDebug("Clipboard shim initialized.");
	}

	/**
	 * Overrides a method from `BaseCocoonShim` to indicate whether this specific shim
	 * requires the main RPC proxy (to `MainThreadServiceShape` on Mountain) to be set up
	 * for its core functionality.
	 *
	 * For clipboard operations, this shim uses direct IPC calls (`_ipcRequestResponse`)
	 * rather than methods on a main RPC proxy. Therefore, it does not strictly require
	 * the full RPC proxy setup that some other shims might depend on.
	 *
	 * @returns `false`, indicating that the main RPC proxy is not essential for the
	 *          core operations of this clipboard shim.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * {@inheritDoc vscode.Clipboard.readText}
	 *
	 * Reads text content from the system clipboard. This operation is performed by
	 * sending an IPC request ("env_clipboardReadText") to the Mountain host process,
	 * which then interacts with the OS-level clipboard.
	 *
	 * @returns A promise that resolves to a string containing the text content of the clipboard.
	 *          If the clipboard is empty, or if the OS read operation was successful but
	 *          yielded no text (e.g., clipboard contained non-text data), the promise
	 *          resolves to an empty string (`""`).
	 * @throws An `Error` if the IPC operation fails fundamentally (e.g., timeout waiting
	 *         for Mountain's response, a protocol error from the underlying IPC layer),
	 *         or if Mountain returns an error payload indicating that the clipboard was
	 *         inaccessible due to an OS-level issue (e.g., permissions, clipboard locked
	 *         by another application). This behavior aligns with the `vscode.env.clipboard.readText`
	 *         API contract, which states that the promise "Rejects if clipboard is inaccessible".
	 */
	async readText(): Promise<string> {
		this._logDebug(
			"Executing clipboard.readText(): Requesting clipboard content from Mountain via IPC method 'env_clipboardReadText'.",
		);

		try {
			// Send an IPC request to Mountain using the `_ipcRequestResponse` helper from `BaseCocoonShim`.
			// The Mountain host process is assumed to have a handler for the "env_clipboardReadText" method.
			// This handler should:
			// - Take no specific parameters (or an empty object `{}` as sent here).
			// - On success, return a VineResponse where the `params` field contains either the clipboard
			//   text (as a string) or `null` (if the clipboard is empty or contains non-text data).
			// - On failure (e.g., OS clipboard inaccessible), send back a VineErrorResponse.
			const textContentFromResult = (await this._ipcRequestResponse(
				"env_clipboardReadText", // The agreed-upon IPC method name for reading clipboard text.
				{}, // No parameters are needed for the readText IPC call to Mountain.
				ShimExtHostClipboardService.DEFAULT_CLIPBOARD_TIMEOUT_MILLISECONDS, // Timeout for this operation.
				// The `_ipcRequestResponse` method returns `any` for the successful result payload.
				// We cast it here based on the expected contract with Mountain.
			)) as string | null | undefined;

			// Ensure that the return value is always a string. If `textContentFromResult` is `null`
			// (indicating an empty clipboard from a successful OS read) or `undefined` (if the IPC
			// layer or Mountain somehow returns this for a successful void-like operation, though less common
			// for reads), default to an empty string.
			return textContentFromResult || "";
		} catch (errorFromIpcOrMountain: any) {
			// The `_ipcRequestResponse` method is designed to already use `refineErrorForShim`
			// internally and throw a proper `Error` instance (potentially with a `code` property
			// if it originated from a `VineErrorPayload` from Mountain).
			// Therefore, `errorFromIpcOrMountain` here is expected to be an `Error` instance.
			// We just need to cast it for clarity and logging. No need to re-refine it here.
			const refinedError = errorFromIpcOrMountain as Error;

			// Log the failure.
			this._logError(
				`clipboard.readText() failed: IPC request 'env_clipboardReadText' to Mountain resulted in an error. Message: ${refinedError.message}`,
				refinedError.stack, // Include stack trace for better debugging.
			);

			// The `vscode.env.clipboard.readText` API contract specifies that the promise should reject
			// if the clipboard is inaccessible or the operation fails. The error thrown by
			// `_ipcRequestResponse` (which includes refined errors from Mountain or IPC-level errors
			// like timeouts) already fulfills this contract. So, we just rethrow it.
			throw refinedError;
		}
	}

	/**
	 * {@inheritDoc vscode.Clipboard.writeText}
	 *
	 * Writes the given text to the system clipboard. This operation is performed by
	 * sending an IPC request ("env_clipboardWriteText") to the Mountain host process.
	 *
	 * @param textToWrite - The string content to be written to the clipboard.
	 * @returns A promise that resolves (with `void`) when the text has been successfully
	 *          written to the clipboard by Mountain, or rejects if an error occurs.
	 * @throws An `Error` if the IPC operation fails (e.g., timeout, protocol error) or
	 *         if Mountain signals an error during the clipboard write operation (e.g.,
	 *         OS-level failure to access or modify the clipboard).
	 */
	async writeText(textToWrite: string): Promise<void> {
		const textLengthToWrite = textToWrite.length;
		// For logging purposes, create a summary of the text if it's very long,
		// to avoid flooding logs with potentially large clipboard contents.
		const textSummaryForTraceLog =
			textLengthToWrite > 50
				? textToWrite.substring(0, 50) + "..."
				: textToWrite;

		this._logDebug(
			`Executing clipboard.writeText(): Sending text to Mountain via IPC method 'env_clipboardWriteText'. Text length: ${textLengthToWrite}.`,
		);

		// For more detailed debugging (e.g., during development), the content summary
		// can be logged at a 'trace' level if the log service supports it.
		this._logService?.trace(
			`clipboard.writeText(): Content summary being sent: "${textSummaryForTraceLog}"`,
		);

		try {
			// Send an IPC request to Mountain.
			// The Mountain host process is assumed to have a handler for "env_clipboardWriteText"
			// that expects a payload like `{ text: string }`.
			await this._ipcRequestResponse(
				"env_clipboardWriteText", // The agreed-upon IPC method name.
				{ text: textToWrite }, // The payload for the IPC call, containing the text to write.
				ShimExtHostClipboardService.DEFAULT_CLIPBOARD_TIMEOUT_MILLISECONDS, // Timeout.
			);

			// If `_ipcRequestResponse` resolves without throwing an error, it implies success.
			// The actual result payload from `_ipcRequestResponse` is typically ignored for
			// API methods that return `void` (like `writeText`).
			// A successful VineResponse from Mountain (e.g., with `params: null`) would lead to this.
		} catch (errorFromIpcOrMountain: any) {
			// As with `readText`, `_ipcRequestResponse` handles error refinement.
			// `errorFromIpcOrMountain` is expected to be an `Error` instance.
			const refinedError = errorFromIpcOrMountain as Error;

			// Log the failure.
			this._logError(
				`clipboard.writeText() failed: IPC request 'env_clipboardWriteText' to Mountain resulted in an error. Message: ${refinedError.message}`,
				refinedError.stack,
			);

			// Rethrow the error to signal failure to the calling extension,
			// adhering to the `vscode.Clipboard.writeText` API contract.
			throw refinedError;
		}
	}

	/**
	 * Disposes of resources held by this shim instance.
	 * For this particular shim, there might not be many resources to dispose of
	 * beyond what `BaseCocoonShim` handles (like clearing disposables in `_instanceDisposables`).
	 * If this shim were to, for example, subscribe to clipboard change events from Mountain,
	 * those subscriptions would be disposed of here.
	 */
	public override dispose(): void {
		// Call the `dispose` method of the base class (`BaseCocoonShim`).
		// This handles common cleanup tasks, such as disposing of any IDisposable objects
		// that might have been added to the `_instanceDisposables` store.
		super.dispose();

		// Log that this specific shim instance has been disposed.
		this._logDebug("Clipboard shim disposed.");
	}
}
