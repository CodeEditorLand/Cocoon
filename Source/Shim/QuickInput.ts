/*
 * File: Cocoon/Source/Shim/QuickInput.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-07 05:37:36 UTC
 * Dependency: vs/base/common/errors, vs/base/common/uri
 * Export: IExtHostQuickInputServiceShape, ShimExtHostQuickInputService
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Quick Input Shim
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.window.showQuickPick` and `vscode.window.showInputBox` APIs.
 * These methods allow extensions to display simple selection lists (Quick Pick) or
 * text input fields (Input Box) to the user for quick interactions.
 *
 * This shim proxies these UI requests to the Mountain host process via direct IPC calls, * using the `_ipcRequestResponse` helper from `BaseCocoonShim`. Mountain is then
 * responsible for rendering the native UI and returning the user's input or selection.
 *
 * For Cocoon's MVP, advanced Quick Input features such as step-by-step input flows, * dynamic updates while the UI is visible, and complex input validation are simplified or stubbed.
 * The `createQuickPick` and `createInputBox` methods are explicitly not implemented.
 *
 * Responsibilities:
 * - Implementing `showQuickPick` and `showInputBox`, including overloads.
 * - Marshalling `QuickPickOptions` and `InputBoxOptions` to serializable DTOs for IPC:
 *   - Omitting function properties and complex lifecycle properties.
 *   - Serializing `QuickPickItem`s, embedding original index in `data._cocoonOriginalIndex`.
 *   - Marshalling `QuickInputButton` icon paths (URIs to DTOs, ThemeIcons as is).
 * - Sending requests to Mountain (IPC: `ui_showQuickPick`, `ui_showInputBox`).
 * - Unmarshalling responses from Mountain (selected indices for QuickPick, string for InputBox).
 * - Handling user cancellation, `CancellationToken`, and IPC errors by returning `undefined`.
 *
 * Key Interactions:
 * - Part of `vscode.window` API via API factory.
 * - Uses `BaseCocoonShim` for IPC, marshalling, logging, error refinement.
 * - Relies on Mountain IPC handlers for native UI display.
 *
 * Assumed IPC Contract with Mountain:
 * - Method "ui_showQuickPick":
 *   - Cocoon Params: `QuickPickOptionsForIpc` (includes `items: QuickPickItemForIpc[]`, `buttons?: QuickInputButtonForIpc[]`)
 *   - Mountain Response (Success): `{ params: number | number[] | null | undefined }` (original indices or null/undefined for cancel)
 * - Method "ui_showInputBox":
 *   - Cocoon Params: `InputBoxOptionsForIpc` (includes `buttons?: QuickInputButtonForIpc[]`)
 *   - Mountain Response (Success): `{ params: string | null | undefined }` (entered string or null/undefined for cancel)
 * Errors from Mountain are expected as VineErrorPayload.
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import { isCancellationError } from "vs/base/common/errors";
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri"; // For DTOs

// VS Code API types (ensure this path resolves to Cocoon's 'vscode' shim)
import {
	CancellationToken, // API type for cancellation tokens
	type InputBox, // For createInputBox stub type
	type InputBoxOptions,
	type QuickInputButton,
	type QuickPick, // For createQuickPick stub type
	type QuickPickItem,
	type QuickPickItemKind, // Enum for item kinds (e.g., Separator)
	type QuickPickOptions,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

// --- Type Definitions for IPC ---
interface QuickPickItemForIpc {
	label: string;
	description?: string;
	detail?: string;
	picked?: boolean;
	alwaysShow?: boolean;
	kind?: QuickPickItemKind; // vscode.QuickPickItemKind is an enum of numbers
	data?: { _cocoonOriginalIndex: number }; // Stores original index for reliable mapping
}
interface QuickInputButtonForIpc {
	iconPath:
		| VSCodeInternalUriComponents
		| {
				light: VSCodeInternalUriComponents;
				dark: VSCodeInternalUriComponents;
		  }
		| { id: string } // Marshalled VscodeUri(s) or ThemeIcon DTO ({id: string})
		| undefined; // Allow undefined if iconPath isn't set
	tooltip?: string;
	handle: number; // Internal handle (original index of the button)
}
interface QuickPickOptionsForIpc
	extends Omit<
		QuickPickOptions<any>,
		// Omit function-based and complex lifecycle properties not suitable for simple IPC
		| "onDidSelectItem"
		| "onDidChangeSelection"
		| "onDidAccept"
		| "onDidTriggerButton"
		| "onDidTriggerItemButton"
		| "buttons" // Will be replaced by `QuickInputButtonForIpc[]`
		| "step"
		| "totalSteps" // For multi-step input, not in MVP
	> {
	items: QuickPickItemForIpc[];
	buttons?: QuickInputButtonForIpc[]; // Use the IPC-safe button DTO
}
interface InputBoxOptionsForIpc
	extends Omit<
		InputBoxOptions,
		// Omit function-based and complex lifecycle properties
		| "validateInput"
		| "onDidChangeValue"
		| "onDidAccept"
		| "onDidTriggerButton"
		| "buttons" // Will be replaced by `QuickInputButtonForIpc[]`
		| "step"
		| "totalSteps" // For multi-step input, not in MVP
	> {
	buttons?: QuickInputButtonForIpc[]; // Use the IPC-safe button DTO
}

// As per "Assumed IPC Contract"
type QuickPickResponseFromMountain = {
	params: number | number[] | null | undefined;
};
type InputBoxResponseFromMountain = { params: string | null | undefined };

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
	createQuickPick<T extends QuickPickItem>(): QuickPick<T>; // STUBBED for MVP
	createInputBox(): InputBox; // STUBBED for MVP
}

export class ShimExtHostQuickInputService
	extends BaseCocoonShim
	implements IExtHostQuickInputServiceShape
{
	public readonly _serviceBrand: undefined;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostQuickInputService", rpcService, logService);
		this._logInfo("Initialized.");
	}

	protected override _requiresRpc(): boolean {
		return false; // Uses direct IPC for its core functionality
	}

	private _serializeQuickPickItemsForIpc<T extends QuickPickItem | string>(
		items: readonly T[],
	): QuickPickItemForIpc[] {
		return items.map((item, index) => {
			if (typeof item === "string") {
				return { label: item, data: { _cocoonOriginalIndex: index } };
			}
			const qpItem = item as QuickPickItem;
			return {
				label: qpItem.label,
				description: qpItem.description,
				detail: qpItem.detail,
				picked: qpItem.picked,
				alwaysShow: qpItem.alwaysShow,
				kind: qpItem.kind,
				data: { _cocoonOriginalIndex: index }, // Store original index
			};
		});
	}

	private _serializeButtonsForIpc(
		buttons?: readonly QuickInputButton[],
	): QuickInputButtonForIpc[] | undefined {
		if (!buttons || buttons.length === 0) return undefined;
		return buttons.map((button, index) => {
			// iconPath can be VscodeUri | { light: VscodeUri, dark: VscodeUri } | ThemeIcon
			// BaseCocoonShim._convertApiArgToInternal handles VscodeUri -> UriComponents and plain objects.
			// For ThemeIcon ({id: string}), it should pass through if treated as a plain object.
			const marshalledIconPath = this._convertApiArgToInternal(
				(button as any).iconPath,
			);
			return {
				iconPath: marshalledIconPath, // Ensure this result is serializable
				tooltip: button.tooltip,
				handle: index, // Assign original index as handle
			};
		});
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
			...(options || {}), // Spread options first to allow overrides
			items: serializedItemsForIpc,
			buttons: serializedButtonsForIpc,
		};
		// Explicitly remove properties that are functions or complex objects not suitable for IPC
		delete (ipcOptions as any).onDidSelectItem;
		delete (ipcOptions as any).onDidChangeSelection;
		delete (ipcOptions as any).onDidAccept;
		delete (ipcOptions as any).onDidTriggerButton;
		delete (ipcOptions as any).onDidTriggerItemButton;
		delete (ipcOptions as any).step;
		delete (ipcOptions as any).totalSteps;

		this._logDebug(
			`showQuickPick: IPC 'ui_showQuickPick'. Items: ${serializedItemsForIpc.length}, Opts: ${JSON.stringify({ ...ipcOptions, items: "...", buttons: "..." }).substring(0, 200)}`,
		);

		try {
			// Indefinite timeout (0) for user interaction
			const response = (await this._ipcRequestResponse(
				"ui_showQuickPick",
				ipcOptions,
				0,
			)) as QuickPickResponseFromMountain;
			const resultIndices = response.params; // Extract indices from { params: ... }

			if (token?.isCancellationRequested) {
				this._logDebug(
					"showQuickPick cancelled by CancellationToken after IPC call.",
				);
				return undefined;
			}
			if (resultIndices === undefined || resultIndices === null) {
				// null or undefined means cancel
				this._logDebug(
					"showQuickPick dismissed by user or no selection made from Mountain.",
				);
				return undefined;
			}

			if (options?.canPickMany) {
				if (
					!Array.isArray(resultIndices) ||
					!resultIndices.every((idx) => typeof idx === "number")
				) {
					this._logError(
						"showQuickPick (canPickMany:true) expected array of original indices (numbers) from Mountain, got:",
						resultIndices,
					);
					return undefined;
				}
				const selectedIndicesSet = new Set(resultIndices as number[]);
				return resolvedItems.filter((_item, index) =>
					selectedIndicesSet.has(index),
				) as T[] | undefined;
			} else {
				if (typeof resultIndices !== "number") {
					this._logError(
						"showQuickPick (canPickMany:false) expected a single original index (number) from Mountain, got:",
						resultIndices,
					);
					return undefined;
				}
				const selectedIndex = resultIndices as number;
				return selectedIndex >= 0 &&
					selectedIndex < resolvedItems.length
					? (resolvedItems[selectedIndex] as T | undefined)
					: undefined;
			}
		} catch (e: any) {
			if (token?.isCancellationRequested && isCancellationError(e)) {
				this._logDebug(
					"showQuickPick cancelled during/after IPC error (isCancellationError).",
				);
				return undefined;
			}
			this._logError(
				"showQuickPick IPC request 'ui_showQuickPick' failed:",
				refineErrorForShim(e, this._logService, "showQuickPick IPC"),
			);
			return undefined;
		}
	}

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
			...(options || {}),
			buttons: serializedButtonsForIpc,
		};
		// Explicitly remove properties not suitable for IPC
		delete (ipcOptions as any).validateInput;
		delete (ipcOptions as any).onDidChangeValue;
		delete (ipcOptions as any).onDidAccept;
		delete (ipcOptions as any).onDidTriggerButton;
		delete (ipcOptions as any).step;
		delete (ipcOptions as any).totalSteps;

		this._logDebug(
			`showInputBox: IPC 'ui_showInputBox'. Options: ${JSON.stringify({ ...ipcOptions, buttons: "..." }).substring(0, 200)}`,
		);

		try {
			const response = (await this._ipcRequestResponse(
				"ui_showInputBox",
				ipcOptions,
				0,
			)) as InputBoxResponseFromMountain;
			const resultValue = response.params; // Extract value from { params: ... }

			if (token?.isCancellationRequested) {
				this._logDebug(
					"showInputBox cancelled by CancellationToken after IPC call.",
				);
				return undefined;
			}
			// Mountain returns string, or null/undefined for cancellation
			return resultValue ?? undefined;
		} catch (e: any) {
			if (token?.isCancellationRequested && isCancellationError(e)) {
				this._logDebug(
					"showInputBox cancelled during/after IPC error (isCancellationError).",
				);
				return undefined;
			}
			this._logError(
				"showInputBox IPC request 'ui_showInputBox' failed:",
				refineErrorForShim(e, this._logService, "showInputBox IPC"),
			);
			return undefined;
		}
	}

	// --- Stubs for createQuickPick and createInputBox ---
	public createQuickPick<T extends QuickPickItem>(): QuickPick<T> {
		const errorMsg =
			"API method 'window.createQuickPick' (controller-based QuickInput) is not implemented in Cocoon MVP.";
		this._logError(errorMsg);
		throw new Error(errorMsg);
	}
	public createInputBox(): InputBox {
		const errorMsg =
			"API method 'window.createInputBox' (controller-based QuickInput) is not implemented in Cocoon MVP.";
		this._logError(errorMsg);
		throw new Error(errorMsg);
	}

	public override dispose(): void {
		super.dispose();
		this._logInfo("Disposed.");
	}
}
