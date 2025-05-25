/*---------------------------------------------------------------------------------------------
 * Cocoon Terminal Service Shim (shims/terminal-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements parts of the `vscode.window` terminal-related APIs, primarily governed by
 * the `IExtHostTerminalService` interface. This shim manages the lifecycle of terminals,
 *
 *
 * interaction with them (sending text, showing/hiding), and handles terminal-related
 * environment variable collections.
 *
 * Most actions that involve creating or interacting with actual terminal backends are
 * proxied to a `MainThreadTerminalService` in the Mountain host process via RPC.
 * Environment variable changes, however, are typically sent via direct Vine IPC
 * notifications.
 *
 * Responsibilities:
 * - `ShimExtHostTerminalService`:
 *   - Implements `createTerminal()`: Proxies to Mountain via RPC to create a terminal backend.
 *   - Manages a collection of active `ShimTerminalImpl` instances.
 *   - Provides `vscode.window.terminals` and `vscode.window.activeTerminal` (state updated by Mountain).
 *   - Exposes terminal lifecycle events (`onDidOpenTerminal`, `onDidCloseTerminal`, etc.),
 *
 *
 *     fired based on RPC notifications from Mountain.
 *   - Implements `getEnvironmentVariableCollection()`: Returns an instance of
 *     `ShimEnvironmentVariableCollectionImpl` for a given extension.
 *   - Handles RPC calls from Mountain (e.g., `$acceptTerminalOpened`, `$acceptTerminalClosed`).
 * - `ShimTerminalImpl` (implements `vscode.Terminal`):
 *   - Represents a single terminal instance.
 *   - Proxies actions like `show()`, `hide()`, `sendText()`, `dispose()` to Mountain via RPC.
 *   - Manages properties like `name`, `processId` (as a promise), and `exitStatus`,
 *
 *
 *     which are updated by RPC calls from Mountain.
 * - `ShimEnvironmentVariableCollectionImpl` (implements `vscode.EnvironmentVariableCollection`):
 *   - Manages environment variable mutators for a specific extension.
 *   - Notifies Mountain of changes to the collection via direct Vine IPC calls
 *     (e.g., `terminal_setEnvironmentVariable`).
 *
 * Key Interactions:
 * - `ShimExtHostTerminalService` is registered with DI in `Cocoon/index.ts` and its
 *   methods contribute to the `vscode.window` API namespace.
 * - Uses `RPCProtocol` for terminal creation, actions, and lifecycle events with
 *   `MainContext.MainThreadTerminalService`.
 * - Uses direct Vine IPC (`cocoon-ipc.ts`) for `ShimEnvironmentVariableCollectionImpl`
 *   to notify Mountain of environment changes.
 * - Relies on `BaseCocoonShim` for common utilities.
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";

// IDisposable for return types
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";

// For URI marshalling if URIs are part of options (e.g., cwd, iconPath)
// Not directly used if relying on _convertApiArgToInternal
// import { MarshalledId } from "vs/base/common/marshallingIds";

import {
	// For registering this service for RPC calls from MainThread
	ExtHostContext,

	// For proxying to MainThreadTerminalService
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";

// Import types from the public 'vscode' API
import {
	EnvironmentVariableMutatorType as VscodeEnvironmentVariableMutatorType,

	// For ExtensionTerminalOptions.pty (if PTYs supported)
	Pseudoterminal as VscodePseudoterminal,

	// If PTY data events were handled
	// Event as VscodeTerminalDataEvent,

	// For PTY options
	TerminalDimensions as VscodeTerminalDimensions,
	TerminalExitReason as VscodeTerminalExitReason,

	// For cwd or iconPath options
	Uri as VscodeUri,
	type EnvironmentVariableCollection as VscodeEnvironmentVariableCollection,
	type EnvironmentVariableMutator as VscodeEnvironmentVariableMutator,

	// For getEnvironmentVariableCollection parameter
	type Extension as VscodeExtension,
	type ExtensionTerminalOptions as VscodeExtensionTerminalOptions,

	// The API type this shim implements parts of
	type Terminal as VscodeTerminal,
	type TerminalExitStatus as VscodeTerminalExitStatus,
	type TerminalOptions as VscodeTerminalOptions,
	type TerminalState as VscodeTerminalState,

	// For TerminalOptions.location
	type ViewColumn as VscodeViewColumn,

	// For future use: getProfiles, onDidChangeAvailableProfiles
	type TerminalProfile as VscodeTerminalProfile,

	// For future use
	type TerminalProfileProvider as VscodeTerminalProfileProvider,
} from "vscode";

/*
import *_getProxy` and `_convertApiArgToInternal`.
 * - Relies on Mountain's `MainThreadQuickInput` (or similar) for UI display and interaction.
 *--------------------------------------------------------------------------------------------*/

