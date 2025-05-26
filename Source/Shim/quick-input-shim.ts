/*---------------------------------------------------------------------------------------------
 * Cocoon Quick Input Shim (shims/quick-input-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements `vscode.window.showQuickPick` and `vscode.window.showInputBox` APIs.
 * Proxies requests to Mountain for UI display and user interaction.
 *
 * For MVP, advanced features like step-by-step input, dynamic updates, and complex
 * validation are simplified or stubbed.
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
import {
	// API enum
	QuickInputButtons,
	type CancellationToken,
	// API types for QuickPick and InputBox
	type InputBox,
	type InputBoxOptions,
	type QuickPick,
	type QuickPickItem,
	type QuickPickOptions,
	// For ProgressLocation if used in QuickInput
	// ProgressLocation,
	// API type for cancellation
} from "vscode";

import {
	BaseCocoonShim,
	refineError,
	// Not directly used for IPC calls here if BaseShim handles it
	type IExtHostRpcService,
	type ILogService,
} from "./_baseShim";

// --- Type Definitions ---

// Options DTOs for IPC to Mountain
// These should be serializable versions of Vscode QuickPickOptions and InputBoxOptions
interface QuickPickOptionsForIpc
	extends Omit<
		QuickPickOptions<any>,
		| "onDidSelectItem" /* functions not easily serializable */
		| "onDidChangeSelection"
		| "onDidAccept"
		| "onDidTriggerButton"
		| "onDidTriggerItemButton"
	> {
	// Items will be serialized (e.g., only label, description, detail, picked)
	items: {
		label: string;

		description?: string;

		detail?: string;

		picked?: boolean;

		alwaysShow?: boolean;

		data?: any /* for roundtrip */;
	}[];
}

interface InputBoxOptionsForIpc
	extends Omit<
		InputBoxOptions,
		| "validateInput" /* function */
		| "onDidChangeValue"
		| "onDidAccept"
		| "onDidTriggerButton"
	> {
	// validateInput would require more complex back-and-forth if supported
}

// Response from Mountain for showQuickPick
// Selected label(s) or undefined
type QuickPickResponseFromMountain = string | string[] | undefined;

// Response from Mountain for showInputBox
// Entered string or undefined
type InputBoxResponseFromMountain = string | undefined;

// Interface for the service this shim provides (part of vscode.window)
export interface IExtHostQuickInputServiceShape {
	readonly _serviceBrand: undefined;

	showQuickPick<T extends QuickPickItem>(
		items: readonly T[] | Promise<readonly T[]>,

		options?: QuickPickOptions<T> & { canPickMany?: false },

		token?: CancellationToken,
	): Promise<T | undefined>;

	showQuickPick<T extends QuickPickItem>(
		items: readonly T[] | Promise<readonly T[]>,

		options: QuickPickOptions<T> & { canPickMany: true },

		token?: CancellationToken,
	): Promise<T[] | undefined>;

	// Overload for string items
	showQuickPick(
		items: readonly string[] | Promise<readonly string[]>,

		options?: QuickPickOptions<QuickPickItem & { label: string }> & {
			canPickMany?: false;

			// Options for string items
		},

		token?: CancellationToken,
	): Promise<string | undefined>;

	showQuickPick(
		items: readonly string[] | Promise<readonly string[]>,

		options: QuickPickOptions<QuickPickItem & { label: string }> & {
			canPickMany: true;

			// Options for string items
		},

		token?: CancellationToken,
	): Promise<string[] | undefined>;

	showInputBox(
		options?: InputBoxOptions,

		token?: CancellationToken,
	): Promise<string | undefined>;

	// TODO: createQuickPick, createInputBox for more controllabler UI elements
	// createQuickPick<T extends QuickPickItem>(): QuickPick<T>;

	// createInputBox(): InputBox;
}

