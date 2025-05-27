/*---------------------------------------------------------------------------------------------
 * Cocoon Quick Input Shim (quick-input-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.window.showQuickPick` and `vscode.window.showInputBox` APIs.
 * These methods allow extensions to display simple selection lists (Quick Pick) or
 * text input fields (Input Box) to the user for quick interactions.
 *
 * This shim proxies these UI requests to the Mountain host process via direct IPC calls, * using the `_ipcRequestResponse` helper from `BaseCocoonShim`. Mountain is then
 * responsible for rendering the native UI and returning the user's input or selection.
 *
 * For Cocoon's MVP (Minimum Viable Product), advanced Quick Input features such as
 * step-by-step input flows (which would be managed by a `QuickInputController`), * dynamic updates to items or options while the UI is visible, and complex input
 * validation with immediate feedback are simplified or stubbed. The `createQuickPick`
 * and `createInputBox` methods, which provide more granular control over the UI
 * lifecycle, are explicitly not implemented and will throw an error if called.
 *
 * Responsibilities:
 * - Implementing `showQuickPick` and `showInputBox` as defined in `vscode.d.ts`, *   including handling their various overloads.
 * - Handling overloaded signatures for `showQuickPick` (single vs. multi-select, *   `QuickPickItem` objects vs. simple string arrays for items).
 * - Marshalling `QuickPickOptions` and `InputBoxOptions` into serializable DTOs
 *   suitable for IPC transport to Mountain:
 *   - Removing function properties (e.g., `onDidSelectItem`, `validateInput`) which
 *     cannot be easily serialized for a simple request-response IPC model.
 *   - Serializing `QuickPickItem`s, crucially including the original index of each item
 *     in a `data` payload. This allows for reliable mapping of Mountain's response
 *     (which is expected to be based on these indices) back to the original items
 *     provided by the extension, even if item labels are not unique.
 *   - Marshalling `QuickInputButton` icon paths (if they are URIs) for IPC.
 * - Sending requests to Mountain (e.g., to IPC methods `ui_showQuickPick`, `ui_showInputBox`).
 * - Unmarshalling responses received from Mountain:
 *   - For `showQuickPick`, Mountain is expected to return the original index (for single
 *     select) or an array of original indices (for multi-select) of the selected item(s).
 *   - For `showInputBox`, Mountain is expected to return the string entered by the user.
 * - Gracefully handling user cancellation (dialog dismissed by the user), *   `CancellationToken` cancellation by the extension, and IPC errors, typically by
 *   returning `undefined` as per the `vscode.window.show...` API contract.
 *
 * Key Interactions:
 * - An instance of `ShimExtHostQuickInputService` is typically made available as part of
 *   the `vscode.window` API namespace through the main API factory provider in
 *   `Cocoon/index.ts`.
 * - Uses `BaseCocoonShim` for common utilities:
 *   - `_ipcRequestResponse` for direct IPC communication with Mountain.
 *   - `_convertApiArgToInternal` for marshalling complex types like URIs in button icons.
 *   - Logging methods (`_logDebug`, `_logInfo`, `_logError`).
 *   - `refineErrorForShim` for consistent error handling of IPC failures.
 * - Relies on corresponding IPC handlers implemented in the Mountain host process to
 *   display the native Quick Pick and Input Box UIs and return the user's interaction.
 *
 *--------------------------------------------------------------------------------------------*/

// Emitter as VscodeEmitter, // Not directly used for showQuickPick/showInputBox simple versions
import "vs/base/common/event";

// Not directly used
// Event as VscodeEvent,

// Not directly used by show... methods
// import { Disposable, type IDisposable } from "vs/base/common/lifecycle";

// Import public vscode API types
import {
	// API type for cancellation tokens
	CancellationToken,
	// API enum for standard buttons - not directly used if creating custom buttons
	// QuickInputButtons,

	// API type (for createInputBox, currently stubbed)
	type InputBox,
	// Options for showInputBox
	type InputBoxOptions,
	// For custom buttons on QuickPick/InputBox
	type QuickInputButton,
	// API type (for createQuickPick, currently stubbed)
	type QuickPick,
	// Interface for items in a QuickPick
	type QuickPickItem,
	// Enum for item kinds (e.g., Separator)
	type QuickPickItemKind,
	// Options for showQuickPick
	type QuickPickOptions,
	// If withProgress were integrated into QuickInput UI methods
	// type ProgressLocation,
} from "vscode";