import {
	// For event implementations
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";

import { Disposable, type IDisposable } from "vs/base/common/lifecycle";

// For API types and enums
import {
	// API type
	CancellationToken,

	// API enum
	QuickInputButtons,
	type InputBox,
	type InputBoxOptions,
	type QuickPick,
	type QuickPickItem,
	type QuickPickOptions,

	// If using withProgress inside QuickInput UI
	// ProgressLocation,
} from "vscode";

import {
	BaseCocoonShim,

	// Use the more specific refineError
	refineErrorForShim,
	type IRpcProtocolServiceAdapter,
	type ILogServiceForShim,
} from "./_baseShim";

// --- Type Definitions ---

/**
 * Serializable options for `showQuickPick` sent via IPC to Mountain.
 * Functions like `onDidSelectItem` are omitted as they are not directly serializable.
 */
interface QuickPickOptionsForIpc
	extends Omit<
		QuickPickOptions<any>,
		| "onDidSelectItem"
		| "onDidChangeSelection"
		| "onDidAccept"
		| "onDidTriggerButton"
		| "onDidTriggerItemButton"
		| "buttons"
		| "step"
		| "totalSteps"
	> {
	items: {
		label: string;

		description?: string;

		detail?: string;

		picked?: boolean;

		alwaysShow?: boolean;

		// To store original item or unique ID for roundtrip matching
		data?: any;

		// For QuickPickItemKind (Separator)
		kind?: number;
	}[];

	buttons?: {
		iconPath: any /* Marshalled UriComponents | ThemeIcon */;

		tooltip?: string;

		handle: number;

		// Simplified buttons
	}[];
}

/**
 * Serializable options for `showInputBox` sent via IPC to Mountain.
 * Functions like `validateInput` are omitted.
 */
interface InputBoxOptionsForIpc
	extends Omit<
		InputBoxOptions,
		| "validateInput"
		| "onDidChangeValue"
		| "onDidAccept"
		| "onDidTriggerButton"
		| "buttons"
		| "step"
		| "totalSteps"
	> {
	buttons?: {
		iconPath: any /* Marshalled UriComponents | ThemeIcon */;

		tooltip?: string;

		handle: number;

		// Simplified buttons
	}[];
}

/** Expected response structure from Mountain for `ui_showQuickPick`. */
// Selected label(s) or undefined if cancelled.
type QuickPickResponseFromMountain = string | string[] | undefined;

/** Expected response structure from Mountain for `ui_showInputBox`. */
// Entered string or undefined if cancelled.
type InputBoxResponseFromMountain = string | undefined;

/**
 * Defines the service interface for Quick Input operations, primarily part of `vscode.window`.
 */
export interface IExtHostQuickInputServiceShape {
	// For DI
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

	showQuickPick(
		items: readonly string[] | Promise<readonly string[]>,

		options?: QuickPickOptions<QuickPickItem & { label: string }> & {
			canPickMany?: false;
		},

		token?: CancellationToken,
	): Promise<string | undefined>;

	showQuickPick(
		items: readonly string[] | Promise<readonly string[]>,

		options: QuickPickOptions<QuickPickItem & { label: string }> & {
			canPickMany: true;
		},

		token?: CancellationToken,
	): Promise<string[] | undefined>;

	showInputBox(
		options?: InputBoxOptions,

		token?: CancellationToken,
	): Promise<string | undefined>;

	// Complex lifecycle, stubbed for MVP
	// createQuickPick<T extends QuickPickItem>(): QuickPick<T>;

	// Complex lifecycle, stubbed for MVP
	// createInputBox(): InputBox;
}

/**
 * Cocoon's implementation of Quick Input services (`showQuickPick`, `showInputBox`).
 * It proxies UI interactions to the Mountain host process via direct IPC.
 */
export class ShimExtHostQuickInputService
	extends BaseCocoonShim
	implements IExtHostQuickInputServiceShape
{
	public readonly _serviceBrand: undefined;

	constructor(
		// Passed to BaseCocoonShim
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostQuickInputService", rpcService, logService);

		this._log("Initialized.");
	}

	/**
	 * This shim uses direct IPC and does not strictly require RPC for its core functionality.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * Serializes `QuickPickItem` or string items into a DTO suitable for IPC.
	 * @param items The array of items to serialize.
	 * @returns An array of serialized item DTOs.
	 */
	private _serializeQuickPickItemsForIpc<T extends QuickPickItem | string>(
		items: readonly T[],
	): QuickPickOptionsForIpc["items"] {
		return items.map((item, index) => {
			if (typeof item === "string") {
				// Store original index
				return { label: item, data: { _cocoonOriginalIndex: index } };
			}

			const qpItem = item as QuickPickItem;

			return {
				label: qpItem.label,

				description: qpItem.description,

				detail: qpItem.detail,

				picked: qpItem.picked,

				alwaysShow: qpItem.alwaysShow,

				// Pass through QuickPickItemKind (e.g., Separator)
				kind: qpItem.kind,

				// Store original index to reliably map back, as labels might not be unique.
				data: { _cocoonOriginalIndex: index },
			};
		});
	}

	/**
	 * Serializes QuickInputButton DTOs for IPC.
	 * @param buttons Array of vscode.QuickInputButton.
	 * @returns Array of simplified button DTOs with handles.
	 */
	private _serializeButtonsForIpc(
		buttons?: readonly QuickInputButton[],
	): QuickPickOptionsForIpc["buttons"] {
		if (!buttons) return undefined;

		return buttons.map((button, index) => ({
			// iconPath needs to be marshalled if it's a Uri
			// Assuming iconPath is on the internal type
			iconPath: this._convertApiArgToInternal((button as any).iconPath),

			tooltip: button.tooltip,

			// Assign a handle for Mountain to report back which button was clicked
			handle: index,
		}));
	}

	/** {@inheritDoc IExtHostQuickInputServiceShape.showQuickPick} */
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
			this._log("showQuickPick cancelled by token before IPC call.");

			return undefined;
		}

		const serializedItems =
			this._serializeQuickPickItemsForIpc(resolvedItems);

		const ipcOptions: QuickPickOptionsForIpc = {
			// Spread options first
			...(options || {}),

			items: serializedItems,

			buttons: this._serializeButtonsForIpc(options?.buttons),
		};

		// Remove properties that are functions or complex objects not suitable for IPC
		delete (ipcOptions as any).onDidSelectItem;

		delete (ipcOptions as any).onDidChangeSelection;

		delete (ipcOptions as any).onDidAccept;

		delete (ipcOptions as any).onDidTriggerButton;

		delete (ipcOptions as any).onDidTriggerItemButton;

		delete (ipcOptions as any).step;

		delete (ipcOptions as any).totalSteps;

		const optionsSummary = {
			...ipcOptions,

			items: `[${serializedItems.length} items]`,
		};

		this._log(
			`showQuickPick: Sending ${serializedItems.length} items, options: ${JSON.stringify(optionsSummary)}`,
		);

		try {
			const resultFromMountain = (await this._ipcRequestResponse(
				"ui_showQuickPick",

				ipcOptions,

				0,

				// 0 for indefinite timeout for user interaction
			)) as QuickPickResponseFromMountain;

			if (token?.isCancellationRequested) {
				this._log("showQuickPick cancelled by token after IPC call.");

				return undefined;
			}

			if (resultFromMountain === undefined) {
				this._log(
					"showQuickPick dismissed by user or no selection made.",
				);

				return undefined;
			}

			if (options?.canPickMany) {
				if (!Array.isArray(resultFromMountain)) {
					this._logError(
						"showQuickPick (canPickMany:true) expected array of selected indices/data from Mountain, got:",

						resultFromMountain,
					);

					return undefined;
				}

				// Assuming Mountain returns an array of original indices stored in `data._cocoonOriginalIndex`
				const selectedIndices = new Set(resultFromMountain as number[]);

				return resolvedItems.filter((_item, index) =>
					selectedIndices.has(index),
				) as T[] | undefined;
			} else {
				// Assuming Mountain returns the original index for single pick
				if (typeof resultFromMountain !== "number") {
					this._logError(
						"showQuickPick (canPickMany:false) expected a single original index (number) from Mountain, got:",

						resultFromMountain,
					);

					return undefined;
				}

				return resolvedItems[resultFromMountain as number] as
					| T
					| undefined;
			}
		} catch (e: any) {
			// Check again after await
			if (token?.isCancellationRequested) return undefined;

			this._logError(
				"showQuickPick IPC request failed:",

				refineErrorForShim(e, this._logService, "showQuickPick"),
			);

			// API usually returns undefined on UI error/cancellation, rather than throwing.
			return undefined;
		}
	}

	/** {@inheritDoc IExtHostQuickInputServiceShape.showInputBox} */
	async showInputBox(
		options?: InputBoxOptions,

		token?: CancellationToken,
	): Promise<string | undefined> {
		if (token?.isCancellationRequested) {
			this._log("showInputBox cancelled by token before IPC call.");

			return undefined;
		}

		const ipcOptions: InputBoxOptionsForIpc = { ...(options || {}) };

		// Remove properties not suitable for IPC
		delete (ipcOptions as any).validateInput;

		delete (ipcOptions as any).onDidChangeValue;

		delete (ipcOptions as any).onDidAccept;

		delete (ipcOptions as any).onDidTriggerButton;

		delete (ipcOptions as any).step;

		delete (ipcOptions as any).totalSteps;

		ipcOptions.buttons = this._serializeButtonsForIpc(options?.buttons);

		this._log(
			`showInputBox: Sending options: ${JSON.stringify(ipcOptions)}`,
		);

		try {
			const result = (await this._ipcRequestResponse(
				"ui_showInputBox",

				ipcOptions,

				0,

				// 0 for indefinite timeout
			)) as InputBoxResponseFromMountain;

			if (token?.isCancellationRequested) {
				this._log("showInputBox cancelled by token after IPC call.");

				return undefined;
			}

			// Mountain returns the entered string or undefined if cancelled.
			return result;
		} catch (e: any) {
			if (token?.isCancellationRequested) return undefined;

			this._logError(
				"showInputBox IPC request failed:",

				refineErrorForShim(e, this._logService, "showInputBox"),
			);

			return undefined;
		}
	}

	// --- Stubs for createQuickPick and createInputBox (complex lifecycle UI) ---
	// createQuickPick<T extends QuickPickItem>(): QuickPick<T> {

	// 	this._logError("API not implemented: window.createQuickPick. This involves a complex UI lifecycle not supported in MVP.");

	// 	throw new Error("window.createQuickPick is not implemented in this version of Cocoon.");

	// }

	// createInputBox(): InputBox {

	// 	this._logError("API not implemented: window.createInputBox. This involves a complex UI lifecycle not supported in MVP.");

	// 	throw new Error("window.createInputBox is not implemented in this version of Cocoon.");

	// }

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override dispose(): void {
		// From BaseCocoonShim
		super.dispose();

		// Dispose any event emitters or resources specific to this shim if they were created.
	}
}