export class ShimExtHostQuickInputService
	extends BaseCocoonShim
	implements IExtHostQuickInputServiceShape
{
	public readonly _serviceBrand: undefined;

	constructor(
		// BaseCocoonShim expects it
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostQuickInputService", rpcService, logService);

		this._log("Initialized.");
	}

	// Helper to serialize QuickPickItems for IPC
	private _serializeQuickPickItems<T extends QuickPickItem | string>(
		items: readonly T[],
	): QuickPickOptionsForIpc["items"] {
		return items.map((item) => ({
			label: typeof item === "string" ? item : item.label,

			description:
				typeof item === "object"
					? (item as QuickPickItem).description
					: undefined,

			detail:
				typeof item === "object"
					? (item as QuickPickItem).detail
					: undefined,

			picked:
				typeof item === "object"
					? (item as QuickPickItem).picked
					: undefined,

			alwaysShow:
				typeof item === "object"
					? (item as QuickPickItem).alwaysShow
					: undefined,

			// Store original item (or the string itself) in 'data' for roundtrip matching,

			// ensuring it's not something un-serializable like a function.
			data:
				typeof item === "object"
					? { _cocoonOriginalItemLabel: item.label }
					: item,
		}));
	}

	async showQuickPick<T extends QuickPickItem>(
		items: readonly T[] | Promise<readonly T[]>,

		options?: QuickPickOptions<T> & { canPickMany?: false },

		token?: CancellationToken,
	): Promise<T | undefined>;

	async showQuickPick<T extends QuickPickItem>(
		items: readonly T[] | Promise<readonly T[]>,

		options: QuickPickOptions<T> & { canPickMany: true },

		token?: CancellationToken,
	): Promise<T[] | undefined>;

	async showQuickPick(
		items: readonly string[] | Promise<readonly string[]>,

		options?: QuickPickOptions<QuickPickItem & { label: string }> & {
			canPickMany?: false;
		},

		token?: CancellationToken,
	): Promise<string | undefined>;

	async showQuickPick(
		items: readonly string[] | Promise<readonly string[]>,

		options: QuickPickOptions<QuickPickItem & { label: string }> & {
			canPickMany: true;
		},

		token?: CancellationToken,
	): Promise<string[] | undefined>;

	async showQuickPick<T extends QuickPickItem | string>(
		items: readonly T[] | Promise<readonly T[]>,

		options?: QuickPickOptions<
			T extends string ? QuickPickItem & { label: string } : T
		>,

		token?: CancellationToken,
	): Promise<T | T[] | undefined> {
		const resolvedItems = await Promise.resolve(items);

		if (token?.isCancellationRequested) {
			this._log("showQuickPick cancelled before IPC call.");

			return undefined;
		}

		const serializedItems = this._serializeQuickPickItems(resolvedItems);

		const ipcOptions: QuickPickOptionsForIpc = {
			...(options || {}),

			items: serializedItems,
		};

		// Remove functions if present in options before sending
		delete (ipcOptions as any).onDidSelectItem;

		delete (ipcOptions as any).onDidChangeSelection;

		delete (ipcOptions as any).onDidAccept;

		delete (ipcOptions as any).onDidTriggerButton;

		delete (ipcOptions as any).onDidTriggerItemButton;

		this._log(
			`showQuickPick: Sending ${serializedItems.length} items, options: ${JSON.stringify({ ...ipcOptions, items: `[${serializedItems.length} items]` })}`,
		);

		try {
			const result = (await this._ipcRequestResponse(
				"ui_showQuickPick",

				ipcOptions,

				300000,
			)) as QuickPickResponseFromMountain;

			if (token?.isCancellationRequested) return undefined;

			// User cancelled
			if (result === undefined) return undefined;

			if (options?.canPickMany) {
				if (!Array.isArray(result)) {
					this._logError(
						"showQuickPick (canPickMany:true) expected array result from Mountain, got:",

						result,
					);

					return undefined;
				}

				const selectedLabels = new Set(result as string[]);

				// Map selected labels back to original QuickPickItem objects or strings
				return resolvedItems.filter((item) =>
					selectedLabels.has(
						typeof item === "string"
							? item
							: (item as QuickPickItem).label,
					),
				) as T[] | undefined;
			} else {
				if (typeof result !== "string") {
					this._logError(
						"showQuickPick (canPickMany:false) expected string result from Mountain, got:",

						result,
					);

					return undefined;
				}

				// Find the original QuickPickItem or string by label
				return resolvedItems.find(
					(item) =>
						(typeof item === "string"
							? item
							: (item as QuickPickItem).label) === result,
				) as T | undefined;
			}
		} catch (e: any) {
			if (token?.isCancellationRequested) return undefined;

			this._logError(
				"showQuickPick IPC failed:",

				refineError(e, this._logService, "showQuickPick"),
			);

			// API usually returns undefined on error/cancellation, rather than throwing for UI interactions
			return undefined;
		}
	}

	async showInputBox(
		options?: InputBoxOptions,

		token?: CancellationToken,
	): Promise<string | undefined> {
		if (token?.isCancellationRequested) {
			this._log("showInputBox cancelled before IPC call.");

			return undefined;
		}

		const ipcOptions: InputBoxOptionsForIpc = { ...(options || {}) };

		// Remove functions like validateInput before sending
		delete (ipcOptions as any).validateInput;

		delete (ipcOptions as any).onDidChangeValue;

		delete (ipcOptions as any).onDidAccept;

		delete (ipcOptions as any).onDidTriggerButton;

		this._log(
			`showInputBox: Sending options: ${JSON.stringify(ipcOptions)}`,
		);

		try {
			const result = (await this._ipcRequestResponse(
				"ui_showInputBox",

				ipcOptions,

				300000,
			)) as InputBoxResponseFromMountain;

			if (token?.isCancellationRequested) return undefined;

			// Mountain returns string or undefined if cancelled
			return result;
		} catch (e: any) {
			if (token?.isCancellationRequested) return undefined;

			this._logError(
				"showInputBox IPC failed:",

				refineError(e, this._logService, "showInputBox"),
			);

			// API usually returns undefined on error/cancellation
			return undefined;
		}
	}

	// createQuickPick<T extends QuickPickItem>(): QuickPick<T> {

	//     this._logError("API not implemented: window.createQuickPick");

	//     throw new Error("window.createQuickPick is not implemented in this version of Cocoon.");

	// }

	// createInputBox(): InputBox {

	//     this._logError("API not implemented: window.createInputBox");

	//     throw new Error("window.createInputBox is not implemented in this version of Cocoon.");

	// }
}
