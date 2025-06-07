/*
 * File: Cocoon/Source/Shim/Clipboard.ts
 * Responsibility: Implements the VS Code clipboard API for extensions in the Cocoon sidecar by proxying clipboard operations to the Mountain backend via IPC, enabling seamless interaction with the system clipboard.
 * Modified: 2025-06-07 00:57:46 UTC
 * Dependency: vscode
 * Export: IExtHostClipboardServiceShape, ShimExtHostClipboardService
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Clipboard Shim
 * --------------------------------------------------------------------------------------------
 * This module implements the `vscode.env.clipboard` API, which provides extensions
 * with access to the system clipboard for reading and writing text.
 *
 * It proxies all clipboard operations to the Mountain host process via direct
 * Inter-Process Communication (IPC) calls.
 *
 * Core Responsibilities:
 * - Implementing the `vscode.Clipboard` Interface (transformed to PascalCase).
 *   - `ReadText()`: Sends an IPC request to Mountain to read text from the clipboard.
 *   - `WriteText(Text)`: Sends an IPC request to Mountain to write text to the clipboard.
 * - IPC Communication:
 *   - Formulates IPC requests with method names like "env_clipboardReadText" and "env_clipboardWriteText".
 * - Error Handling:
 *   - Catches and refines errors from the IPC layer or Mountain host.
 * - Logging:
 *   - Logs clipboard operations and any potential errors for debugging.
 *
 * Key Interactions and Dependencies:
 * - Extends `BaseCocoonShim` for logging and direct IPC capabilities.
 * - Relies on corresponding `env_clipboard*` handlers in the Mountain host process.
 *
 * Assumed IPC Contract with Mountain:
 * - Method: "env_clipboardReadText" -> Returns a string or null.
 * - Method: "env_clipboardWriteText" (Params: `{ text: string }`) -> Returns null on success.
 *
 *--------------------------------------------------------------------------------------------*/

import type { Clipboard as VscodeClipboardApiType } from "vscode";

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_BaseShim";

export interface IExtHostClipboardServiceShape extends VscodeClipboardApiType {
	readonly _serviceBrand: undefined;
}

export class ShimExtHostClipboardService
	extends BaseCocoonShim
	implements IExtHostClipboardServiceShape
{
	public readonly _serviceBrand: undefined;
	private static readonly DefaultClipboardTimeoutMillisecond = 3000;

	constructor(
		RpcServiceAdapter: IRpcProtocolServiceAdapter | undefined,
		LogServiceInstance: ILogServiceForShim | undefined,
	) {
		super("ExtHostClipboardService", RpcServiceAdapter, LogServiceInstance);
		this._LogDebug("Clipboard shim initialized.");
	}

	protected override _RequireRpc(): boolean {
		return false; // Uses direct IPC via _IpcRequestResponse
	}

	public async ReadText(): Promise<string> {
		this._LogDebug(
			"Execute ReadText: Requesting clipboard content via IPC 'env_clipboardReadText'.",
		);

		try {
			const TextContent = (await this._IpcRequestResponse(
				"env_clipboardReadText",
				{}, // No parameters needed for read operation
				ShimExtHostClipboardService.DefaultClipboardTimeoutMillisecond,
			)) as string | null | undefined;

			return TextContent || ""; // Ensure a string is always returned
		} catch (ErrorFromIpc: any) {
			const RefinedError = ErrorFromIpc as Error;
			this._LogError(
				`ReadText failed: IPC request 'env_clipboardReadText' resulted in an error. Message: ${RefinedError.message}`,
				RefinedError.stack,
			);
			throw RefinedError; // Fulfill API contract by rejecting the promise
		}
	}

	public async WriteText(TextToWrite: string): Promise<void> {
		const TextLength = TextToWrite.length;
		const TextSummary =
			TextLength > 50
				? TextToWrite.substring(0, 50) + "..."
				: TextToWrite;

		this._LogDebug(
			`Execute WriteText: Sending text to Mountain via IPC 'env_clipboardWriteText'. Length: ${TextLength}.`,
		);
		this._LogService?.trace(`WriteText content summary: "${TextSummary}"`);

		try {
			await this._IpcRequestResponse(
				"env_clipboardWriteText",
				{ text: TextToWrite }, // Payload for the IPC call
				ShimExtHostClipboardService.DefaultClipboardTimeoutMillisecond,
			);
		} catch (ErrorFromIpc: any) {
			const RefinedError = ErrorFromIpc as Error;
			this._LogError(
				`WriteText failed: IPC request 'env_clipboardWriteText' resulted in an error. Message: ${RefinedError.message}`,
				RefinedError.stack,
			);
			throw RefinedError;
		}
	}

	public override Dispose(): void {
		super.Dispose();
		this._LogDebug("Clipboard shim disposed.");
	}
}
