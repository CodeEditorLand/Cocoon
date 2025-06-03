/*---------------------------------------------------------------------------------------------
 * Cocoon Message Service Shim (message-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.window.showInformationMessage`, `showWarningMessage`, *
 * and `showErrorMessage` APIs. These methods provide the functionality for extensions
 * to display notifications to the user.
 *
 * This service proxies these calls to the Mountain host process via direct IPC, *
 * using the `_ipcRequestResponse` helper from `BaseCocoonShim`. Mountain is then
 * responsible for rendering the native notification UI and returning the user's selection.
 *
 * Responsibilities:
 * - Implementing `showInformationMessage`, `showWarningMessage`, `showErrorMessage`.
 * - Parsing variadic arguments for `VscodeMessageOptions`, `ExtensionSourceInfo`, and action items.
 * - Constructing a serializable IPC payload for "ui_showMessage" to Mountain, *   including message, severity, options (modal, detail), action items (with handles), *   and the source extension's ID and display name.
 * - Handling Mountain's response (ideally the handle/index of the selected item)
 *   and mapping it back to the original `vscode.MessageItem` or string.
 * - Returning `undefined` on dismissal or IPC error.
 *
 * Key Interactions:
 * - Instantiated by DI and its methods are exposed via `vscode.window` by the API factory.
 * - Uses `BaseCocoonShim` for IPC, logging, error refinement.
 * - Relies on Mountain's "ui_showMessage" IPC handler.
 *
 * IPC Contract with Mountain (Assumed):
 * - Method "ui_showMessage":
 *   - Cocoon Params: `{
 *       severity: NotificationSeverityForIpc,
 *       message: string,
 *       options: { modal?: boolean, detail?: string },
 *       items: { title: string, handle: number, isCloseAffordance?: boolean }[],
 *       source?: { id: string, displayName: string } // ID and display name of the source extension
 *     }`
 *   - Mountain Response (Success): `{ params: number | string | null | undefined }` (number is preferred handle/index)
 *   - Mountain Response (Error): VineErrorPayload
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import type {
	MessageItem as VscodeMessageItem,
	MessageOptions as VscodeMessageOptions,
} from "vscode";

// Public vscode API types (ensure this path resolves to Cocoon's 'vscode' shim)

import {
	BaseCocoonShim,
	refineErrorForShim, // Using the more specific refiner from BaseCocoonShim
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter, // Passed to BaseCocoonShim, not directly used for IPC here
} from "./_baseShim";

// --- Type Definitions ---

/**
 * Severity levels for notifications sent via direct IPC to Mountain.
 * These values must align with what Mountain's `ui_showMessage` IPC handler expects.
 */
enum NotificationSeverityForIpc {
	Ignore = 0, // Not typically used directly by `show...Message` APIs.
	Info = 1,
	Warning = 2,
	Error = 3,
}

/**
 * Information about the extension that is the source of the message.
 * This can be passed to Mountain for display or logging purposes.
 */
export interface ExtensionSourceInfo {
	id: string; // e.g., "publisher.name"
	displayName: string; // Human-readable name of the extension
}

/**
 * Defines the service interface for showing messages, aligning with parts of `vscode.window`.
 */
export interface IExtHostMessageServiceInterface {
	readonly _serviceBrand: undefined; // For DI compatibility

