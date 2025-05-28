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
 * - Parsing variadic arguments for `VscodeMessageOptions` and action items.
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
 *--------------------------------------------------------------------------------------------*/

import type {
	MessageItem as VscodeMessageItem,
	MessageOptions as VscodeMessageOptions,
} from "vscode";

// Public vscode API types

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

// --- Type Definitions ---
enum NotificationSeverityForIpc {
	Ignore = 0,
	Info = 1,
	Warning = 2,
	Error = 3,
}

export interface ExtensionSourceInfo {
	id: string;
	displayName: string;
}

export interface IExtHostMessageServiceInterface {
	readonly _serviceBrand: undefined;
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

	protected override _requiresRpc(): boolean {
		return false;
	} // Uses direct IPC

	private _parseMessageArgs(
		optionsOrExtensionSourceOrFirstItem?:
			| VscodeMessageOptions
			| ExtensionSourceInfo
			| string
			| VscodeMessageItem,
		extensionSourceOrFirstItemOrRest?:
			| ExtensionSourceInfo
			| string
			| VscodeMessageItem
			| (string | VscodeMessageItem)[],
		...restItems: (string | VscodeMessageItem)[]
	): {
		options: VscodeMessageOptions;
		items: (string | VscodeMessageItem)[];
		source?: ExtensionSourceInfo;
	} {
		let options: VscodeMessageOptions = {};
		let items: (string | VscodeMessageItem)[] = [];
		let source: ExtensionSourceInfo | undefined = undefined;
		let CppExploreParseArgsStartIdx = 0;
		const allArgs = [
			optionsOrExtensionSourceOrFirstItem,
			extensionSourceOrFirstItemOrRest,
			...restItems,
		].filter((arg) => arg !== undefined);

		// 1. Check for VscodeMessageOptions (must not have 'title', but can be an object)
		if (
			allArgs.length > 0 &&
			typeof allArgs[0] === "object" &&
			allArgs[0] !== null &&
			!(allArgs[0] as VscodeMessageItem).title &&
			!(allArgs[0] as ExtensionSourceInfo).id
		) {
			options = allArgs[0] as VscodeMessageOptions;
			CppExploreParseArgsStartIdx = 1;
		}

		// 2. Check for ExtensionSourceInfo
		if (
			allArgs.length > CppExploreParseArgsStartIdx &&
			typeof allArgs[CppExploreParseArgsStartIdx] === "object" &&
			allArgs[CppExploreParseArgsStartIdx] !== null &&
			(allArgs[CppExploreParseArgsStartIdx] as ExtensionSourceInfo).id
		) {
			source = allArgs[
				CppExploreParseArgsStartIdx
			] as ExtensionSourceInfo;
			CppExploreParseArgsStartIdx++;
		}

		// 3. Remaining are items
		for (let i = CppExploreParseArgsStartIdx; i < allArgs.length; i++) {
			const itemCandidate = allArgs[i];
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

	private async _showMessage(
		severityForIpc: NotificationSeverityForIpc,
		message: string,
		options: VscodeMessageOptions,
		items: (string | VscodeMessageItem)[],
		source?: ExtensionSourceInfo,
	): Promise<string | VscodeMessageItem | undefined> {
		const ipcMethodName = "ui_showMessage";
		const itemsForIpc = items.map((item, index) => ({
			title: typeof item === "string" ? item : item.title,
			handle: index, // Use index as handle
			isCloseAffordance:
				typeof item === "object" ? !!item.isCloseAffordance : false,
		}));

		const params: any = {
			// Build params dynamically
			severity: severityForIpc,
			message,
			options: { modal: options.modal, detail: options.detail },
			items: itemsForIpc,
		};
		if (source) {
			params.source = source;
		}

		this._logDebug(
			`Calling _showMessage (IPC: '${ipcMethodName}'): Severity=${NotificationSeverityForIpc[severityForIpc]}, ` +
				`Msg="${message.substring(0, 50)}...", Items=${itemsForIpc.length}, Opts=${JSON.stringify(params.options)}, Src=${source?.id || "N/A"}`,
		);

		try {
			const resultFromMountain = (await this._ipcRequestResponse(
				ipcMethodName,
				params,
				300000 /* 5 min */,
			)) as number | string | undefined | null;
			if (
				resultFromMountain === undefined ||
				resultFromMountain === null
			) {
				this._logDebug(
					`Message dialog (IPC: ${ipcMethodName}) dismissed.`,
				);
				return undefined;
			}
			if (typeof resultFromMountain === "number") {
				// Mountain returned handle (index)
				if (
					resultFromMountain >= 0 &&
					resultFromMountain < items.length
				) {
					return items[resultFromMountain];
				}
				this._logWarn(
					`Received numeric handle (${resultFromMountain}) from '${ipcMethodName}' out of bounds for items.`,
					"Sent items:",
					items,
				);
			} else if (typeof resultFromMountain === "string") {
				// Mountain returned title string
				const selectedItemByTitle = items.find(
					(origItem) =>
						(typeof origItem === "string"
							? origItem
							: origItem.title) === resultFromMountain,
				);
				if (selectedItemByTitle) return selectedItemByTitle;
				if (items.includes(resultFromMountain as string))
					return resultFromMountain as string;
				this._logWarn(
					`Received title string ('${resultFromMountain}') from '${ipcMethodName}' not matching any item.`,
				);
			} else {
				this._logWarn(
					`Unexpected response type from '${ipcMethodName}'. Expected number or string. Got:`,
					resultFromMountain,
				);
			}
			return undefined;
		} catch (e: any) {
			this._logError(
				`IPC call to '${ipcMethodName}' failed:`,
				e as Error,
			); // Already refined by _ipcRequestResponse
			return undefined;
		}
	}

	// Overload implementation structure:
	public showInformationMessage(
		message: string,
		...args: any[]
	): Promise<string | VscodeMessageItem | undefined> {
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