import {
	BaseCocoonShim,
	// Use the more specific error refiner
	refineErrorForShim,
	// Updated type from BaseCocoonShim
	type ILogServiceForShim,
	// Updated type from BaseCocoonShim
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

// --- Type Definitions for IPC ---

/**
 * Data Transfer Object (DTO) for `QuickPickItem` or string items sent via IPC.
 * Includes the original index for robust mapping of responses from Mountain.
 */
interface QuickPickItemForIpc {
	label: string;

	description?: string;

	detail?: string;

	picked?: boolean;

	alwaysShow?: boolean;

	// For separators etc. (e.g., QuickPickItemKind.Separator which is -1)
	kind?: QuickPickItemKind;

	// Stores the original index of the item in the input array.
	data?: { _cocoonOriginalIndex: number };
}

/**
 * Serializable DTO for `vscode.QuickInputButton`s for IPC.
 * `iconPath` would be marshalled (e.g., to UriComponents if it's a `vscode.Uri`).
 * Each button is assigned a handle (its index) for Mountain to report back which was clicked, if applicable.
 */
interface QuickInputButtonForIpc {
	// Marshalled VscodeUri (UriComponents DTO) or a ThemeIcon ID string.
	iconPath: any;

	tooltip?: string;

	// Internal handle (index) for Mountain to report back.
	handle: number;
}

/**
 * Serializable options for `showQuickPick` sent via IPC to Mountain.
 * Functions (like `onDidSelectItem`) and complex UI lifecycle properties (like `step`, `totalSteps`, * which are relevant for `createQuickPick` but not simple `showQuickPick`) are omitted.
 */
interface QuickPickOptionsForIpc
	extends Omit<
		// Omit properties not suitable for simple IPC
		QuickPickOptions<any>,
		| "onDidSelectItem"
		| "onDidChangeSelection"
		| "onDidAccept"
		| "onDidTriggerButton"
		| "onDidTriggerItemButton"
		// Serialized separately as QuickInputButtonForIpc[]
		| "buttons"
		| "step"
		// Part of QuickInputController lifecycle
		| "totalSteps"
	> {
	items: QuickPickItemForIpc[];

	buttons?: QuickInputButtonForIpc[];
}

/**
 * Serializable options for `showInputBox` sent via IPC to Mountain.
 * Functions (like `validateInput`) and complex UI lifecycle properties are omitted.
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
	buttons?: QuickInputButtonForIpc[];
}

/**
 * Expected response structure from Mountain for `ui_showQuickPick` IPC call.
 * - If `canPickMany` is true in options: Mountain should return an array of numbers, *   where each number is the `_cocoonOriginalIndex` of a selected item.
 * - If `canPickMany` is false (or not set): Mountain should return a single number, *   which is the `_cocoonOriginalIndex` of the selected item.
 * - `undefined` if the user cancelled the QuickPick dialog.
 */
type QuickPickResponseFromMountain = number | number[] | undefined;

/**
 * Expected response structure from Mountain for `ui_showInputBox` IPC call.
 * The string entered by the user, or `undefined` if the user cancelled.
 */
type InputBoxResponseFromMountain = string | undefined;

/**
 * Defines the service interface for Quick Input operations, typically part of `vscode.window`.
 * This is used for Dependency Injection if this service is registered.
 */
export interface IExtHostQuickInputServiceShape {
	// Standard DI mechanism for VS Code services.
	readonly _serviceBrand: undefined;

	// Overloads for showQuickPick with QuickPickItem<T>
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

	// Overloads for showQuickPick with string[]
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

	// TODO: `createQuickPick` and `createInputBox` methods, which return QuickPick<T> and InputBox
	// controllers respectively, are part of a more complex UI lifecycle. They are stubbed (throw Error)
	// for MVP as they require significant back-and-forth communication with MainThread for dynamic updates.
	// createQuickPick<T extends QuickPickItem>(): QuickPick<T>;

	// createInputBox(): InputBox;
}

/**
 * Cocoon's implementation of Quick Input services (`showQuickPick`, `showInputBox`).
 * It proxies UI interactions to the Mountain host process via direct IPC calls.
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

		// Use Info for major lifecycle events
		this._logInfo("Initialized.");
	}

	/**
	 * This shim uses direct IPC (`_ipcRequestResponse`) for its core Quick Input functionality
	 * and does not rely on the main RPC proxy mechanism for these `show...` methods.
	 * @returns `false` as RPC is not required for this shim's primary operations.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * Serializes an array of `vscode.QuickPickItem` or simple string items into an array of
	 * `QuickPickItemForIpc` DTOs. Each DTO in the output array includes the original index
	 * of the item in its `data._cocoonOriginalIndex` field, which is crucial for reliably
	 * mapping responses from Mountain back to the original items provided by the extension.
	 * @param items The array of `QuickPickItem` or string items to serialize.
	 * @returns An array of `QuickPickItemForIpc` DTOs.
	 */
	private _serializeQuickPickItemsForIpc<T extends QuickPickItem | string>(
		items: readonly T[],
	): QuickPickItemForIpc[] {
		return items.map((item, index) => {
			if (typeof item === "string") {
				return { label: item, data: { _cocoonOriginalIndex: index } };
			}

			// It's a QuickPickItem object
			const qpItem = item as QuickPickItem;

			return {
				label: qpItem.label,

				description: qpItem.description,

				detail: qpItem.detail,

				picked: qpItem.picked,

				alwaysShow: qpItem.alwaysShow,

				// Pass through QuickPickItemKind (e.g., Separator, which is -1)
				kind: qpItem.kind,

				// Store original index for robust response mapping
				data: { _cocoonOriginalIndex: index },
			};
		});
	}

	/**
	 * Serializes an array of `vscode.QuickInputButton` into `QuickInputButtonForIpc` DTOs.
	 * Each button DTO is assigned a `handle` (its index) so that Mountain can report
	 * back which button was clicked, if that functionality were fully implemented.
	 * `iconPath` (if a `vscode.Uri`) is marshalled using `_convertApiArgToInternal`.
	 * @param buttons The array of `QuickInputButton`s to serialize.
	 * @returns An array of `QuickInputButtonForIpc` DTOs, or `undefined` if the input is empty or undefined.
	 */
	private _serializeButtonsForIpc(
		buttons?: readonly QuickInputButton[],
	): QuickInputButtonForIpc[] | undefined {
		if (!buttons || buttons.length === 0) return undefined;

		return buttons.map((button, index) => ({
			// `iconPath` on `QuickInputButton` can be VscodeUri | { light: VscodeUri, dark: VscodeUri } | ThemeIcon.
			// `_convertApiArgToInternal` should handle marshalling VscodeUri to its DTO form.
			// ThemeIcon (if { id: string }) might pass through or need specific DTO conversion if complex.
			// Use `any` cast if `iconPath` isn't on public type.
			iconPath: this._convertApiArgToInternal((button as any).iconPath),

			tooltip: button.tooltip,

			// Assign a unique handle (index) for this button within this QuickInput.
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

	// Combined implementation signature
	async showQuickPick<T extends QuickPickItem | string>(
		items: readonly T[] | Promise<readonly T[]>,

		options?: QuickPickOptions<
			T extends string ? QuickPickItem & { label: string } : T
			// Options type adjusted for string items
		>,

		token?: CancellationToken,
	): Promise<T | T[] | undefined> {
		// Return type matches overloads
		// Resolve `items` if it's a Promise.
		const resolvedItems = await Promise.resolve(items);

		if (token?.isCancellationRequested) {
			this._logDebug(
				"showQuickPick cancelled by CancellationToken before IPC call.",
			);

			return undefined;
		}

		const serializedItemsForIpc =
			this._serializeQuickPickItemsForIpc(resolvedItems);

		const serializedButtonsForIpc = this._serializeButtonsForIpc(
			options?.buttons,
		);

		const ipcOptions: QuickPickOptionsForIpc = {
			// Spread serializable options from VscodeQuickPickOptions.
			...(options || {}),

			items: serializedItemsForIpc,

			// Add serialized buttons.
			buttons: serializedButtonsForIpc,
		};

		// Remove properties that are functions or complex objects not suitable for simple IPC request-response.
		// Event handler, not serializable.
		delete (ipcOptions as any).onDidSelectItem;

		// Event handler.
		delete (ipcOptions as any).onDidChangeSelection;

		// Event handler.
		delete (ipcOptions as any).onDidAccept;

		// Event handler.
		delete (ipcOptions as any).onDidTriggerButton;

		// Event handler for item buttons (more complex).
		delete (ipcOptions as any).onDidTriggerItemButton;

		// Omit complex UI lifecycle properties not handled by simple showQuickPick IPC (these are for createQuickPick).
		delete (ipcOptions as any).step;

		delete (ipcOptions as any).totalSteps;

		const optionsSummaryForLog = {
			...ipcOptions,

			items: `[${serializedItemsForIpc.length} items]`,

			buttons: `[${serializedButtonsForIpc?.length ?? 0} buttons]`,
		};

		this._logDebug(
			`showQuickPick: Sending to Mountain via IPC 'ui_showQuickPick'. Number of items: ${serializedItemsForIpc.length}, ` +
				`Options (summary): ${JSON.stringify(optionsSummaryForLog)}`,
		);

		try {
			// Use indefinite timeout (0) as user interaction duration is unpredictable. Mountain should handle actual dialog timeouts.
			const resultFromMountain = (await this._ipcRequestResponse(
				"ui_showQuickPick",

				ipcOptions,

				0 /* Indefinite timeout for UI */,
			)) as QuickPickResponseFromMountain;

			if (token?.isCancellationRequested) {
				// Check token again after the `await` completes.
				this._logDebug(
					"showQuickPick cancelled by CancellationToken after IPC call completion but before processing result.",
				);

				return undefined;
			}

			if (resultFromMountain === undefined) {
				// User cancelled the QuickPick dialog (Mountain returned undefined).
				this._logDebug(
					"showQuickPick dismissed by user or no selection made (Mountain returned undefined).",
				);

				return undefined;
			}

			// Mountain is expected to return the original index (or an array of original indices)
			// of the selected item(s), based on `data._cocoonOriginalIndex` sent in `QuickPickItemForIpc`.
			if (options?.canPickMany) {
				// Multi-select scenario.
				if (
					!Array.isArray(resultFromMountain) ||
					!resultFromMountain.every((idx) => typeof idx === "number")
				) {
					this._logError(
						"showQuickPick (canPickMany:true) expected an array of original indices (numbers) from Mountain, but received an invalid response format.",

						"Received:",

						resultFromMountain,
					);

					return undefined;
				}

				// Set of selected original indices.
				const selectedIndices = new Set(resultFromMountain as number[]);

				// Filter the original `resolvedItems` array to get the actual selected items.
				return resolvedItems.filter((_item, index) =>
					selectedIndices.has(index),
				) as T[] | undefined;
			} else {
				// Single-select scenario.
				if (typeof resultFromMountain !== "number") {
					this._logError(
						"showQuickPick (canPickMany:false) expected a single original index (number) from Mountain, but received an invalid response format.",

						"Received:",

						resultFromMountain,
					);

					return undefined;
				}

				// The original index of the selected item.
				const selectedIndex = resultFromMountain as number;

				return selectedIndex >= 0 &&
					selectedIndex < resolvedItems.length
					? // Return the original item.
						(resolvedItems[selectedIndex] as T | undefined)
					: // Index out of bounds, treat as no selection.
						undefined;
			}
		} catch (e: any) {
			if (token?.isCancellationRequested) {
				// Check token again in case of IPC error.
				this._logDebug(
					"showQuickPick cancelled by CancellationToken during or after IPC error.",
				);

				return undefined;
			}

			this._logError(
				"showQuickPick IPC request 'ui_showQuickPick' failed:",

				// Use refined error message.
				refineErrorForShim(e, this._logService, "showQuickPick IPC"),
			);

			// The API contract for showQuickPick typically returns `undefined` on UI error or user cancellation,

			// rather than throwing an error from the API call itself.
			return undefined;
		}
	}

	/** {@inheritDoc IExtHostQuickInputServiceShape.showInputBox} */
	async showInputBox(
		options?: InputBoxOptions,

		token?: CancellationToken,
	): Promise<string | undefined> {
		if (token?.isCancellationRequested) {
			this._logDebug(
				"showInputBox cancelled by CancellationToken before IPC call.",
			);

			return undefined;
		}

		const serializedButtonsForIpc = this._serializeButtonsForIpc(
			options?.buttons,
		);

		const ipcOptions: InputBoxOptionsForIpc = {
			// Spread serializable options from VscodeInputBoxOptions.
			...(options || {}),

			buttons: serializedButtonsForIpc,
		};

		// Remove properties not suitable for simple IPC request-response.
		// `validateInput` is a function and cannot be serialized for simple IPC.
		delete (ipcOptions as any).validateInput;

		// Event handler.
		delete (ipcOptions as any).onDidChangeValue;

		// Event handler.
		delete (ipcOptions as any).onDidAccept;

		// Event handler.
		delete (ipcOptions as any).onDidTriggerButton;

		// Omit complex UI lifecycle properties.
		delete (ipcOptions as any).step;

		delete (ipcOptions as any).totalSteps;

		this._logDebug(
			`showInputBox: Sending to Mountain via IPC 'ui_showInputBox'. Options: ${JSON.stringify(ipcOptions)}`,
		);

		try {
			const resultFromMountain = (await this._ipcRequestResponse(
				"ui_showInputBox",

				ipcOptions,

				0 /* Indefinite timeout */,
			)) as InputBoxResponseFromMountain;

			if (token?.isCancellationRequested) {
				// Check token again after `await`.
				this._logDebug(
					"showInputBox cancelled by CancellationToken after IPC call completion.",
				);

				return undefined;
			}

			// Mountain is expected to return the entered string, or `undefined` if the user cancelled.
			return resultFromMountain;
		} catch (e: any) {
			if (token?.isCancellationRequested) {
				// Check token again in case of IPC error.
				this._logDebug(
					"showInputBox cancelled by CancellationToken during or after IPC error.",
				);

				return undefined;
			}

			this._logError(
				"showInputBox IPC request 'ui_showInputBox' failed:",

				refineErrorForShim(e, this._logService, "showInputBox IPC"),
			);

			// The API contract for showInputBox typically returns `undefined` on UI error or user cancellation.
			return undefined;
		}
	}

	// --- Stubs for createQuickPick and createInputBox (complex lifecycle UI not supported in MVP) ---
	// These methods return controller objects (`QuickPick<T>`, `InputBox`) that allow for dynamic
	// updates and step-by-step interactions. Implementing them fully requires a more complex
	// RPC protocol with continuous communication, beyond simple request-response.

	// public createQuickPick<T extends QuickPickItem>(): QuickPick<T> {

	// 	this._logError(
	//         "API method 'window.createQuickPick' is not implemented in this version of Cocoon. " +
	//         "This method involves a complex UI lifecycle with dynamic updates and event handling, " +
	//         "which is not supported in the current MVP shim that focuses on simple `showQuickPick`."
	//     );

	// 	throw new Error("window.createQuickPick is not implemented in this Cocoon shim.");

	// }

	// public createInputBox(): InputBox {

	// 	this._logError(
	//         "API method 'window.createInputBox' is not implemented in this version of Cocoon. " +
	//         "This method involves a complex UI lifecycle with dynamic updates and event handling, " +
	//         "which is not supported in the current MVP shim that focuses on simple `showInputBox`."
	//     );

	// 	throw new Error("window.createInputBox is not implemented in this Cocoon shim.");

	// }

	/**
	 * Disposes of resources held by this shim instance.
	 * (Currently, this shim primarily manages stateless `show...` methods and holds no
	 * complex resources like active QuickInput controllers that would require explicit disposal
	 * beyond what `BaseCocoonShim` handles via `_instanceDisposables`).
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables.
		super.dispose();

		// Use Info for major lifecycle.
		this._logInfo("Disposed.");
	}
}