	showInformationMessage(
		message: string,
		options?: VscodeMessageOptions,
		extensionSource?: ExtensionSourceInfo,
		...items: (string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined>;
	showInformationMessage(
		message: string,
		extensionSource?: ExtensionSourceInfo,
		...items: (string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined>; // Overload for no options

	showWarningMessage(
		message: string,
		options?: VscodeMessageOptions,
		extensionSource?: ExtensionSourceInfo,
		...items: (string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined>;
	showWarningMessage(
		message: string,
		extensionSource?: ExtensionSourceInfo,
		...items: (string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined>;

	showErrorMessage(
		message: string,
		options?: VscodeMessageOptions,
		extensionSource?: ExtensionSourceInfo,
		...items: (string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined>;
	showErrorMessage(
		message: string,
		extensionSource?: ExtensionSourceInfo,
		...items: (string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined>;
}

/**
 * Cocoon's implementation of the message service.
 * It proxies `show...Message` calls to the Mountain host via direct IPC.
 */
export class ShimExtHostMessageService
	extends BaseCocoonShim
	implements IExtHostMessageServiceInterface
{
	public readonly _serviceBrand: undefined;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostMessageService", rpcService, logService);
		this._logInfo("Initialized.");
	}

	/** This shim uses direct IPC and does not strictly require RPC for its core functionality. */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * Parses the variadic arguments passed to show...Message methods.
	 * It correctly identifies `VscodeMessageOptions`, `ExtensionSourceInfo`, and action `items`.
	 */
	private _parseMessageArgs(
		// The first argument after 'message'
		arg1?:
			| VscodeMessageOptions
			| ExtensionSourceInfo
			| string
			| VscodeMessageItem,
		// The second argument after 'message'
		arg2?:
			| ExtensionSourceInfo
			| string
			| VscodeMessageItem
			| (string | VscodeMessageItem)[],
		// All subsequent arguments
		...restItems: (string | VscodeMessageItem)[]
	): {
		options: VscodeMessageOptions;
		items: (string | VscodeMessageItem)[];
		source?: ExtensionSourceInfo;
	} {
		let options: VscodeMessageOptions = {};
		let items: (string | VscodeMessageItem)[] = [];
		let source: ExtensionSourceInfo | undefined = undefined;
		let parseStartIndex = 0; // Index into the collected allArgs array

		// Collect all potential optional arguments into a single array, filtering out undefined initial ones.
		const allPotentialArgs = [arg1, arg2, ...restItems].filter(
			(arg) => arg !== undefined,
		);

		// 1. Check for VscodeMessageOptions:
		// It's an object, not null, and doesn't have a 'title' (to distinguish from MessageItem)
		// and doesn't have an 'id' (to distinguish from ExtensionSourceInfo).
		if (
			allPotentialArgs.length > parseStartIndex &&
			typeof allPotentialArgs[parseStartIndex] === "object" &&
			allPotentialArgs[parseStartIndex] !== null &&
			!(allPotentialArgs[parseStartIndex] as VscodeMessageItem).title &&
			!(allPotentialArgs[parseStartIndex] as ExtensionSourceInfo).id
		) {
			options = allPotentialArgs[parseStartIndex] as VscodeMessageOptions;
			parseStartIndex++;
		}

		// 2. Check for ExtensionSourceInfo:
		// It's an object, not null, and has an 'id' property.
		if (
			allPotentialArgs.length > parseStartIndex &&
			typeof allPotentialArgs[parseStartIndex] === "object" &&
			allPotentialArgs[parseStartIndex] !== null &&
			typeof (allPotentialArgs[parseStartIndex] as ExtensionSourceInfo)
				.id === "string"
		) {
			source = allPotentialArgs[parseStartIndex] as ExtensionSourceInfo;
			parseStartIndex++;
		}

		// 3. Remaining arguments are considered action items (string or VscodeMessageItem).
		for (let i = parseStartIndex; i < allPotentialArgs.length; i++) {
			const itemCandidate = allPotentialArgs[i];
			if (typeof itemCandidate === "string") {
				items.push(itemCandidate);
			} else if (
				typeof itemCandidate === "object" &&
				itemCandidate !== null &&
				typeof (itemCandidate as VscodeMessageItem).title === "string"
			) {
				items.push(itemCandidate as VscodeMessageItem);
			} else {
				this._logWarn(
					"Invalid message item in showMessage arguments, skipping:",
					itemCandidate,
				);
			}
		}
		return { options, items, source };
	}

	/**
	 * Internal helper to show a message by sending an IPC request to Mountain.
	 */
	private async _showMessage(
		severityForIpc: NotificationSeverityForIpc,
		message: string,
		options: VscodeMessageOptions,
		items: (string | VscodeMessageItem)[],
		source?: ExtensionSourceInfo,
	): Promise<string | VscodeMessageItem | undefined> {
		const ipcMethodName = "ui_showMessage"; // Assumed IPC method name on Mountain

		const itemsForIpc = items.map((item, index) => ({
			title: typeof item === "string" ? item : item.title,
			handle: index, // Use array index as the handle for Mountain to report back
			isCloseAffordance:
				typeof item === "object" ? !!item.isCloseAffordance : false,
		}));

		const paramsForIpc: any = {
			// Build params dynamically to include source only if present
			severity: severityForIpc,
			message,
			options: { modal: options.modal, detail: options.detail }, // Send only relevant serializable options
			items: itemsForIpc,
		};
		if (source) {
			paramsForIpc.source = source; // Add extension source info if provided
		}

		this._logDebug(
			`Calling _showMessage (IPC: '${ipcMethodName}'): Severity=${NotificationSeverityForIpc[severityForIpc]}, ` +
				`Msg="${message.substring(0, 50)}...", Items=${itemsForIpc.length}, Opts=${JSON.stringify(paramsForIpc.options)}, Src=${source?.id || "N/A"}`,
		);

		try {
			// Timeout is generous as user interaction is involved.
			const resultFromMountain = (await this._ipcRequestResponse(
				ipcMethodName,
				paramsForIpc,
				300000 /* 5 minutes */,
			)) as number | string | undefined | null;

			if (
				resultFromMountain === undefined ||
				resultFromMountain === null
			) {
				this._logDebug(
					`Message dialog (IPC: ${ipcMethodName}) dismissed or no selection made.`,
				);
				return undefined; // User dismissed or no action taken
			}

			if (typeof resultFromMountain === "number") {
				// Mountain returned a handle (which we defined as the original index).
				if (
					resultFromMountain >= 0 &&
					resultFromMountain < items.length
				) {
					return items[resultFromMountain]; // Return the original item.
				}
				this._logWarn(
					`Received numeric handle (${resultFromMountain}) from '${ipcMethodName}' which is out of bounds for the sent items.`,
					"Sent items:",
					items,
				);
			} else if (typeof resultFromMountain === "string") {
				// Mountain returned the title string of the selected item.
				const selectedItemByTitle = items.find(
					(origItem) =>
						(typeof origItem === "string"
							? origItem
							: origItem.title) === resultFromMountain,
				);
				if (selectedItemByTitle) return selectedItemByTitle;
				// If the returned string was one of the simple string items.
				if (items.includes(resultFromMountain as string))
					return resultFromMountain as string;
				this._logWarn(
					`Received title string ('${resultFromMountain}') from '${ipcMethodName}' which does not match any of the provided item titles or string items.`,
				);
			} else {
				this._logWarn(
					`Unexpected response type from '${ipcMethodName}'. Expected number (handle/index) or string (title). Got:`,
					resultFromMountain,
				);
			}
			return undefined; // Fallback if response processing fails
		} catch (e: any) {
			// _ipcRequestResponse already refines and logs the error.
			this._logError(
				`IPC call to '${ipcMethodName}' failed. Error was already logged by IPC layer.`,
			);
			// API contract for showMessage is to return undefined on error/dismissal.
			return undefined;
		}
	}

	// --- Public API method implementations ---
	// These use a common pattern: parse args, then call _showMessage.

	public showInformationMessage(
		message: string,
		...args: any[]
	): Promise<string | VscodeMessageItem | undefined> {
		// args can be: [options, source, ...items], [options, ...items], [source, ...items], [...items]
		const { options, items, source } = this._parseMessageArgs(
			args[0],
			args[1],
			...args.slice(2),
		);
		return this._showMessage(
			NotificationSeverityForIpc.Info,
			message,
			options,
			items,
			source,
		);
	}

	public showWarningMessage(
		message: string,
		...args: any[]
	): Promise<string | VscodeMessageItem | undefined> {
		const { options, items, source } = this._parseMessageArgs(
			args[0],
			args[1],
			...args.slice(2),
		);
		return this._showMessage(
			NotificationSeverityForIpc.Warning,
			message,
			options,
			items,
			source,
		);
	}

	public showErrorMessage(
		message: string,
		...args: any[]
	): Promise<string | VscodeMessageItem | undefined> {
		const { options, items, source } = this._parseMessageArgs(
			args[0],
			args[1],
			...args.slice(2),
		);
		return this._showMessage(
			NotificationSeverityForIpc.Error,
			message,
			options,
			items,
			source,
		);
	}

	public override dispose(): void {
		super.dispose();
		this._logInfo("Disposed.");
	}
}
