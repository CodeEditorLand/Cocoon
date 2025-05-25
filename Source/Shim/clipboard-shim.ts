/*---------------------------------------------------------------------------------------------
 * Cocoon Clipboard Shim (shims/clipboard-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.env.clipboard` API, providing access to the system clipboard
 * by proxying read and write operations to the Mountain host process.
 *--------------------------------------------------------------------------------------------*/

import type { Clipboard as VscodeClipboard } from "vscode"; // API type

import {
	BaseCocoonShim,
	refineError,
	type IExtHostRpcService, // Not directly used if using direct IPC from BaseShim
	type ILogService,
} from "./_baseShim";

// --- Type Definitions ---

// Interface for the service this shim provides (matches vscode.Clipboard)
export interface IExtHostClipboardServiceShape extends VscodeClipboard {
	// No additional methods needed beyond vscode.Clipboard for this service itself
	readonly _serviceBrand: undefined; // For DI if registered as a full service
}

export class ShimExtHostClipboardService
	extends BaseCocoonShim
	implements IExtHostClipboardServiceShape
{
	public readonly _serviceBrand: undefined;

	constructor(
		rpcService: IExtHostRpcService | undefined, // Expected by BaseCocoonShim
		logService: ILogService | undefined,
	) {
		super("ExtHostClipboardService", rpcService, logService);
		this._log("Initialized.");
		// This service typically doesn't need to register itself for RPC calls *from* MainThread
		// as it only makes calls *to* MainThread.
	}

	async readText(): Promise<string> {
		this._log("clipboard.readText: Requesting from Mountain.");
		try {
			// Assuming Mountain's handler for 'env_clipboardReadText' takes no params
			// and returns a string or throws.
			const text = (await this._ipcRequestResponse(
				"env_clipboardReadText",
				{},
				2000,
			)) as string | null | undefined;
			return text || ""; // Ensure string return, empty if null/undefined
		} catch (e: any) {
			const error = refineError(
				e,
				this._logService,
				"clipboard.readText",
			);
			this._logError(
				"clipboard.readText IPC failed:",
				error.message,
				error.stack,
			);
			// API expects a string, even on failure, or should it throw?
			// VS Code's API typically throws if the operation itself fails.
			// If IPC fails, we can throw. If Mountain returns error string, that's handled by refineError.
			throw error;
		}
	}

	async writeText(text: string): Promise<void> {
		// Be careful about logging potentially sensitive clipboard content.
		const textSummary =
			text.length > 50 ? text.substring(0, 50) + "..." : text;
		this._log(
			`clipboard.writeText: Sending to Mountain (text length: ${text.length}, summary: "${textSummary}")`,
		);
		try {
			// Assuming Mountain's handler for 'env_clipboardWriteText' expects { text: string }
			await this._ipcRequestResponse(
				"env_clipboardWriteText",
				{ text },
				2000,
			);
		} catch (e: any) {
			const error = refineError(
				e,
				this._logService,
				"clipboard.writeText",
			);
			this._logError(
				"clipboard.writeText IPC failed:",
				error.message,
				error.stack,
			);
			throw error;
		}
	}
}
